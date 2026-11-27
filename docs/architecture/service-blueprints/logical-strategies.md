# Logical System Strategies, Concurrency Algorithms, and Architectural Evaluations

> **Status**: AUTHORITATIVE LOGICAL SYSTEM DESIGN (Phase 2F-B-R2)
> **Scope**: Cross-Service Algorithms, Concurrency Controls, Data Flow Semantics, and Architectural Trade-Off Evaluations for Medium-Scale Operations (15–50 Stores).

---

## 1. Executive Summary & Evaluation Framework

Every distributed retail and service platform must balance consistency, latency, write amplification, and failure recovery. For Tire-Store-App, we evaluate design strategies across 10 critical operational dimensions using an explicit 12-criteria rubric:
1. **Correctness**: Mathematical and transactional guarantee against state corruption.
2. **Concurrency Safety**: Isolation level under simultaneous, competing read/write requests.
3. **Latency**: p95 and p99 response times.
4. **Read Amplification**: Multiplier between client request and storage read ops.
5. **Write Amplification**: Multiplier between client mutation and underlying disk/WAL writes.
6. **Synchronous Dependencies**: Number of blocking inter-service RPCs on the critical path.
7. **Failure Recovery**: Complexity and determinism of rollbacks/compensations.
8. **Operational Complexity**: Operational overhead, tooling requirements, and cognitive load.
9. **Scalability**: Ability to scale linearly with store count (15 to 50 stores).
10. **Ease of Testing**: Feasibility of deterministic unit, integration, and contract tests.
11. **Future Extensibility**: Adaptability to additional lines of business without re-architecture.
12. **Medium-Scale Fit**: Appropriateness for a regional automotive retail and service chain.

---

## 2. Inventory Management Strategies

### 2.1 The Problem
Prevent physical inventory overselling and phantom stock holds while supporting high-concurrency catalog browsing, atomic multi-product checkout-entry holds, guarded physical stock adjustments, and partial/full physical handover. Reserving stock for an ongoing checkout must never prematurely deduct physical on-hand stock. *(Inter-store transfers and dedicated return/quarantine workflows are `DEFERRED_BY_OWNER_V1` per `P3-DEC-03`/`P3-DEC-04`.)*

### 2.2 Competing Alternatives
1. **Alternative A: Redis Atomic Counter (`DECRBY` / EVAL Lua script)**: Very fast memory-based hold, but volatile. If Redis fails or restarts, reservations can be lost or drift from the database truth. Requires dual-write synchronization with PostgreSQL.
2. **Alternative B: PostgreSQL Optimistic Locking (`version` column)**: High retry rate under contention for popular tire SKUs during promotions; aborted transactions waste client latency.
3. **Alternative C: Unordered Pessimistic Locking (`SELECT FOR UPDATE`)**: Arbitrary lock acquisition order across multi-SKU checkouts causes frequent deadlock cycles.
4. **Alternative D (SELECTED — `P3-DEC-01`, `P3-DEC-06`)**: **PostgreSQL Deterministic Lock-Ordered Atomic Group Reservation**:
   - Claims `(store_id, idempotency_key)` and `checkout_attempt_id` first via `INSERT INTO automotive_product.stock_reservation_group (...) ON CONFLICT DO NOTHING RETURNING id` before any inventory mutation (replays matching `canonical_request_hash`, rejects mismatched hash or conflicting `checkout_attempt_id` with `409`).
   - Locks requested `store_inventory` rows in ascending `physical_product_id` UUID order (`FOR UPDATE`), verifies every line exists and `ATP >= req_qty` (rolling back the entire TX including the claimed group on failure), and executes guarded conditional updates checking `affected_rows = 1` for every line:
   ```sql
   UPDATE automotive_product.store_inventory
   SET quantity_reserved = quantity_reserved + :req_qty,
       version = version + 1,
       updated_at = clock_timestamp()
   WHERE store_id = :store_id
     AND physical_product_id = :physical_product_id
     AND (quantity_on_hand - quantity_reserved - quantity_allocated) >= :req_qty;
   ```
   - Preserves the single authoritative `expires_at` passed from `automotive-operations` (`checkout_attempt.expires_at`), inserts `stock_reservation_line` rows and local `outbox_event` in the same ACID transaction. Uses bounded retry (up to 3 attempts) for SQLSTATE `40P01`/`40001` without changing `idempotency_key` (never claiming sorted locks eliminate all deadlocks).

