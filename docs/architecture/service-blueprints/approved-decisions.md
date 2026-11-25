# Authoritative Architecture Decisions and Numerical Policy Catalog

> **Status**: AUTHORITATIVE ARCHITECTURE DECISION REFERENCE (Phase 2F-B-R2)
> **Audited Documents Merged**: `06-architecture-decision-backlog.md`, `09-approved-business-rules.md`, `07-implementation-roadmap.md`

---

## 1. Owner-Approved Architecture Decisions (ADR-01 through ADR-18)

| Decision ID | Domain                | Approved Decision Summary                                                                                                                                                           |  Status  |
| :---------- | :-------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------: |
| **ADR-01**  | Vehicle Reference     | Generic YMMT reference data resides in `automotive-product`; specific VIN physical inventory units reside in `vehicle-product`.                                                     | APPROVED |
| **ADR-02**  | Pricing Authority     | `automotive-product` is the authoritative owner for base prices, calculation rules, and store-specific price overrides. `store-management` owns facility availability, not pricing. | APPROVED |
| **ADR-03**  | Inventory Concurrency | Conditional Atomic `UPDATE` with dual-ledger state (`quantity_on_hand`, `quantity_reserved`, `quantity_allocated`) in PostgreSQL. No in-memory Redis counters.                      | APPROVED |
| **ADR-04**  | Distributed Sagas     | Stateful Saga Orchestrator in `automotive-operations` with durable PostgreSQL step logging and idempotency keys. APISIX is gateway only.                                            | APPROVED |
| **ADR-05**  | Service Boundaries    | Standalone microservice architecture across strictly 8 services. Zero 9th business service.                                                                                         | APPROVED |
| **ADR-06**  | Outbox Relays         | Transactional Outbox pattern polling PostgreSQL outbox tables every 500ms using `SKIP LOCKED` to relay events to RabbitMQ.                                                          | APPROVED |
| **ADR-07**  | Read Projections      | Read-only local projections permitted for UI display (e.g., product titles in carts); never used to authorize stock, payments, or contracts.                                        | APPROVED |
| **ADR-08**  | Shopping Cart         | Redis String/JSON with optimistic versioning (`version` counter) is primary active cart store. Orders and sagas persist in PostgreSQL.                                              | APPROVED |
| **ADR-09**  | Cart Invalidation     | Multi-tiered batched revalidation on window focus + mandatory pre-checkout validation gate in `automotive-operations`.                                                              | APPROVED |
| **ADR-10**  | Services Modeling     | Unified sellable-item identity. Services link to `service_definition` (duration, equipment bay requirements) and do not track physical stock.                                       | APPROVED |
| **ADR-11**  | Multi-Store Carts     | Carts spanning multiple stores are partitioned at checkout into separate store-specific orders, each requiring explicit customer authorization.                                     | APPROVED |
| **ADR-12**  | Entitlements          | `SCHEDULE_LATER` is modeled as an unscheduled service entitlement on `order_item`, redeemed directly via `appointment`. No voucher subsystem.                                       | APPROVED |
| **ADR-13**  | Bay Scheduling        | System-selected compatible bay with PostgreSQL GiST Range Exclusion (`EXCLUDE USING GIST (bay_id WITH =, booked_period WITH &&)`) prevents double-booking.                          | APPROVED |
| **ADR-14**  | Work Orders           | Single `work_order` ticket per service visit with checklist tasks, inspection logs, and versioned supplemental repair quotes.                                                       | APPROVED |
| **ADR-15**  | Quote Approvals       | Supplemental repairs require explicit customer authorization on versioned quote revisions before technician work commences.                                                         | APPROVED |
| **ADR-16**  | Vehicle Sales         | `vehicle-sales` owns an independent stateful sales saga and digital purchase contracting workflow, decoupled from tire e-commerce.                                                  | APPROVED |
| **ADR-17**  | Database Isolation    | Independent PostgreSQL schemas per microservice with automated Flyway migrations. No cross-database queries or shared tables.                                                       | APPROVED |
| **ADR-18**  | Connection Pools      | HikariCP pool budgeting (10–20 connections per service instance) to prevent PostgreSQL connection saturation under peak load.                                                       | APPROVED |

