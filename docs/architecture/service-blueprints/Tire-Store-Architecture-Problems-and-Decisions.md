# Tire-Store-App — Architecture Problems, Decisions, and Verification Reference

**Purpose:** Authoritative review checklist of architecture issues discussed and decisions explicitly accepted by the owner through Phase 2F-A/B/C planning. Supply this document to AGY to audit the repository's architecture blueprints and proposed data definitions.

**Scope:** Eight existing business microservices; proposed medium-scale system (planning horizon approximately 15–50 physical stores). No implementation or infrastructure changes are authorized by this document.

**Status legend**
- **APPROVED-DIRECTION:** Owner accepted the architectural/business behavior; physical schema and detailed mechanism may remain proposed.
- **RECOMMENDED-DESIGN:** An assistant-proposed implementation strategy discussed as preferred, but exact configuration or technical details still need design validation.
- **OPEN-POLICY:** Numerical, legal, commercial, or operational rule not approved merely because an example exists.
- **VERIFY-CONFLICT:** A specific inconsistency previously found in AGY phase reports; confirm and correct against real documents.
- **DEFERRED:** Consider later, not necessary for initial medium-scale design.

This is a problem–decision record, **not** a claim that any feature is already implemented. For every item, AGY must identify the canonical document section and whether its concrete schema/algorithm/API actually implements the rule.

## A. Service ownership, module size, and data boundaries

| ID | Problem / question | Decision or recommended solution | Status |
|---|---|---|---|
| ARC-01 | Where does business logic belong? | Preserve exactly eight existing services: `automotive-operations`, `automotive-product`, `vehicle-sales`, `vehicle-product`, `notification`, `identity-access`, `appointment`, `store-management`. Apache APISIX is ingress/API Gateway, never a business transaction coordinator. | APPROVED-DIRECTION |
| ARC-02 | Should tiny class-sized responsibilities become architecture modules? | Maintain the approved **18 meaningful modules** across eight services; a module needs cohesive rules, stable responsibility and extension/reuse value. Put formatters, CRUD handlers, schedulers and simple components inside modules. | APPROVED-DIRECTION |
| ARC-03 | Does each store have its own inventory DB? | **No.** `automotive-product` owns a single logical inventory authority for all stores; rows are keyed by `(store_id, sku_id)`. The product/SKU definition is stored once. | APPROVED-DIRECTION |
| ARC-04 | Does database-per-service mean physical server per service? | No. Each service owns its logical database/credentials. One PostgreSQL instance hosting isolated logical databases is a practical **local development proposal**, not a rule that each physical store has a DB. Production topology/HA remains a separate decision. | APPROVED-DIRECTION / OPEN-POLICY (deployment) |
| ARC-05 | Can one service join or write another service's DB? | No cross-service SQL joins, writes, ORM entities or cross-database foreign keys. Use stable identifiers, contracts, batch reads, event-driven projections where justified. | APPROVED-DIRECTION |
| ARC-06 | Which records may be copied? | Distinguish **authoritative mutable data** (one writer), **rebuildable read projections**, **disposable caches**, and **immutable business snapshots** (e.g., purchased price). These have different consistency rules. | APPROVED-DIRECTION |
| ARC-07 | How should services learn about identity/roles? | `identity-access` owns app profiles/store-scoped RBAC, with planned Keycloak authentication integration. APISIX authentication never replaces each service's authorization and store-scope checks. Minimize copied sensitive data. | APPROVED-DIRECTION |

## B. Catalog, product inventory, and stock accounting

