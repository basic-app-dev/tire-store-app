# Microservice Architecture Specification: `automotive-product`

> **Service Identity**: `automotive-product` (Port 8092)
> **Status**: AUTHORITATIVE IMPLEMENTATION SPECIFICATION (Phase 2F-B-R2)
> **Primary Authority**: Tire/Parts Catalog, Automotive Services, Base/Store Pricing Rules, Vehicle Fitment (YMMT) & Branch Inventory Accounting
> **Storage**: PostgreSQL (catalog, specifications, branch inventory ledger, reservations, stock movements)
> **Consolidated Modules**: 3 Substantive Modules
> **Total Activities Owned**: 31 Activities (`ACT-PRD-001` through `ACT-PRD-031`)
> **Total Unique HTTP Endpoints**: 28 Endpoints (27 HTTP routes + 1 background janitor operation)

---

## 1. Domain Boundary & Module Architecture

`automotive-product` is the authoritative source for all physical parts, global service definitions, vehicle fitment compatibility, and branch-level inventory balances.

```
automotive-product (Port 8092)
├── catalog/      # MODULE 1: Catalog & Services Module (12 activities: ACT-PRD-001, 002, 015, 016, 017, 020, 021, 022, 023, 027, 029, 030)
├── fitment/      # MODULE 2: Vehicle Fitment Module (4 activities: ACT-PRD-003, 004, 024, 026)
└── inventory/    # MODULE 3: Branch Inventory & Stock Allocation Module (15 activities: ACT-PRD-006..014, 018, 019, 025, 028, 031)
```

---

## 2. Business Entities & State Machine Transitions

### 2.1 Core Entities Owned (`P2-DEC-01`–`P2-DEC-05`)
1. `product_category` & `brand` (PostgreSQL): Extensible category lookup (`TIRE`, `WHEEL`, `BRAKE`, `WIPER`, plus future categories such as `WINDSHIELD` via `product_category` + `extra_specs_schema` / additive `<cat>_spec` without altering `physical_product`) and normalized `brand`.
2. `physical_product` (PostgreSQL): `id` (preserves legacy `product_skus.id` UUID), `sku_code`, `category_code`, `brand_id`, `name`, `price_cents` (single nationwide USD price; no store override), `is_active` (admin visibility flag; no archival state machine), `extra_specs JSONB`.
3. **Typed 1:1 Category Spec Tables** (PostgreSQL): `tire_spec`, `wiper_spec`, `wheel_spec`, `brake_spec` (extensible with additive `<cat>_spec` tables or `extra_specs_schema`-validated JSONB), enforced via composite `(physical_product_id, category_code)` FK.
4. `service` (PostgreSQL): `id`, `service_code` (distinct IDs per package, e.g. `INSTALL_1_WHEEL`, `INSTALL_2_WHEELS`, `INSTALL_4_WHEELS`), `name`, `wheel_count`, `estimated_duration_minutes`, `required_capability_code` (no default service price).
5. `store_service_price` (PostgreSQL): `(store_id, service_id)`, `price_cents` (store-specific USD service price; absent row = not sellable at that store; no default service price or fallback override; `store-management` owns facility capability).
6. `vehicle_configuration` & Category Fitment Evidence (PostgreSQL): Normalized YMMT + `tire_fitment_evidence`, `wiper_fitment_evidence`, `wheel_fitment_evidence`, `brake_fitment_evidence` with provenance (`source_provider`, `evidence_version`, `is_active`) returning `COMPATIBLE`, `INCOMPATIBLE`, or `UNKNOWN`.
7. `store_inventory` (PostgreSQL): `id`, `store_id`, `physical_product_id`, `quantity_on_hand`, `quantity_reserved`, `quantity_allocated`, derived `available_quantity` (physical goods only; never tracks services).
8. `stock_reservation_group`, `stock_reservation_line` & `inventory_operation` (PostgreSQL): Atomic store-scoped group reservations (`10m` checkout-entry TTL), line-level partial/full fulfillment tracking, and unpartitioned exactly-once operation audit (`P3-DEC-01`–`P3-DEC-07`). *(Inter-store transfers, dedicated quarantine/RMA tables, and annual partitioned movement ledgers are `DEFERRED_BY_OWNER_V1`.)*