### 2.3 Evaluation Matrix
| Strategy | Concurrency Safety | p95 Latency | Deadlock Risk | Crash Recovery | Verdict |
| :--- | :---: | :---: | :---: | :---: | :--- |
| Redis In-Memory Counter | Weak (Drift) | < 5 ms | Zero | Complex Re-sync | Rejected (Durability Risk, `P3-DEC-06`) |
| Optimistic Locking | Moderate (Aborts) | 40–120 ms | Low | Simple Rollback | Rejected (High Contention Aborts) |
| Unordered Row Lock | High | 50–200 ms | High (Multi-SKU) | Clean Rollback | Rejected |
| **Deterministic Lock-Ordered Group Update** | **Absolute** | **15–35 ms** | **Mitigated (Bounded Retry)** | **PostgreSQL WAL + Outbox** | **SELECTED** |

### 2.4 Concrete Inventory Ledger Semantics (`P3-DEC-02`, `P3-DEC-05`, `P3-DEC-07`)
- **Stock Invariant**:
  $$\text{Available-to-Promise (ATP)} = \text{quantity\_on\_hand} - (\text{quantity\_reserved} + \text{quantity\_allocated}) \ge 0$$
- **Checkout-Entry Hold (`P3-DEC-07`, supersedes `COR-DIR-04`)**:
  Adding to cart **never** reserves stock. First server-side creation of a store-scoped `checkout_attempt` increments `quantity_reserved` by $N$ (`quantity_on_hand` and `quantity_allocated` untouched) and creates `stock_reservation_group` with `status = 'HELD'` and **10-minute** `expires_at`.
- **Allocation Confirmation (Authorized Progression)**:
  Under an unexpired `HELD` group, atomically decrements `quantity_reserved` by $N$ and increments `quantity_allocated` by $N$. **`quantity_on_hand` remains untouched!**
- **Partial/Full Physical Fulfillment Handover (Pickup, Workshop Install, or Shipping Dispatch)**:
  Atomically decrements `quantity_allocated` by $\Delta$ and `quantity_on_hand` by $\Delta$, recording `inventory_operation` keyed by unique `operation_id`. (`shipped != delivered`; delivery acknowledgment never decrements stock again.)
- **Compensation / Expiration (Checkout Failure or 10-Minute Timeout)**:
  Atomically decrements `quantity_reserved` by $N$ once only (`HELD -> RELEASED | EXPIRED`). Late confirmations after expiry never resurrect stock.

---

## 3. Shopping Cart Architecture in Redis (`P4-DEC-01`, `P4-DEC-02`, `P4-DEC-03`, `P4-DEC-06`)

### 3.1 The Problem
Support high-throughput authenticated cart interactions across Web, Android, and iOS with minimal database load, atomic multi-device concurrency, independent service purchases, and unified multi-store checkout without prematurely reserving inventory.

### 3.2 Competing Alternatives
1. **Alternative A: PostgreSQL-Backed Cart**: Durable, relational, but high write amplification on frequent quantity increments/removals; pollutes relational database with abandoned sessions.
2. **Alternative B: Redis Hash (`HSET cart:{id} {item_id} {item_json}`)**: Fast field-level operations, but lacks atomic validation of global cart-level invariants and mutation deduplication.
3. **Alternative C (SELECTED — `P4-DEC-01`, `P4-DEC-02`, `P4-DEC-06`)**: **One Authenticated Account Cart (`cart:account:{user_id}`) + Atomic Redis Lua Mutations**:
   - **No Guest Carts in V1**: Customers must authenticate via Keycloak OIDC before adding items; `user_id` is derived strictly from verified JWT `sub`.
   - **Canonical Line Key**: `(store_id, item_type, item_id)` where `item_type IN ('PHYSICAL_PRODUCT', 'SERVICE')`. Identical keys merge; services are independently purchasable without `linked_product_line_id` or vehicle IDs.
   - **Atomic Lua Mutation + Deduplication**: Every mutation supplies `expected_version` and `mutation_id`. One Redis Lua script atomically checks `cart:mut:{user_id}:{mutation_id}`, replays if already applied, otherwise checks `cart.version == expected_version` (returning `409 CART_VERSION_CONFLICT` on mismatch), mutates, increments `version`, refreshes the 7-day TTL, and persists the mutation result.
   - Redis persistence configuration: **Proposed AOF `appendfsync everysec`**.

### 3.3 Unified Multi-Store Checkout (`P4-DEC-03`, `P4-DEC-04` — Supersedes Single-Store Partitioning)
1. One cart may contain items from Store A, Store B, and additional stores.
2. Selecting Proceed to Checkout initiates **one unified checkout** (`checkout_attempt`), **one parent `orders` record**, and **one customer payment** covering all selected stores.
3. Internal fulfillment is partitioned into `order_fulfillment_groups` (one per `store_id`), supporting independent pickup, installation, shipping, and partial fulfillment.
4. Physical lines across all stores are reserved atomically in one `automotive-product` PostgreSQL transaction (`stock_reservation_group` + per-store `stock_reservation_line` rows locked in `(store_id ASC, physical_product_id ASC)` order). If any store has insufficient ATP, all holds roll back.