| ID | Problem / question | Decision or recommended solution | Status |
|---|---|---|---|
| INV-01 | Catalog and inventory combined in one table/module? | Keep coherent catalog and inventory responsibilities separate within **one** `automotive-product` service/database. Product descriptions are global; branch-specific stock is per `(store_id, sku_id)`. Do not repeat catalog attributes per store. | APPROVED-DIRECTION |
| INV-02 | How to model product variants and fitment? | Use shared sellable-item identity, product/SKU-specific details, and separately indexed vehicle fitment references. A physical SKU is distinct from its parent catalog item; do not use service SKU as physical stock without clear mapping. | APPROVED-DIRECTION |
| INV-03 | What do on-hand, reserved, allocated, and available mean? | Define one auditable accounting invariant. Proposed baseline: **available-to-promise (ATP) = sellable_on_hand − active_reserved − unfulfilled_allocated**, nonnegative; explicitly model damaged/quarantined/in-transit without double subtraction. | APPROVED-DIRECTION / RECOMMENDED-DESIGN |
| INV-04 | When does inventory leave on-hand? | **Not** when a cart is updated, a stock hold is made, or payment is captured. Temporary hold increases reserved; confirmation converts reserved→allocated; physical issue/installation decrements on-hand and allocated together, with local transaction. | APPROVED-DIRECTION |
| INV-05 | Are all stock changes permanent movement events? | No need to store every read, cart edit, failed availability check, or transient hold as permanent `stock_movement`. Preserve auditable **physical/business** events: receipts, issues, returns, transfers, damage, count adjustments. Reservation/allocation has durable state and suitable retention but is not automatically a physical movement. | APPROVED-DIRECTION |
| INV-06 | How do we avoid infinite movement data growth? | Balance table for hot current quantity; separate meaningful movement/audit history with proposed retention/archival/partitioning. Never delete legally or financially necessary history merely because rarely queried. | APPROVED-DIRECTION / OPEN-POLICY (retention) |
| INV-07 | How to prevent overselling? | Use PostgreSQL atomic conditional updates on `(store_id,sku_id)` with sufficient ATP, committed atomically alongside reservation record. Consider pessimistic locking for multi-row cases; compare optimistic retries, Redis counters, and NoSQL conditional writes rather than using them by default. | APPROVED-DIRECTION / RECOMMENDED-DESIGN |
| INV-08 | What if two buyers want the last four tires? | Only one reservation transaction may win; the other receives insufficiency. Same request retried with same scoped idempotency key must return the original logical reservation, not consume another four. | APPROVED-DIRECTION |
| INV-09 | What if one checkout reserves several SKUs? | Define all-or-nothing **local** inventory reservation transaction when feasible, deterministic locking order, bounded transaction duration and idempotent group reservation. No remote service calls inside DB locks. | RECOMMENDED-DESIGN |
| INV-10 | What if workers change inventory during reservations? | All authoritative adjustments go through inventory invariants. Do not let routine corrections silently reduce sellable physical quantity below committed obligations; handle discrepancies/privileged overrides with reconciliation. | APPROVED-DIRECTION |
| INV-11 | What if stock is damaged, returned, or transferred? | Quarantine/inspection before resellable return; track source and destination transfer stages, do not double-count in transit; use auditable receipts/adjustments and idempotent fulfillment. | APPROVED-DIRECTION |
| INV-12 | What is the response to inventory DB failure? | **Fail closed** for stock reservation/confirmation/adjustment; display cached results only as potentially stale. Resume and reconcile incomplete checkouts after recovery. | APPROVED-DIRECTION |
| INV-13 | Is Redis a good authoritative inventory store? | Prefer PostgreSQL for finite sellable stock and local ACID. Redis counters, DynamoDB conditional writes and MongoDB single-document updates are alternatives only with demonstrated benefit and carefully addressed durability, atomicity and failover. | RECOMMENDED-DESIGN |

## C. Cart persistence, validation, and frontend updates