### 2.2 Stock Reservation Lifecycle (`P3-DEC-02`, `P3-DEC-07`)
```text
Stock Hold Lifecycle (Group & Line):
  [HELD (10m)] --(Valid Unexpired Allocation)--> [ALLOCATED] --(Partial Handover/Ship)--> [PARTIALLY_FULFILLED]
       |                                              |                                           |
       +--(10m Timeout / Janitor)---> [EXPIRED]       +--(Full Handover/Ship)---------------------> [FULFILLED]
       +--(Explicit Cancel / Fail)--> [RELEASED]      +--(Cancel Unfulfilled Remainder)-----------> [CANCELLED / FULFILLED*]
                                                      (*FULFILLED with cancelled_quantity > 0 if partially fulfilled prior)
```

---

## 3. Module Specifications & Business Activities

### 3.1 Module 1: Catalog & Services Module

| Activity ID | Activity Name | Method & Proposed URI | Visibility | Concurrency & Data Target | Target p95 Latency |
| :--- | :--- | :--- | :---: | :--- | :---: |
| **ACT-PRD-001** | Search Tire & Parts Catalog | `GET /api/v1/automotive/products/catalog/tires` | PUBLIC | Typed `tire_spec` B-Tree + `ATP > 0` branch filter | < 35 ms |
| **ACT-PRD-002** | Get Detailed Physical Product / Service Spec | `GET /api/v1/automotive/products/catalog/{id}` | PUBLIC | PK lookup on `physical_product` + typed spec + `extra_specs` | < 25 ms |
| **ACT-PRD-015** | Filter Catalog by Brand | `GET /api/v1/automotive/products/catalog/brands` | PUBLIC | Normalized `brand` lookup | < 30 ms |
| **ACT-PRD-016** | Filter Catalog by Dimensions / Category | `GET /api/v1/automotive/products/catalog/dimensions` | PUBLIC | Typed category spec indexes (e.g. `wiper_spec`, `wheel_spec`) | < 30 ms |
| **ACT-PRD-017** | Query Product Categories | `GET /api/v1/automotive/products/catalog/families` | PUBLIC | Extensible `product_category` lookup (`is_active = TRUE`) | < 25 ms |
| **ACT-PRD-020** | Ingest Physical Product & Typed Spec | `POST /api/v1/automotive/products/admin/catalog/skus` | ADMIN | Local TX; inserts `physical_product` + matching `<cat>_spec` | < 80 ms |
| **ACT-PRD-021** | Update Typed Spec Parameters | `PUT /api/v1/automotive/products/admin/catalog/skus/{id}/spec`| ADMIN | Optimistic `version` check (409 on stale); rejects category change | < 60 ms |
| **ACT-PRD-022** | Toggle Product Visibility Flag | `DELETE /api/v1/automotive/products/admin/catalog/skus/{id}` | ADMIN | Sets `is_active = FALSE` (no archival/discontinued state machine; `ON DELETE RESTRICT` blocks destructive delete) | < 50 ms |
| **ACT-PRD-023** | Batch Quote USD Prices (Physical & Service) | `POST /api/v1/automotive/products/catalog/prices:batch` | PUBLIC / INTERNAL| Global `physical_product.price_cents` + `store_service_price` | < 35 ms |
| **ACT-PRD-027** | Synchronize Vendor Feeds | `POST /api/v1/automotive/products/admin/catalog/vendor-sync` | ADMIN | Batch vendor catalog ingestion | < 250 ms |
| **ACT-PRD-029** | Define Global Automotive Service Variant | `POST /api/v1/automotive/products/admin/services` | ADMIN | Models distinct service variant (`wheel_count`, duration, capability) | < 50 ms |
| **ACT-PRD-030** | Configure Store Service USD Price | `PUT /api/v1/automotive/products/admin/stores/{storeId}/services/{serviceId}/price` | ADMIN | Upserts `store_service_price(store_id, service_id, price_cents)` only (no default service price, no fallback, no pricing history, no rule engine) | < 45 ms |