---

## 2. Classification of Numerical Policies & Operational Parameters

To prevent architectural ambiguity, every numerical threshold in the platform is explicitly classified:

| Parameter Name                           | Service Owner           |     Current Value      | Classification  | Operational Notes                                                                                       |
| :--------------------------------------- | :---------------------- | :--------------------: | :-------------: | :------------------------------------------------------------------------------------------------------ |
| **Stock Reservation Hold Duration**      | `automotive-product`    |       15 minutes       | **OPEN-POLICY** | Default checkout window before `ReservationJanitorJob` frees unconfirmed stock.                         |
| **Bay Reservation Hold Duration**        | `store-management`      |       15 minutes       | **OPEN-POLICY** | Synchronized with stock hold window.                                                                    |
| **VIN Sales Holding Deposit Duration**   | `vehicle-product`       |        72 hours        | **OPEN-POLICY** | Deposit hold window before VIN is automatically returned to public listing.                             |
| **Vehicle Holding Deposit Amount**       | `vehicle-sales`         |      $500.00 USD       | **OPEN-POLICY** | Standard refundable holding deposit subject to dealership finance policy.                               |
| **Active Cart Inactivity TTL (Auth)**    | `automotive-operations` |         7 days         | **OPEN-POLICY** | TTL refreshed on every cart mutation for authenticated accounts.                                        |
| **Active Cart Inactivity TTL (Guest)**   | `automotive-operations` |        48 hours        | **OPEN-POLICY** | TTL for anonymous guest sessions.                                                                       |
| **Redis Persistence Configuration**      | `automotive-operations` | `appendfsync everysec` | **OPEN-POLICY** | Trade-off: prospective $\le 1\text{s}$ cart data loss during host power failure vs write latency.       |
| **Outbox Relay Polling Interval**        | All Services            |         500 ms         | **OPEN-POLICY** | Balance between event delivery freshness and database CPU polling overhead.                             |
| **Saga Crash Recovery Timeout**          | `automotive-operations` |       5 minutes        | **OPEN-POLICY** | Grace period before `CheckoutSagaRecoveryJob` evaluates stuck saga instances.                           |
| **Notification Max Retry Attempts**      | `notification`          |       3 attempts       | **OPEN-POLICY** | Exponential backoff (1s, 5s, 30s) before routing to dead-letter queue.                                  |
| **Target Scale Baseline**                | All Services            |      15–50 stores      |   **TARGET**    | Planning baseline: 10–25 bays/store, 100k+ tire/part SKUs.                                              |
| **Service Non-Negative Stock Invariant** | `automotive-product`    |        $\ge 0$         |  **APPROVED**   | Absolute mathematical constraint: ATP $= \text{on\_hand} - (\text{reserved} + \text{allocated}) \ge 0$. |
| **Zero Double-Booking Invariant**        | `store-management`      |         Strict         |  **APPROVED**  | PostgreSQL GiST range exclusion constraint at database engine level.                                    |

---

## 3. Correction Governance & Source Authority (Part 0 — Approved 2026-11-25)

> **Governance Status**: **FINAL** (Owner-approved 2026-11-25 via `Tire_Store_Part_0_AGY_Instructions.md`).
> **Correction Tracker**: [`architecture-correction-register.md`](./architecture-correction-register.md) (132 findings across Parts 0–12).
> **Root Decision Link**: [`../06-decisions-and-open-questions.md`](../06-decisions-and-open-questions.md).

### 3.1 Binding Governance Rules (`GOV-01` through `GOV-05`)