| ID | Problem / question | Decision or recommended solution | Status |
|---|---|---|---|
| CART-01 | When does a customer cart save? | Save **each confirmed cart mutation immediately** in Redis (add/remove/update/configuration/store change). Frontend may debounce redundant UI actions but must not silently drop acknowledged changes. | APPROVED-DIRECTION |
| CART-02 | Where is cart authority? | `automotive-operations` owns **active carts** in Redis; orders, checkout Sagas, money and work obligations are durable in its PostgreSQL database. Next.js/client cache is a UI optimization, not authoritative cart state. | APPROVED-DIRECTION |
| CART-03 | How to represent carts? | Proposed `cart:{cartId}` with serialized JSON String (or suitable Redis type), `user-cart:{userId}` mapping, opaque guest IDs, version, item type/quantity, store, vehicle, configuration, price display snapshot, timestamps and TTL. | APPROVED-DIRECTION / RECOMMENDED-DESIGN (type) |
| CART-04 | Does adding to cart reserve stock? | **No.** A cart expresses purchase intent; availability checks are advisory. Stock hard holds occur only during checkout commitment, not merely when items enter the cart. | APPROVED-DIRECTION |
| CART-05 | What is a 'soft reservation'? | Do not use it ambiguously. Clarify **availability check (no hold)**, **hard temporary reservation (durable finite stock hold)** and **confirmed allocation**. A stock display is never a purchase guarantee. | APPROVED-DIRECTION |
| CART-06 | What if stock drops below requested cart quantity? | Preserve customer's requested quantity; mark item invalid/warning and offer quantity/store alternatives. Revalidate when cart opens/focuses, on relevant changes, and **authoritatively at checkout**. | APPROVED-DIRECTION |
| CART-07 | Need product→cart reverse mapping? | Previously proposed two Redis structures: user/cart lookup plus `carts-by-stock:{storeId}:{skuId}` containing carts including a SKU. **Optional derived index**, useful for targeted discovery, not correctness; avoid eager rewriting all affected carts or giant fan-out. | APPROVED-DIRECTION (optional index) |
| CART-08 | How to notify open frontends? | Start with TanStack Query batched revalidation on focus/cart access/checkout and inventory/price versions. SSE/active-session subscriptions later if real-time need demonstrated. Lost signals cannot bypass final validation. | APPROVED-DIRECTION / DEFERRED (SSE) |
| CART-09 | Concurrent cart edits on multiple devices? | Versioned compare-and-swap or Redis WATCH/MULTI/Lua/function; idempotent mutation IDs where appropriate. Explicit conflict/merge semantics. Atomic cart and user mapping/index updates or reconciliation if cross-key updates cannot be atomic. | APPROVED-DIRECTION / RECOMMENDED-DESIGN |
| CART-10 | How to merge guest and account carts? | Idempotent merge on login, preserving distinct service configurations, selected vehicle/store and desired quantities. Validate resulting cart; do not blindly merge unlike service options. | APPROVED-DIRECTION |
| CART-11 | What if Redis loses carts or fails? | Explicit degraded mode/recovery; unpaid recent edits may be lost depending on persistence. **AOF everysec and exact 7-day/48-hour TTLs are proposals**, not guarantees. Never lose or recreate confirmed financial operations from cart storage failure. | APPROVED-DIRECTION / OPEN-POLICY (settings) |
| CART-12 | How does checkout snapshot cart? | Create durable idempotent checkout/order-attempt snapshot in PostgreSQL before irreversible remote effects; do not delete cart before durable result. Cart price/availability copies are display hints, not authority. | APPROVED-DIRECTION |
| CART-13 | Why not MongoDB/SQL for cart? | PostgreSQL carts and MongoDB documents are viable alternatives; current approved direction prefers Redis for active carts given frequent reads/writes and simple bounded documents. Reevaluate on measured durability/operations requirements, not novelty. | APPROVED-DIRECTION |

## D. Orders, checkout Saga, payments, multi-store behavior