---

### 3.2 Module 2: Vehicle Fitment Module

| Activity ID | Activity Name | Method & Proposed URI | Visibility | Concurrency & Data Target | Target p95 Latency |
| :--- | :--- | :--- | :---: | :--- | :---: |
| **ACT-PRD-003** | Lookup Vehicle Fitment (YMMT) | `GET /api/v1/automotive/products/fitment/lookup` | PUBLIC | Index on `(year, make_id, model_id, trim)` | < 25 ms |
| **ACT-PRD-004** | Validate Tire Compatibility | `POST /api/v1/automotive/products/fitment/validate` | PUBLIC | Evaluates load index & diameter bounds | < 30 ms |
| **ACT-PRD-005** | Filter Tires by Dimensions | `GET /api/v1/automotive/products/catalog/tires/dimensions` | PUBLIC | Dimensional composite index (`width, ratio, rim`) | < 30 ms |
| **ACT-PRD-024** | Import OEM Vehicle Fitment Data | `POST /api/v1/automotive/products/admin/fitment/import` | ADMIN | Batch NHTSA vPIC fitment dataset | < 500 ms |
| **ACT-PRD-026** | Register Staggered Fitments | `POST /api/v1/automotive/products/admin/fitment/staggered` | ADMIN | Front/rear tire pairing rules | < 55 ms |

---

### 3.3 Module 3: Branch Inventory & Stock Allocation Module

| Activity ID | Activity Name | Method & Proposed URI | Visibility | Concurrency & Data Target | Target p95 Latency |
| :--- | :--- | :--- | :---: | :--- | :---: |
| **ACT-PRD-006** | Query Branch Stock Balances | `GET /api/v1/automotive/products/inventory/balances` | PUBLIC / INTERNAL| Read-committed ATP calculation | < 30 ms |
| **ACT-PRD-007** | Batch Query Multi-Store Stock | `POST /api/v1/automotive/products/inventory/balances:batch`| INTERNAL / SAGA | Batch IN query across stores | < 45 ms |
| **ACT-PRD-008** | Reserve Physical Stock (Group) | `POST /api/v1/automotive/products/inventory/reservations` | INTERNAL / SAGA | Atomic lock-ordered group hold (`10m` TTL, `idempotency_key` + `canonical_request_hash`) | < 35 ms |
| **ACT-PRD-009** | Confirm Group Stock Allocation | `POST /api/v1/automotive/products/inventory/reservations/{groupId}/confirm`| INTERNAL / SAGA | `HELD -> ALLOCATED` (`expires_at > now()`, `affected_rows = 1`) | < 40 ms |
| **ACT-PRD-010** | Release / Compensate Group Hold | `DELETE /api/v1/automotive/products/inventory/reservations/{groupId}`| INTERNAL / SAGA | `HELD -> RELEASED`; decrements `reserved` once | < 35 ms |
| **ACT-PRD-011** | Ingest Warehouse Goods Receipt | `POST /api/v1/automotive/products/inventory/receipts` | STAFF | Increments `quantity_on_hand` + `inventory_operation` (`operation_id`) | < 60 ms |
| **ACT-PRD-012** | Dispatch Inter-Branch Transfer | `DEFERRED_BY_OWNER_V1` | — | Inter-store transfers removed from V1 scope (`P3-DEC-03`, `INV-12`) | — |
| **ACT-PRD-013** | Receive Inbound Inter-Branch Transfer | `DEFERRED_BY_OWNER_V1` | — | Inter-store transfers removed from V1 scope (`P3-DEC-03`, `INV-12`) | — |
| **ACT-PRD-014** | Execute Physical Stock Adjustment | `POST /api/v1/automotive/products/inventory/adjustments` | STAFF / ADMIN | Minimal guarded `STOCK_ADJUSTMENT` in `inventory_operation` (`on_hand + delta >= reserved + allocated`; broad RMA/quarantine `DEFERRED_BY_OWNER_V1`) | < 55 ms |
| **ACT-PRD-018** | Query Inventory Operation Audit | `GET /api/v1/automotive/products/inventory/operations` | STAFF / ADMIN | Unpartitioned `inventory_operation` lookup (full movement ledger/UI `DEFERRED_BY_OWNER_V1`, `P3-DEC-05`) | < 50 ms |
| **ACT-PRD-019** | Janitor Purge of Expired Holds | `NO HTTP ENDPOINT` (`ReservationJanitorJob`) | INTERNAL | Background janitor every 60s (`SKIP LOCKED`, expires `10m` `HELD` groups) | < 60s delay |
| **ACT-PRD-025** | Reconcile Inventory Balances | `POST /api/v1/automotive/products/inventory/reconcile` | ADMIN | Basic balance/reservation consistency check (full ledger replay `DEFERRED_BY_OWNER_V1`, `INV-17`) | < 200 ms |
| **ACT-PRD-028** | Mark Damaged Stock / Quarantine | `DEFERRED_BY_OWNER_V1` | — | Dedicated damage/quarantine/RMA workflow deferred (`P3-DEC-04`, `INV-14`) | — |
| **ACT-PRD-031** | Record Physical Stock Handover / Dispatch | `POST /api/v1/automotive/products/inventory/fulfill-handover`| INTERNAL / STAFF | Idempotent (`operation_id`); partial/full decrement of `allocated` & `on_hand` | < 60 ms |