---

## 4. Cart Synchronization, Targeted SSE & Checkout Validation (`P4-DEC-07`, `P4-DEC-08`)

### 4.1 The Problem
Keep multi-device carts and open cart views informed of cart edits, inventory changes, and price changes without polling storms, per-product RabbitMQ queue explosion, or relying on stale frontend caches at checkout.

### 4.2 Targeted SSE + Multi-Replica Fan-Out + Authoritative Validation
1. **Rejected: Eager Persistent Cart Reverse-Indexing** or **Per-Product RabbitMQ Queues/Topics**: Maintaining persistent cart-to-product indexes or creating a RabbitMQ queue per product/store/user causes unbounded broker/storage overhead.
2. **Rejected: Single Competing-Consumer Queue for SSE**: In a multi-replica Kubernetes deployment, a competing-consumer queue delivers an event to only *one* `automotive-operations` pod, missing active SSE connections on other pods.
3. **SELECTED (`P4-DEC-07`)**: **One Authenticated SSE Stream + Per-Pod In-Memory Active-Subscription Inverted Indexes + Shared Fan-Out**:
   - Each `automotive-operations` pod maintains in-memory inverted indexes **strictly for currently open authenticated SSE connections** on that pod:
     - `user_id -> active connections` (`CART_UPDATED`)
     - `(store_id, physical_product_id) -> active connections` (`INVENTORY_AVAILABILITY_CHANGED`)
     - `physical_product_id -> active connections` (`PHYSICAL_PRODUCT_PRICE_CHANGED`)
     - `(store_id, service_id) -> active connections` (`STORE_SERVICE_PRICE_CHANGED`)
   - **Multi-Replica Fan-Out & Index Consistency**: `automotive-product` publishes domain events to `tirestore.events` (Part 1 Outbox); each `automotive-operations` pod binds an **ephemeral exclusive auto-delete RabbitMQ queue** to `tirestore.events` (for product/inventory/price signals) and subscribes to a lightweight **Redis Pub/Sub channel** (`sse:cart:user-updates`) for `CART_UPDATED` signals. When `CART_UPDATED {user_id, version}` arrives on another pod with locally connected emitters for `user_id` and `version > applied_cart_version[user_id]`, that pod reads `cart:account:{user_id}` from Redis, refreshes its local inverted indexes (`O(items)`), and emits `CART_UPDATED` (ignoring out-of-order versions; pods with 0 local connections for `user_id` ignore the signal). Missed Pub/Sub messages are recovered on SSE reconnect (`Last-Event-ID`) and client focus (`GET /cart` + `POST /cart/validate`), and disconnect/expiry removes all emitter entries.
   - **Reconnect & Authority (`P4-DEC-08`)**: SSE is informational only (never an inventory correctness guarantee). Reconnect, page focus, and Proceed to Checkout perform authoritative REST recovery (`GET /cart`, `POST /catalog/prices:batch`, and atomic multi-store `POST /inventory/reservations`).

---

## 5. Unified Catalog & Automotive Service Modeling

### 5.1 The Problem
Physical products (tires, wheels, parts) and automotive services (mounting, balancing, alignment, oil changes) must coexist in customer carts, quotes, and work orders while preserving their fundamentally different operational semantics (physical stock vs. technician labor and bay capacity).

### 5.2 The Strategy (`P2-DEC-01`, `P2-DEC-02`, `P2-DEC-03`, `P2-DEC-05`)
- **Separate Catalogs (No Mandatory `sellable_item` Table)**: Physical goods and purchasable services are distinct entities (`physical_product` vs `service`) with typed line references (`item_type IN ('PHYSICAL_PRODUCT', 'SERVICE')` + XOR `physical_product_id` / `service_id`).
- **Domain Specialization**:
  - `PHYSICAL_PRODUCT`: Extensible `product_category` (no fixed 4-category constraint; PostgreSQL only, zero NoSQL). Core categories use typed 1:1 spec tables (`tire_spec`, `wiper_spec`, `wheel_spec`, `brake_spec`) + `extra_specs JSONB`; new categories (e.g., `WINDSHIELD`) onboard via `product_category` + additive `<cat>_spec` or `extra_specs_schema`-validated attributes without altering `physical_product`. Uses **one nationwide USD `physical_product.price_cents`**, tracks branch inventory in `store_inventory`, and evaluates fitment via category-specific evidence rules (`COMPATIBLE` / `INCOMPATIBLE` / `UNKNOWN`, where missing or conflicting evidence never yields `COMPATIBLE`).
  - `SERVICE`: Links to distinct service package variants (`service`, e.g., `INSTALL_1_WHEEL`, `INSTALL_2_WHEELS`, `INSTALL_4_WHEELS` with `wheel_count`, duration, and required capability), uses **store-specific fixed USD `store_service_price.price_cents`** keyed by `(store_id, service_id)` (no default service price, no fallback override; absent row = not sellable at that store), and does **not** track physical inventory.