| ID | Problem / question | Decision or recommended solution | Status |
|---|---|---|---|
| ORD-01 | Who coordinates checkout? | `automotive-operations`' internal **durable Checkout Saga**. APISIX only routes. `vehicle-sales` has a separate **Vehicle Sales Saga**; no ninth/global business orchestrator. | APPROVED-DIRECTION |
| ORD-02 | What happens during checkout? | Revalidate cart, price, fitment, store and optional slot; persist idempotent checkout attempt; acquire bounded stock and capacity holds; authorize payment; confirm resources and coordinate capture; durably finalize order and notifications. Exact interleaving requires validated failure-state model. | APPROVED-DIRECTION / OPEN-POLICY (capture timing) |
| ORD-03 | How do temporary holds work? | Reservation is durable in `automotive-product` with own ID, checkout reference, owner, quantity, state, deadline and scoped idempotency key. Expire/release/confirm via guarded transitions; janitor and Saga recovery reconcile races. | APPROVED-DIRECTION |
| ORD-04 | What if one Saga step succeeds and the next fails? | Compensate reversible temporary holds; track partial/unknown states, retry safely and reconcile, not pretend distributed database rollback. | APPROVED-DIRECTION |
| ORD-05 | What if payment authorization/capture outcome is unknown? | Query payment provider by stable provider/idempotency identifiers before retrying; no double charge; refunds/voids are business steps, not ACID rollback. Preserve irreversible signed/delivered outcomes. | APPROVED-DIRECTION |
| ORD-06 | Should customer pay before booking resources? | Consider reserve-first vs authorize-first vs capture-first; prefer bounded prepare/hold and payment authorization before final capture, with durable Saga. **Exact capture point remains open**. | RECOMMENDED-DESIGN / OPEN-POLICY |
| ORD-07 | Can cart span multiple stores? | Cart may display lines assigned to multiple stores, but **one fulfillment store per confirmed order** initially. Explicitly partition and separately authorize each store-specific checkout; partial success must be visible; no cross-store atomicity claim. | APPROVED-DIRECTION |
| ORD-08 | Can checkout be retried? | Stable scoped idempotency key, durable Saga/order IDs, participant idempotency and provider idempotency. Respond with same logical checkout; no duplicate reservations/orders/payment captures. | APPROVED-DIRECTION |
| ORD-09 | When do refunds, cancellations and returns happen? | After confirmed sale they are explicit workflows with policy checks, refund/credit notes, stock allocation release or physical inspection where applicable. Not blind Saga rollback or automatic restock. | APPROVED-DIRECTION |
| ORD-10 | How to represent purchased prices? | Order line holds immutable agreed currency, quantity, product/service description and price/tax snapshot, not mutable live catalog reference alone. | APPROVED-DIRECTION |
| ORD-11 | Can one sale generate many service obligations? | Work and scheduling are tied to order/service lines where applicable, with separate booking and technician execution states. Service later scheduling is not an arbitrary voucher subsystem. | APPROVED-DIRECTION |
| ORD-12 | Should checkout HTTP remain blocked for all steps? | Consider 202 + durable checkout ID/status when multi-service/payment orchestration exceeds latency budget. Define API outcome for completed, pending, failed, and reconciling states. | RECOMMENDED-DESIGN |
| ORD-13 | What if Stripe or another dependency is down? | Keep durable pending/reconciling state; never infer payment failure from timeout; release holds only according to recorded Saga policy and confirmed payment state. | APPROVED-DIRECTION |

## E. Services as sellable items, pricing, work orders, appointments

| ID | Problem / question | Decision or recommended solution | Status |
|---|---|---|---|
| SVC-01 | Can services be bought like tires or brakes? | **Yes.** Common sellable-item identity, typed `PHYSICAL_PRODUCT`/`SERVICE` details; different fulfillment and validation semantics. | APPROVED-DIRECTION |
| SVC-02 | Where are service definitions? | `automotive-product` global definitions (name, expected duration, compatibility/resource requirements, pricing model). `store-management` owns offerings, operating hours, facility/resource eligibility. | APPROVED-DIRECTION |
| SVC-03 | Who owns price? | `automotive-product` authoritative base, calculated prices and store-specific overrides; `store-management` owns whether a store offers a service; `automotive-operations` owns immutable accepted order/quote price. | APPROVED-DIRECTION |
| SVC-04 | Can price be unknown at add-to-cart? | Support FIXED, CALCULATED, ESTIMATED/STARTING_AT, QUOTE_REQUIRED. Display estimate, never treat it as final accepted charge. Diagnose → versioned quote → customer approval → further work/payment. | APPROVED-DIRECTION |
| SVC-05 | How to interpret service quantity? | Distinguish service package count, configured wheel count, linked tire quantity, vehicle, selected store and required equipment. No accidental 4× charge when one installation package covers four tires. | APPROVED-DIRECTION |
| SVC-06 | Must appointment be booked before cart? | **No.** Add service freely; normally choose appointment during checkout. Support `BOOK_NOW` and `SCHEDULE_LATER` per service policy. | APPROVED-DIRECTION |
| SVC-07 | What is SCHEDULE_LATER? | An unscheduled **purchased order-line service entitlement** owned by `automotive-operations`; `appointment` validates/redeems/links idempotently. No independent voucher marketplace unless approved later. | APPROVED-DIRECTION / VERIFY-CONFLICT |
| SVC-08 | Who owns technician checklists/work tickets? | `automotive-operations` Work Order & Workshop Execution; usually **one work order per service visit with multiple tasks**, can originate from walk-ins with no prior order/appointment. | APPROVED-DIRECTION |
| SVC-09 | Can technician add parts/labor? | Yes, record proposed amendment and versioned customer quote, approve exact revision before additional charge/work; connect consumed parts to inventory and historical order obligations. | APPROVED-DIRECTION |
| SVC-10 | What if worker updates same ticket concurrently? | Task-level conditional writes/optimistic version; no silent lost updates, maintain audit where important. | APPROVED-DIRECTION |
| SVC-11 | What if customer cancels after work starts? | Account for performed labor, physically consumed parts and approval/refund policy; don't automatically restock installed goods or erase work history. | APPROVED-DIRECTION / OPEN-POLICY (fees) |
| APT-01 | Who owns appointment versus capacity? | `appointment` owns customer booking lifecycle; `store-management` owns bay/equipment/staff capacity and physical holds. No duplicate authoritative bay reservations. | APPROVED-DIRECTION |
| APT-02 | Can two customers book the same bay? | Never confirm incompatible overlapping physical resource commitments. Consider automatic compatible-bay assignment + PostgreSQL exclusion, capacity pools and late assignment. Exact-bay-first is a **proposal**, not owner-approved universal model. | APPROVED-DIRECTION / RECOMMENDED-DESIGN |
| APT-03 | Can availability search guarantee slot? | No; read projections / cached slot searches are advisory. Confirm via store-management concurrency-safe temporary capacity hold and a state transition. | APPROVED-DIRECTION |
| APT-04 | What if rescheduling fails? | Acquire/validate proposed replacement capacity before releasing existing confirmed booking when possible; idempotent transition and compensation. | APPROVED-DIRECTION |
| APT-05 | What about standalone appointment? | `appointment` coordinates standalone booking; if appointment is part of a tire checkout, `automotive-operations` is overall Saga owner and appointment is a participant (avoid circular nested Saga). | APPROVED-DIRECTION |
| APT-06 | What if shop changes hours, closes, or becomes unavailable? | Store-management authoritative schedule changes trigger impacted-booking reconciliation and customer updates; no silent invalidation of paid customer commitments. | APPROVED-DIRECTION |
| APT-07 | How to model time intervals? | Prefer timezone-aware instants (`tstzrange`/`timestamptz`) with store timezone for display; nonempty half-open ranges, constrained overlaps, hold-expiry state machine, and history-preserving deletion policy. | RECOMMENDED-DESIGN |