#### Part 2 Catalog, Pricing & Fitment API Examples (`P2-DEC-01`–`P2-DEC-05`)

1. **Typed Tire Search (`ACT-PRD-001`)**:
   - `GET /api/v1/automotive/products/catalog/tires?width_mm=215&season=ALL_SEASON&store_id=1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d&page=0&size=20&sort=price_cents,asc`
   - Uses `idx_tire_spec_search (width_mm, season, rim_diameter_in)` + `store_inventory` (`ATP > 0`). Unstocked items at `store_id` are excluded; returns `400 Bad Request` on invalid filter enum/range.
2. **Typed Wiper 18-Inch Search (`ACT-PRD-016`)**:
   - `GET /api/v1/automotive/products/catalog/dimensions?category=WIPER&length_in=18.0&store_id=1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d`
   - Uses `idx_wiper_spec_search (length_in, connector_type)` with no JSONB cast.
3. **Batch Typed USD Quote (`ACT-PRD-023`)**:
   - Request (`POST /api/v1/automotive/products/catalog/prices:batch`):
     ```json
     {
       "store_id": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
       "lines": [
         { "item_type": "PHYSICAL_PRODUCT", "physical_product_id": "8a3e7b1a-4d2c-4b5a-9f8e-1b2c3d4e5f6a", "quantity": 4 },
         { "item_type": "SERVICE", "service_id": "a1b2c3d4-0004-4000-8000-000000000004", "quantity": 1 },
         { "item_type": "SERVICE", "service_id": "a1b2c3d4-0001-4000-8000-000000000001", "quantity": 1 }
       ]
     }
     ```
   - Response (`200 OK` — informational until authoritative Place Order/Pay revalidation; taxes/fees separated at checkout):
     ```json
     {
       "currency": "USD",
       "store_id": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
       "lines": [
         { "item_type": "PHYSICAL_PRODUCT", "item_id": "8a3e7b1a-4d2c-4b5a-9f8e-1b2c3d4e5f6a", "sellable": true, "unit_price_cents": 14999, "line_subtotal_cents": 59996, "price_source": "GLOBAL_PHYSICAL_PRICE" },
         { "item_type": "SERVICE", "item_id": "a1b2c3d4-0004-4000-8000-000000000004", "service_code": "INSTALL_4_WHEELS", "wheel_count": 4, "sellable": true, "unit_price_cents": 8000, "line_subtotal_cents": 8000, "price_source": "STORE_SERVICE_PRICE" },
         { "item_type": "SERVICE", "item_id": "a1b2c3d4-0001-4000-8000-000000000001", "service_code": "INSTALL_1_WHEEL", "wheel_count": 1, "sellable": false, "reason": "NOT_OFFERED_AT_STORE" }
       ]
     }
     ```
   - *Pricing vs. Scheduling Boundary*: `automotive-product` returns USD prices only; `store-management` validates physical bay/equipment capability at booking (Part 5).