- **No Pricing-Rule Engine or Archival Feature**: Pricing is minimal US-only fixed integer `price_cents` (USD); taxes/fees are assessed separately at checkout. No `DISCONTINUED`/`ARCHIVED` state machine, pricing history, or formula engine is included.

---

## 6. Distributed Checkout Saga Coordination

### 6.1 The Problem
Mixed checkouts (tires + installation bay booking) require coordinating stock reservation, bay reservation, payment authorization, and customer order records across multiple microservices without distributed two-phase commit (2PC).

### 6.2 Choreography vs. Orchestration
- **Choreography Rejected**: Event-driven peer-to-peer chains become tangled (split-brain state, impossible debugging, circular event dependencies between operations, product, store, and appointment).
- **SELECTED: Stateful Saga Orchestrator in `automotive-operations`**:
  - The Saga orchestrator persists each step transition into a durable PostgreSQL table `checkout_saga_instance` before executing external calls.
  - Inter-service communication uses idempotent REST calls with unique correlation IDs.
  - Compensations execute in reverse order upon downstream failure.

---

## 7. Appointment & Service Capacity Scheduling Models

### 7.1 The Problem
Prevent physical double-booking of service bays and technicians across operating hours while supporting multi-service jobs of variable duration, walk-in emergency intake, customer rescheduling, and store closure overrides.

### 7.2 Competing Capacity & Scheduling Strategies
1. **Alternative A: Coarse Capacity Pools (Counter-Based)**: Stores maintain an integer capacity per hourly time bucket (e.g., "Max 4 appointments from 10:00 to 11:00 AM").
   *Trade-off*: Simple to query, but ignores physical bay equipment constraints (e.g., 3 standard bays and 1 alignment rack) and variable procedure durations (e.g., 90-minute brake jobs vs 30-minute tire rotations), leading to shop floor gridlock.
2. **Alternative B: Late Physical Bay Assignment**: Customers book a floating appointment slot; store managers manually assign vehicles to bays when they arrive on site.
   *Trade-off*: Flexible for shop managers, but risks severe overbooking if 5 customers requiring alignment racks arrive simultaneously.
3. **Alternative C (SELECTED PROPOSAL): System-Selected Exact-Bay Reservation with PostgreSQL GiST Range Exclusion**:
   - The customer selects a time slot and service; the system **automatically selects a compatible physical bay** behind the scenes.
   - The bay reservation is protected by a PostgreSQL GiST Range Exclusion constraint (`EXCLUDE USING GIST (bay_id WITH =, booked_period WITH &&)`):
     ```sql
     CREATE TABLE bay_schedule_entry (
         id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
         bay_id UUID NOT NULL REFERENCES service_bay(id),
         booked_period TSRANGE NOT NULL,
         status VARCHAR(30) NOT NULL,
         EXCLUDE USING GIST (bay_id WITH =, booked_period WITH &&)
         WHERE (status NOT IN ('CANCELLED', 'RELEASED'))
     );
     ```
   - **Correctness Guarantee**: The database engine physically rejects any overlapping booking on the same bay with SQL state `23P01`. Customers do not need to choose bay numbers; the algorithm assigns the first compatible, available bay automatically.

---

## 8. Work Order & Workshop Execution Design

### 8.1 The Work Ticket Abstraction
- A `work_order` represents a single physical vehicle shop visit.
- Multiple tasks (`work_order_task`) represent individual operations.
- **Walk-In Support**: Shop workers can create an unlinked work order directly (`ACT-OPS-020`) without a pre-existing e-commerce order.
- **Supplemental Quotes**: If an inspection reveals additional necessary repairs:
  1. Worker drafts supplemental quote (`ACT-OPS-021`).
  2. Quote revision incremented (`status = 'PENDING_CUSTOMER_APPROVAL'`).
  3. SMS sent to customer with itemized breakdown.
  4. Customer explicitly approves quote revision (`ACT-OPS-022`) via cryptographic token or authenticated session.
  5. Tasks are unlocked for technicians only after approval.

---

## 9. Independent Vehicle Sales Architecture
Used-vehicle sales are legally, operationally, and financially distinct from tire commerce:
- Managed by `vehicle-sales` (Port 8093) orchestrating with `vehicle-product` (Port 8094).
- Involves state-mandated digital purchase contracts, title transfer, odometer disclosures, holding deposits, and financing approvals.
- Completely isolated from `automotive-operations` to ensure tire e-commerce regressions never compromise high-value vehicle sales deals.