| Rule ID | Governance Rule | Binding Requirement |
| :--- | :--- | :--- |
| **GOV-01** | **One Master Architecture Decision Register** | `docs/architecture/service-blueprints/approved-decisions.md` is the single canonical architecture decision register. `ADR-01` through `ADR-18` retain their stable IDs and original provenance; any substantive conflict is logged with an explicit supersession/correction note and routed to its assigned correction Part. |
| **GOV-02** | **Source Authority and Provenance** | **Decision authority:** (1) Explicit current owner-approved decisions (e.g., `2026-11-25` Part 0 decisions) take precedence, followed by (2) existing valid owner-approved ADRs (`ADR-01`–`ADR-18`) unless explicitly superseded; canonical specifications must follow those decisions, and an `APPROVED` label in an inconsistent legacy document is not independent proof of new approval. **Factual evidence:** The current checked-out repository establishes what is actually present; `Tire_Store_Architecture_Deep_Audit_Round2_2026-11-25.md` (SHA-256 `1a61eb9c4aa0de489b897d2014f0acee8abec2ba4f61afc611fb7fc216f8f427`) is the authoritative register of identified findings, but it does not independently approve architecture choices or override newer factual repository evidence; historical ZIPs and patches (`phase-2f-working-tree.patch`, `architecture-coverage-audit.md`) are historical evidence only. |
| **GOV-03** | **One 132-Finding Register** | All 132 audit findings (`INV-01..23`, `CART-01..10`, `CHK-01..27`, `APT-01..21`, `VEH-01..11`, `MSG-01..13`, `SEC-01..08`, `OPS-01..09`, `DOC-01..10`) are tracked 1:1 in [`architecture-correction-register.md`](./architecture-correction-register.md) without omission, merging, or premature `VERIFIED` status. |
| **GOV-04** | **Part-by-Part Finality Without False Closure** | Part 0 governance rules are final. Technical/commercial issues belonging to Parts 1–12 remain tracked in the register and require explicit owner approval before finalizing their respective Part. Historical files and patches are preserved as history and amended via dated superseding notes rather than silent rewrites. |
| **GOV-05** | **Controlled Edits and Verification** | Workflow: **Inspect → Apply approved decision → Edit → Diff → Validate → Report → Owner review**. Documentation-only governance; no code, Flyway migrations, or runtime claims without executable verification. |

### 3.2 Approved Architectural Correction Directions (Part 0 — Approved 2026-11-25)

These owner-approved architectural directions govern Parts 1–12 remediation. **Note:** Exact DDL, endpoint payloads, lifecycle state enums, financial policies, and numerical durations will be finalized in their assigned Parts (not in Part 0).