4. **Category-Aware Fitment Check (`ACT-PRD-004`)**:
   - `POST /api/v1/automotive/products/fitment/validate` checks `vehicle_configuration` + active category-specific evidence (`tire_fitment_evidence` checks dimension + `load_index >= min_load_index` + ordered `speed_rating` rank comparison where `H > T` + `FRONT`/`REAR`/`ALL` staggered axle rules; wiper/wheel/brake check their respective rules). The compatibility `result` enum strictly has **exactly three values**: `COMPATIBLE`, `INCOMPATIBLE`, or `UNKNOWN` (missing or conflicting evidence returns `result: "UNKNOWN"`, never silently `COMPATIBLE`; failed spec checks return `result: "INCOMPATIBLE"`):
     ```json
     {
       "vehicle_configuration_id": "5f6e7d8c-1234-4abc-9def-0123456789ab",
       "physical_product_id": "8a3e7b1a-4d2c-4b5a-9f8e-1b2c3d4e5f6a",
       "category_code": "TIRE",
       "axle_position": "FRONT",
       "fitment_required": true,
       "result": "COMPATIBLE",
       "reasons": ["Matches OEM 225/65R17, load_index 102 >= 100, speed_rating H (210 km/h) >= T (190 km/h)"],
       "evidence_source": "OEM_FITMENT_FEED",
       "evidence_version": "2026.11"
     }
     ```
   - **Non-Applicable Categories (`fitment_mode = NONE_REQUIRED`)**: Represented separately via `"fitment_required": false` and `"result": null` (never a fourth enum value), with `"reasons": ["CATEGORY_FITMENT_NOT_REQUIRED"]`:
     ```json
     {
       "vehicle_configuration_id": "5f6e7d8c-1234-4abc-9def-0123456789ab",
       "physical_product_id": "9b4f8c2b-5e3d-4c6b-8a9f-2c3d4e5f6a7b",
       "category_code": "ACCESSORY",
       "fitment_required": false,
       "result": null,
       "reasons": ["CATEGORY_FITMENT_NOT_REQUIRED"]
     }
     ```
   - Example `INCOMPATIBLE` / `UNKNOWN` outcomes:
     - Staggered vehicle with `axle_position: "ALL"` or missing evidence → `"fitment_required": true`, `result: "UNKNOWN"`, `reasons: ["AXLE_POSITION_REQUIRED_FOR_STAGGERED_FITMENT"]` or `["NO_FITMENT_EVIDENCE"]`.
     - Conflicting active evidence rows → `"fitment_required": true`, `result: "UNKNOWN"`, `reasons: ["CONFLICTING_FITMENT_EVIDENCE"]`.
     - Tire with `speed_rating = "S"` (180 km/h) vs `min_speed_rating = "T"` (190 km/h) → `"fitment_required": true`, `result: "INCOMPATIBLE"`.