## F. Vehicle sales, messaging, identity, and cross-service integration

| ID | Problem / question | Decision or recommended solution | Status |
|---|---|---|---|
| VEH-01 | Can same VIN be held/sold twice? | `vehicle-product` owns exclusive VIN inventory/hold state with conditional status transitions; `vehicle-sales` owns deal/deposit/contract/delivery Saga. | APPROVED-DIRECTION |
| VEH-02 | Can vehicle sale use tire checkout Saga? | No; vehicle-sales controls its separate long-running Saga, with irreversible contract/handover boundaries, deposit reconciliation and VIN allocation. | APPROVED-DIRECTION |
| VEH-03 | How long/for how much is VIN held? | $500 deposit and 48h/72h example durations have appeared in drafts; **not approved**. Keep business amounts, expirations, fees configurable. | OPEN-POLICY |
| MSG-01 | Is RabbitMQ already implemented? | No; treat RabbitMQ/outbox/inbox as **PLANNED** until verified in repo. Use durable outbox for necessary integrations, publisher confirms, idempotent consumers, retries/DLQ, reconciliation; no blanket exactly-once claim. | APPROVED-DIRECTION |
| MSG-02 | Should failed notification roll back sale? | No. Notification dispatch is asynchronous and non-blocking for completed commercial transactions. Delivery preferences and provider-specific failures remain notification-owned. | APPROVED-DIRECTION |
| MSG-03 | Should every service copy every other service's tables? | No. Prefer batched APIs initially; selective read-only projections for high fan-out (product summary in operations, store offerings in appointment). Version, rebuild and reconcile; no cached authority for money, stock holds or bay confirmation. | APPROVED-DIRECTION |
| MSG-04 | How to recover missed/out-of-order events? | Durable outbox/inbox where needed, aggregate version/deduplication, missed-event reconciliation and projection rebuild/bootstrap. | APPROVED-DIRECTION |
| IAM-01 | What if APISIX verifies JWT? | Services still enforce authorization, ownership and store scope. Authentication and business authorization are distinct. | APPROVED-DIRECTION |
| IAM-02 | Is customer garage the same as reference vehicle data? | No. `identity-access` owns a customer's associated vehicles; generic YMMT/fitment authority in `automotive-product` is proposed and awaits ADR approval. `vehicle-product` owns VIN-specific sale stock. | APPROVED-DIRECTION / OPEN-POLICY (YMMT ADR) |