| Direction ID | Status | Exact Approved Direction | Rationale & Authority | Impacted Areas | Target Part(s) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **COR-DIR-01** | `APPROVED-DIRECTION` | Maintain **exactly 8** independently owned business microservices and **18** substantive domain modules; zero ninth business service. | Preserves runtime/build isolation and clear bounded contexts (`Tire_Store_Part_0_AGY_Instructions.md`, 2026-11-25; consistent with `ADR-05`). | System-wide | All Parts (0–12) |
| **COR-DIR-02** | `APPROVED-DIRECTION` | Service-owned PostgreSQL; Redis-primary active carts; RabbitMQ with duplicate-tolerant outbox/inbox; Apache APISIX gateway only; Keycloak identity. | Enforces data isolation and clear infrastructure roles (`Tire_Store_Part_0_AGY_Instructions.md`, 2026-11-25; `ADR-04`, `ADR-06`, `ADR-08`, `ADR-17`). | Persistence, Messaging, Gateway, IAM | Parts 1, 4, 10, 11 |
| **COR-DIR-03** | `APPROVED-DIRECTION` | Authoritative service ownership: `automotive-product` (catalog, prices, fitment, physical inventory, reservations); `automotive-operations` (checkout Saga, orders, payments, service entitlements); `store-management` (store/bay resources); `appointment` (appointments/redemption attempts); `vehicle-sales` (independent sales Saga); `vehicle-product` (VIN-specific vehicle inventory). | Prevents split authority and circular dependencies (`Tire_Store_Part_0_AGY_Instructions.md`, 2026-11-25). | All 8 microservices | Parts 2, 3, 5, 6, 7, 9 |
| **COR-DIR-04** | `APPROVED-DIRECTION` | Adding to cart and merely opening the checkout form do **not** reserve stock. One store-scoped durable checkout begins hard stock/resource holds only after **Place Order/Pay**, coordinated by a recovery-capable Saga. | Prevents idle cart/checkout starvation; supersedes earlier checkout-session-hold drafts when implemented (`Tire_Store_Part_0_AGY_Instructions.md`, 2026-11-25; resolves `CART-08`). | Cart UX, Checkout Saga, Inventory & Bay holds | Parts 4, 6 |
| **COR-DIR-05** | `APPROVED-DIRECTION` | Multi-SKU reservation is atomic per inventory service operation, with operation-level idempotency, request fingerprint validation, and durable records. | Eliminates partial multi-SKU holds and key-reuse races (`Tire_Store_Part_0_AGY_Instructions.md`, 2026-11-25; `INV-01..04`). | `automotive-product` | Part 3 |
| **COR-DIR-06** | `APPROVED-DIRECTION` | Use `on_hand`, `reserved`, and `allocated` with separately modeled physical handover, returns/quarantine, and partial fulfillment. | Preserves physical warehouse accounting and prevents blind restock (`Tire_Store_Part_0_AGY_Instructions.md`, 2026-11-25; `INV-05..08`, `INV-14`). | `automotive-product`, `automotive-operations` | Parts 3, 8 |
| **COR-DIR-07** | `APPROVED-DIRECTION` | Schedule a compatible, system-selected exact bay; PostgreSQL prevents overlapping active reservations. Alternative pool scheduling is not the initial design. | Clarifies initial scheduling strategy (`Tire_Store_Part_0_AGY_Instructions.md`, 2026-11-25; aligns with `ADR-13` and `APT-14`). | `store-management`, `appointment` | Part 5 |
| **COR-DIR-08** | `APPROVED-DIRECTION` | Prefer **authorization → confirmed required commitments → capture** as the checkout financial direction; ambiguous provider outcomes require durable reconciliation. Policy-specific exceptions cannot be invented. | Prevents capturing funds before resources are secured (`Tire_Store_Part_0_AGY_Instructions.md`, 2026-11-25; `CHK-09`, `CHK-11`). | `automotive-operations` | Part 6 |
| **COR-DIR-09** | `APPROVED-DIRECTION` | Schedule-later services use operations-owned entitlements and appointment-owned, fenced redemption attempts with guarded transitions. | Prevents cross-service booking/refund races without 2PC (`Tire_Store_Part_0_AGY_Instructions.md`, 2026-11-25; `APT-01..07`). | `automotive-operations`, `appointment`, `store-management` | Part 7 |
| **COR-DIR-10** | `APPROVED-DIRECTION` | Local ACID boundaries, no cross-service SQL writes/joins, idempotent inter-service commands, at-least-once messages, and non-authoritative read projections. | Enforces microservice autonomy and eventual consistency safety (`Tire_Store_Part_0_AGY_Instructions.md`, 2026-11-25; `ADR-07`, `ADR-17`). | All services | Parts 1, 10 |

### 3.3 Historical Provenance Conflicts & Deferred Numeric Policies

To preserve `ADR-01`..`ADR-18` without silent rewrites while preventing false closure (`GOV-01`, `GOV-04`):
- **Numeric Values in Section 2 (`OPEN-POLICY`)**: Stock hold (`15 minutes`), bay hold (`15 minutes`), VIN deposit hold (`72 hours` / `$500.00 USD`), cart TTLs (`7 days` / `48 hours`), Redis `appendfsync everysec`, outbox polling (`500 ms`), Saga recovery (`5 minutes`), notification retries (`3 attempts`), and retention/RPO/RTO targets are **not finalized** in Part 0. Each is routed to its respective Part (Parts 3, 4, 5, 6, 9, 10, 11) for explicit owner approval.
- **`ADR-06` (Outbox 500 ms)**: The Transactional Outbox *pattern* is approved (`COR-DIR-02`), while the `500 ms` polling interval and outbox table/retention contradictions remain `OPEN-POLICY` routed to **Part 1** (`MSG-05`, `MSG-06`).
- **`ADR-18` (HikariCP 10–20)**: Connection pool sizing (`10–20`) is flagged as an unverified capacity assumption routed to **Part 11** (`OPS-04`).
- **`ADR-01` (YMMT Authority)**: Generic YMMT in `automotive-product` is recorded in `COR-DIR-03`, while schema/contract completeness is routed to **Part 2** (`INV-19`, `DOC-05`).