#### Detailed Endpoint Specification: ACT-PRD-008 (Atomic Group Reserve Physical Stock)
- **HTTP Method & Path**: `POST /api/v1/automotive/products/inventory/reservations` (Visibility: INTERNAL)
- **Request Headers**: `Idempotency-Key: {uuid}`, `Authorization: Bearer {internal_token}`
- **Contract (`P3-DEC-01`, `P3-DEC-07`)**: Accepts one store-scoped group of `physical_product_id` lines (services are rejected with `422`) plus the single authoritative `expires_at` deadline generated by `automotive-operations` (`checkout_attempt.expires_at`). Normalizes duplicate product IDs by summing quantities (rejects `<= 0`/overflow), sorts by UUID, validates `clock_timestamp() < expires_at <= clock_timestamp() + INTERVAL '10 minutes 5 seconds'` (never extending `expires_at` by another 10 minutes), computes `canonical_request_hash` (SHA-256 including `expires_at`), and claims `(store_id, idempotency_key)` / `checkout_attempt_id` first via `INSERT ... ON CONFLICT DO NOTHING` before locking `store_inventory`.
- **Request Body**:
  ```json
  {
    "store_id": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
    "checkout_attempt_id": "att-8877-6655-4433-221100998877",
    "idempotency_key": "9c8b7a6f-5e4d-3c2b-1a0f-9e8d7c6b5a4f",
    "expires_at": "2026-11-26T18:10:00Z",
    "lines": [
      { "physical_product_id": "8a3e7b1a-4d2c-4b5a-9f8e-1b2c3d4e5f6a", "quantity": 4 },
      { "physical_product_id": "c4d5e6f7-8a9b-4c0d-9e1f-2a3b4c5d6e7f", "quantity": 4 }
    ]
  }
  ```
- **Response**: `201 Created` (or `200 OK` on idempotent replay)
  ```json
  {
    "reservation_group_id": "grp-9988-7766-5544-33221100aabb",
    "checkout_attempt_id": "att-8877-6655-4433-221100998877",
    "store_id": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
    "status": "HELD",
    "expires_at": "2026-11-26T18:10:00Z",
    "lines": [
      { "line_id": "ln-1111", "physical_product_id": "8a3e7b1a-4d2c-4b5a-9f8e-1b2c3d4e5f6a", "requested_quantity": 4, "held_quantity": 4, "status": "HELD" },
      { "line_id": "ln-2222", "physical_product_id": "c4d5e6f7-8a9b-4c0d-9e1f-2a3b4c5d6e7f", "requested_quantity": 4, "held_quantity": 4, "status": "HELD" }
    ]
  }
  ```

### 3.4 Rigorous Inventory Commands, Transitions & Part 3 Examples

1. **Release Active Checkout Reservation (`ACT-PRD-010`)**:
   - *Trigger*: Checkout cancellation/payment failure or `ReservationJanitorJob` (`ACT-PRD-019`).
   - *State Transition*: `HELD -> RELEASED | EXPIRED`, `quantity_reserved = quantity_reserved - held_quantity` (`WHERE status = 'HELD'`, `affected_rows = 1` required). `quantity_on_hand` unchanged.
2. **Cancel Confirmed Allocation (`ACT-PRD-010B`)**:
   - *Endpoint*: `POST /api/v1/automotive/products/inventory/allocations/{groupId}/cancel`
   - *Preconditions*: Line status in `('ALLOCATED', 'PARTIALLY_FULFILLED')`; requires `operation_id` + `request_hash`.
   - *State Transition*: Releases only unfulfilled `allocated_quantity` back to ATP (`quantity_allocated = quantity_allocated - rem_qty`); `quantity_on_hand` and already `fulfilled_quantity` remain untouched. Emits `StockAllocationCancelledEvent`.