## G. Database, performance, lifecycle, and operating behavior

| ID | Problem / question | Decision or recommended solution | Status |
|---|---|---|---|
| OPS-01 | What data store for each type? | PostgreSQL for durable business records and critical constraints; Redis for active carts and optional short-lived cache; object storage for vehicle photos, signed contracts, generated documents. No MongoDB/DynamoDB by default without workload-based justification. | APPROVED-DIRECTION |
| OPS-02 | What if SQL joins are frequent? | Indexed joins **within** one service DB are acceptable. For cross-service aggregation use batch API/composed read model; measure read/write amplification before introducing replication. | APPROVED-DIRECTION |
| OPS-03 | How do local copies stay fresh? | Changes published through outbox/events where needed; versioned, idempotent read projections with repair/rebuild procedures. Explicit consistency tolerance and security classification. | APPROVED-DIRECTION |
| OPS-04 | How to set performance SLO? | Per **functional activity**: read/write rates, p95/p99 where appropriate, correctness requirements, internal fan-out and background job freshness. Illustrative scale: 15–50 stores; 45/225/675 external peak RPS scenarios, not observed benchmarks. | APPROVED-DIRECTION / TARGET |
| OPS-05 | What if database or broker is down? | Fail closed for critical writes, recover Saga and durable reservations, let outbox accumulate when broker down, restore from tested backup. A Kubernetes Pod restart alone is not production HA. | APPROVED-DIRECTION |
| OPS-06 | What about full offline physical stores? | Connected operation baseline; offline-first store writes/stock conflict resolution **deferred** unless required by business. | APPROVED-DIRECTION / DEFERRED |
| OPS-07 | How long to retain carts, holds, payments, logs? | TTL for disposable cart/session data, bounded hot reservation tables, archive legitimate audit/financial records, privacy/retention compliance. Numerical durations require business/legal review. | APPROVED-DIRECTION / OPEN-POLICY |
| OPS-08 | What about PostgreSQL connections and replicas? | Model connection pools across every replica/background job; don't assume 8×10 + admin remains safe when scaled; PgBouncer and managed DB topology depend on measurements. | RECOMMENDED-DESIGN |
| OPS-09 | Are technical settings already deployed? | Distinguish EXISTING, APPROVED-DIRECTION, PROPOSED, TARGET, OPEN and DEFERRED. A diagram or DDL snippet does not imply migrations were run. | APPROVED-DIRECTION |

## H. Known AGY-document inconsistencies to verify, not silently accept

| ID | Reported issue | Required audit outcome |
|---|---|---|
| CHECK-01 | Phase 2F-B endpoint totals changed **92 → 86 → 99 → 102** across reports. | Enumerate distinct `(service, HTTP method, normalized path)` from actual contract documents; keep internal jobs separate; explain additions/removals. |
| CHECK-02 | 2F-B-R2 said technical detail was restored but line count reportedly shrank **2,864 → 1,391**. | Verify actual implementation-critical activity fields and workflow logic, not only IDs and document totals. |
| CHECK-03 | An AGY Phase 2F-C report lists `appointment.service_entitlements` as authoritative. | Purchased entitlement belongs to `automotive-operations`; appointment stores booking/redemption references, calls authoritative idempotent entitlement operations. No double redemption or refund races. |
| CHECK-04 | Bay GiST DDL used `tsrange`, UUID equality, `ON DELETE CASCADE`, and status filters including old held rows. | Evaluate `tstzrange`, `btree_gist`/operator support, nonempty ranges, expired-hold transition, status predicate, and preserving history. Exact-bay policy is proposed. |
| CHECK-05 | Stock reservation SQL example lacked durable scoped idempotency, full commit/rollback, multi-SKU rules and unknown-result recovery. | Specify exact local atomic transaction (balance + reservation), unique constraints, race-safe state transitions, outbox if needed, and Saga recovery semantics. |
| CHECK-06 | Redis `appendfsync everysec` was described as strict ≤1s data-loss guarantee. | Remove unconditional guarantee. Specify recoverability/failover, derived index consistency and accepted loss of some unpaid edits. |
| CHECK-07 | A universal `outbox_event` table + 500ms relay was asserted for all services. | Document durable event producers and consumers actually needed; relay interval stays proposed, publisher confirms, duplicates and recovery covered. |
| CHECK-08 | Previous schema might use destructive cascading delete for business-critical bookings/financial history. | Replace with explicit lifecycle/status, appropriate FK deletion policies and retention. |
| CHECK-09 | Important schema indexes, SLO targets and timeouts sometimes asserted as measured/guaranteed. | Mark hypothetical and propose EXPLAIN ANALYZE, load/concurrency/failure tests; preserve quantitative targets only with documented assumptions. |
| CHECK-10 | Different versions reported 18/21/46/14/26 file totals. | Inspect filesystem and git; no inference from completion reports. |