3. **Partial & Full Physical Handover / Installation / Shipping Dispatch (`ACT-PRD-031`)**:
   - *Endpoint*: `POST /api/v1/automotive/products/inventory/fulfill-handover`
   - *Preconditions*: Requires unique batch `operation_id` + `request_hash` (`inventory_operation_batch`), supporting single-line or multi-line fulfillment in one atomic TX; every line must be in `('ALLOCATED', 'PARTIALLY_FULFILLED')` with `deliver_qty <= allocated_quantity` (any line failure rolls back the entire batch).
   - *State Transition*: Decrements `quantity_on_hand` and `quantity_allocated` by `deliver_qty`, adds `deliver_qty` to `fulfilled_quantity`, inserts one `inventory_operation` row per line under `batch_id`, and transitions each line to `PARTIALLY_FULFILLED` or `FULFILLED`. Supports `FULFILLMENT_PICKUP`, `FULFILLMENT_WORKSHOP`, and `FULFILLMENT_SHIPMENT` (`shipped != delivered`; delivery ack never deducts again).
4. **Minimal Physical Stock Adjustment (`ACT-PRD-014`)**:
   - *Endpoint*: `POST /api/v1/automotive/products/inventory/adjustments`
   - *Preconditions*: Staff/Admin `actor_id`, `reason_code`, unique `operation_id` + `request_hash`. Guards `(quantity_on_hand + delta - quantity_reserved - quantity_allocated) >= 0` (`409 ADJUSTMENT_BREACHES_COMMITMENTS` if breached). Never uses `PARTIALLY_FULFILLED` for damaged stock.
   - *V1 Deferrals (`DEFERRED_BY_OWNER_V1`)*: Inter-store transfers (`ACT-PRD-012`/`013`), dedicated quarantine/RMA intake & disposition (`ACT-PRD-028`), and full movement-ledger reconstruction (`ACT-PRD-018`/`025` full replay) are deferred by owner for V1 (`P3-DEC-03`–`P3-DEC-05`).

#### Part 3 Request/Response & Stock Arithmetic Examples (`P3-DEC-01`–`P3-DEC-07`)
*(Baseline at Store `S1 = 1a2b...5c6d`: Tire `T1 = 8a3e...5f6a` has `on_hand=10, reserved=0, allocated=0, ATP=10`; Wheel `W1 = c4d5...6e7f` has `on_hand=6, reserved=0, allocated=0, ATP=6`.)*

1. **All-or-Nothing 4 Tires + 4 Wheels Hold (`201 Created`)**: Checkout entry creates `grp-1` (`expires_at = T0 + 10m`). Before: `T1(10/0/0, ATP=10)`, `W1(6/0/0, ATP=6)`. After: `T1(10/4/0, ATP=6)`, `W1(6/4/0, ATP=2)`.
2. **Insufficient Wheel Rollback (`409 INSUFFICIENT_STOCK`)**: Suppose `W1` only had `ATP=2`. Request for `4 T1 + 4 W1` locks `T1` then `W1`, detects `W1 ATP=2 < 4`, **rolls back the entire TX**: `T1` stays `10/0/0 (ATP=10)` and `W1` stays `6/0/0 (ATP=6)`. Response lists `W1: {requested: 4, available: 2}` without leaking other stores.
3. **Same-Key + Same-Fingerprint Replay (`200 OK`)**: Retry of `grp-1` with identical `idempotency_key` and `canonical_request_hash` returns the exact persisted `grp-1` response and `expires_at = T0 + 10m`. Stock counters remain `T1(10/4/0)`, `W1(6/4/0)`.
4. **Same-Key + Different-Fingerprint Mismatch (`409 IDEMPOTENCY_PAYLOAD_MISMATCH`)**: Reusing `grp-1`'s `idempotency_key` with `quantity: 2` produces a different `canonical_request_hash` and is rejected with `409`; no stock changes.
5. **Two Concurrent Customers Competing for Last 4 Units**: Customer A and Customer B both request 4 `W1` when `ATP=4` (`6/2/0`). PostgreSQL `FOR UPDATE` serializes them: A succeeds (`6/6/0, ATP=0`); B resumes, sees `ATP=0 < 4`, rolls back, and receives `409 INSUFFICIENT_STOCK`.
6. **Checkout Refresh (`GET /checkout/sessions/{attemptId}`)**: Browser reload calls `GET` on `att-1`; `automotive-operations` returns the existing `checkout_attempt` and `grp-1` with the original `expires_at = T0 + 10m`. Zero new reservations or TTL extensions.
7. **10-Minute Timeout (`ReservationJanitorJob`)**: At `T0 + 10m05s` with no confirmation, janitor locks `grp-1` (`status = 'HELD' AND expires_at <= clock_timestamp()`), transitions `grp-1` to `EXPIRED`, and decrements `reserved`: `T1(10/0/0, ATP=10)`, `W1(6/0/0, ATP=6)`.
8. **Expired Hold vs. Late Payment Confirmation Race**: Payment webhook arrives at `T0 + 10m12s` and calls `POST /reservations/grp-1/confirm`. `grp-1` is already `EXPIRED` (or `expires_at <= clock_timestamp()`): returns `409 RESERVATION_EXPIRED` (never resurrects stock) so Part 6 Saga voids/refunds per reconciliation policy.
9. **Multi-Line Partial Shipping Dispatch (`ACT-PRD-031`, `op-ship-1`)**: After `grp-1` confirmed to `ALLOCATED` (`T1: 10/0/4, ATP=6`; `W1: 6/0/4, ATP=2`), warehouse ships 2 `T1` + 2 `W1` in one request (`operation_id = op-ship-1`). `inventory_operation_batch` claims `op-ship-1` first, locks both lines/inventory rows, decrements `T1(8/0/2, ATP=6)` and `W1(4/0/2, ATP=2)`, writes two `inventory_operation` child rows under `batch_id`, and transitions both lines + `grp-1` to `PARTIALLY_FULFILLED` (`fulfilled_quantity = 2`). Carrier delivery confirmation later does **not** decrement stock again.
10. **Duplicate Multi-Line Shipment Retry (`op-ship-1`)**: Retrying `POST /fulfill-handover` with `operation_id = op-ship-1` and matching `request_hash` hits `inventory_operation_batch.operation_id` uniqueness and replays `200 OK` without touching `T1(8/0/2)` or `W1(4/0/2)` (mismatched payload returns `409 IDEMPOTENCY_PAYLOAD_MISMATCH`).
11. **Allocation Cancel of Unfulfilled Remainder (`ACT-PRD-010B`)**: Customer cancels remaining 2 `T1` (`op-cancel-1`). Before: `T1(8/0/2, ATP=6)`. After: `T1(8/0/0, ATP=8)`, `requested_quantity = 4`, `fulfilled_quantity = 2`, `cancelled_quantity = 2`, `allocated_quantity = 0`, line status = `FULFILLED` (group reaches terminal `FULFILLED` once all lines are terminal with `>= 1` fulfilled unit).
12. **Guarded Stock Adjustment (`ACT-PRD-014`)**: When `T1` is `8/0/2` (`reserved=0, allocated=2, ATP=6`), staff adjustment `delta = -2` (`op-adj-1`) succeeds: `T1(6/0/2, ATP=4)`. An adjustment `delta = -7` would make `on_hand(1) < allocated(2)` and is rejected with `409 ADJUSTMENT_BREACHES_COMMITMENTS` (`T1` stays `6/0/2`).

---

## 4. Background Operations & Daemons
1. **`ReservationJanitorJob`** (`ACT-PRD-019`): Runs every 60 seconds; selects expired `HELD` groups (`expires_at <= clock_timestamp()`) with `FOR UPDATE SKIP LOCKED`; releases `quantity_reserved`; marks group and lines `EXPIRED`.
2. **`StockLedgerArchivalJob`**: `DEFERRED_BY_OWNER_V1` (annual `stock_movements` partitioning removed in V1 per `P3-DEC-05`).