## I. Prioritized end-to-end acceptance journeys

Use these as integration traceability checks spanning activities → API/internal triggers → data definitions → events → SLO → failure handling.

1. **Product-only sale:** select SKU/store, add cart (no hold), validate price/ATP, durable checkout attempt, hold stock, payment, allocate, fulfill, reconcile any uncertainty.
2. **Tires with installation:** four tires plus configured installation service in one cart; compatible store & slot, hold stock and resource, confirm appointment, capture/payment coordination, one work order with multiple tasks; proper cancellation and consumed inventory handling.
3. **Quote-required brake repair:** request diagnostic appointment, inspect, work ticket, proposed parts/labor, versioned quote approved by actual customer, safe reservation of additional parts, payment and work; no unapproved charges.
4. **Multi-store cart:** two stores, explicit separate authorization, separate checkout Sagas and outcomes; one success + one failure remains understandable and recoverable.
5. **Last-unit contention:** two concurrent checkout attempts for one finite SKU; exactly one reservation wins; retry and crash do not double-reserve.
6. **Expired hold vs payment success:** confirmation and expiration race; no double allocation, uncertain capture reconciled, customer sees correct status.
7. **Cart invalidation:** employee reduces stock, many dormant carts include same SKU; no eager mass cart writes; active cart learns of invalid state via revalidation and is still validated at checkout.
8. **Redis failure and multi-device cart edits:** version-safe mutations, guest merge, user mapping recovery, acknowledged edit durability limitations, orders unaffected.
9. **Schedule later:** purchased entitlement unscheduled, customer later books once, concurrent redemption/refund must not both win; authoritative owner remains operations.
10. **Bay contention/reschedule:** simultaneous bookings for a compatible capacity resource; no overbooking; rescheduling failure preserves prior booking.
11. **Walk-in and supplemental quote:** technician opens ticket without pre-existing appointment, adds recommended work, customer approves exact quote revision; parts consumption and cancellation audited.
12. **Return/transfer/damage:** inspection before restock, stock transit accounting, employee adjustments cannot silently oversell committed inventory.
13. **VIN-specific car sale:** one VIN held, deposit and contract workflow, interrupted Saga recovery, no double sale, irreversible signed/handover steps recognized.
14. **Broker/database outage:** outbox accumulates, duplicate deliveries harmless, projections repaired, critical stock/payment commands fail safely and resume when dependencies recover.

## J. Reviewer output contract for AGY

For each item ARC-/INV-/CART-/ORD-/SVC-/APT-/VEH-/MSG-/IAM-/OPS-/CHECK- above, output one compact verification row with:

`ID | Status (COVERED / PARTIAL / CONFLICT / MISSING / OPEN-POLICY) | Canonical document and heading | Evidence (schema/algorithm/API/event) | Missing detail or conflict | Proposed minimal correction`.

A claim is **COVERED** only if the actual documents establish implementable behavior and do not contradict another canonical file; merely mentioning an idea or matching an ID is not enough.

Also provide a concise owner-facing summary of blockers, contradictions, and approval requests. Preserve valid existing architecture; propose **targeted documentation corrections only**. Do not create unnecessary new documents or implement code.

---

**Governance reminder:** Detailed durations (cart TTL, stock/bay hold, VIN hold), deposit amounts, fee schedules, payment capture timing, exact booking algorithm, PCI/legal tax/record-retention specifics and production DB/HA topology remain proposals/open where not explicitly approved. Do not infer approval from historical AGY reports.
