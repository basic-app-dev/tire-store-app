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

### 2.1 Core Entities Owned
1. `product_sku` (PostgreSQL): `id`, `sku_code`, `brand_id`, `product_family_id`, `base_price_cents`, `status`.
2. `tire_specification` (PostgreSQL): `sku_id`, `section_width`, `aspect_ratio`, `rim_diameter`, `speed_rating`, `load_index`, `is_run_flat`, `utqg_treadwear`.
3. `automotive_service_definition` (PostgreSQL): `id`, `service_code`, `service_name`, `estimated_duration_minutes`, `required_bay_type`, `pricing_model`.
4. `store_price_override` (PostgreSQL): `id`, `store_id`, `sellable_item_id`, `override_price_cents`, `effective_range`.
5. `vehicle_fitment_reference` (PostgreSQL): `id`, `year`, `make`, `model`, `trim`, `oem_tire_size`, `load_index_min`.
6. `store_inventory` (PostgreSQL): `id`, `store_id`, `sku_id`, `quantity_on_hand`, `quantity_reserved`, `quantity_allocated`.
7. `stock_reservation` (PostgreSQL): `id`, `store_id`, `sku_id`, `quantity`, `status`, `expires_at`, `order_id`.
8. `stock_movement` (PostgreSQL): `id`, `store_id`, `sku_id`, `movement_type`, `quantity`, `reference_id`, `created_at`.

### 2.2 Stock Reservation Lifecycle
```text
Stock Hold Lifecycle:
  [HELD] --(Payment Succeeded)--> [CONFIRMED_ALLOCATED] --(Handover/Install)--> [FULFILLED]
    |
    +--(Timeout / Janitor)------> [EXPIRED]
    +--(Checkout Cancelled)-----> [RELEASED]
```

---

## 3. Module Specifications & Business Activities

### 3.1 Module 1: Catalog & Services Module

| Activity ID | Activity Name | Method & Proposed URI | Visibility | Concurrency & Data Target | Target p95 Latency |
| :--- | :--- | :--- | :---: | :--- | :---: |
| **ACT-PRD-001** | Search Tire & Parts Catalog | `GET /api/v1/automotive/products/catalog/tires` | PUBLIC | Composite B-Tree + pg_trgm index | < 35 ms |
| **ACT-PRD-002** | Get Detailed SKU Specification | `GET /api/v1/automotive/products/catalog/{id}` | PUBLIC | Primary key lookup on `product_sku` | < 25 ms |
| **ACT-PRD-015** | Filter Catalog by Brand | `GET /api/v1/automotive/products/catalog/brands` | PUBLIC | Cached brand lookup | < 30 ms |
| **ACT-PRD-016** | Filter Catalog by Dimensions | `GET /api/v1/automotive/products/catalog/dimensions` | PUBLIC | Dimensional index (width, aspect, rim) | < 30 ms |
| **ACT-PRD-017** | Query Product Families | `GET /api/v1/automotive/products/catalog/families` | PUBLIC | Category tree lookup | < 25 ms |
| **ACT-PRD-020** | Ingest Product Catalog SKU Data | `POST /api/v1/automotive/products/admin/catalog/skus` | ADMIN | Local TX; creates SKU & spec records | < 80 ms |
| **ACT-PRD-021** | Update Tire Spec Parameters | `PUT /api/v1/automotive/products/admin/catalog/skus/{id}/spec`| ADMIN | Optimistic version check | < 60 ms |
| **ACT-PRD-022** | Archive Discontinued Product SKU| `DELETE /api/v1/automotive/products/admin/catalog/skus/{id}` | ADMIN | Soft delete / sets status ARCHIVED | < 50 ms |
| **ACT-PRD-023** | Query Global Price Book | `GET /api/v1/automotive/products/catalog/prices` | PUBLIC / INTERNAL| Base price lookup | < 35 ms |
| **ACT-PRD-027** | Synchronize Vendor Feeds | `POST /api/v1/automotive/products/admin/catalog/vendor-sync` | ADMIN | Batch vendor catalog ingestion | < 250 ms |
| **ACT-PRD-029** | Define Global Automotive Service| `POST /api/v1/automotive/products/admin/services` | ADMIN | Models service labor & bay type | < 50 ms |
| **ACT-PRD-030** | Configure Pricing Rules & Overrides| `POST /api/v1/automotive/products/admin/pricing-rules` | ADMIN | Authoritative base & store overrides | < 45 ms |

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
| **ACT-PRD-008** | Reserve Physical Stock | `POST /api/v1/automotive/products/inventory/reservations` | INTERNAL / SAGA | Conditional atomic update on `store_inventory`| < 35 ms |
| **ACT-PRD-009** | Confirm Stock Allocation | `POST /api/v1/automotive/products/inventory/reservations/{id}/confirm`| INTERNAL / SAGA | Moves `reserved` -> `allocated`; `on_hand` same| < 40 ms |
| **ACT-PRD-010** | Release / Compensate Stock Hold | `DELETE /api/v1/automotive/products/inventory/reservations/{id}`| INTERNAL / SAGA | Decrements `reserved` | < 35 ms |
| **ACT-PRD-011** | Ingest Warehouse Goods Receipt | `POST /api/v1/automotive/products/inventory/receipts` | STAFF | Increments `quantity_on_hand` | < 60 ms |
| **ACT-PRD-012** | Dispatch Inter-Branch Transfer | `POST /api/v1/automotive/products/inventory/transfers/dispatch` | STAFF | Decrements source `on_hand` | < 70 ms |
| **ACT-PRD-013** | Receive Inbound Inter-Branch Transfer | `POST /api/v1/automotive/products/inventory/transfers/receive` | STAFF | Increments dest `on_hand` | < 65 ms |
| **ACT-PRD-014** | Execute Physical Stock Adjustment | `POST /api/v1/automotive/products/inventory/adjustments` | STAFF / ADMIN | Audit record in `stock_movement` | < 55 ms |
| **ACT-PRD-018** | Query Inventory Movement Ledger | `GET /api/v1/automotive/products/inventory/movements` | STAFF / ADMIN | Date-range partitioned query | < 50 ms |
| **ACT-PRD-019** | Janitor Purge of Expired Holds | `NO HTTP ENDPOINT` (`ReservationJanitorJob`) | INTERNAL | Background janitor running every 60s | < 60s delay |
| **ACT-PRD-025** | Reconcile Inventory vs Ledger | `POST /api/v1/automotive/products/inventory/reconcile` | ADMIN | Periodic integrity audit | < 200 ms |
| **ACT-PRD-028** | Mark Damaged Stock | `POST /api/v1/automotive/products/inventory/damage` | STAFF | Decrements `on_hand`; writes scrap audit | < 45 ms |
| **ACT-PRD-031** | Record Physical Stock Handover | `POST /api/v1/automotive/products/inventory/fulfill-handover`| INTERNAL / STAFF | Decrements `quantity_allocated` AND `on_hand` | < 60 ms |

#### Detailed Endpoint Specification: ACT-PRD-008 (Reserve Physical Stock)
- **HTTP Method & Path**: `POST /api/v1/automotive/products/inventory/reservations` (Visibility: INTERNAL)
- **Request Headers**: `Idempotency-Key: {uuid}`, `Authorization: Bearer {internal_token}`
- **Request Body**:
  ```json
  {
    "store_id": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
    "sku_id": "8a3e7b1a-4d2c-4b5a-9f8e-1b2c3d4e5f6a",
    "quantity": 4,
    "ttl_minutes": 15,
    "order_id": "ord-20261123-0091"
  }
  ```
- **Response**: `201 Created`
  ```json
  {
    "reservation_id": "res-9988-7766-5544",
    "status": "HELD",
    "store_id": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
    "sku_id": "8a3e7b1a-4d2c-4b5a-9f8e-1b2c3d4e5f6a",
    "quantity": 4,
    "expires_at": "2026-11-23T23:35:00Z"
  }
  ```
- **Concurrency Algorithm (Atomic Conditional Update)**:
  ```sql
  UPDATE store_inventory
  SET quantity_reserved = quantity_reserved + :req_qty
  WHERE store_id = :store_id
    AND sku_id = :sku_id
    AND (quantity_on_hand - quantity_reserved - quantity_allocated) >= :req_qty
  RETURNING id, quantity_on_hand, quantity_reserved, quantity_allocated;
  ```
### 3.4 Rigorous Inventory Commands & Lifecycle Transitions

To maintain strict physical accounting, financial auditability, and prevent blind counter decrements upon events, `automotive-product` exposes separate, conditionally verified commands for each distinct inventory lifecycle event:

```mermaid
stateDiagram-v2
    [*] --> ATP : Physical Stock Received (ACT-PRD-011)
    ATP --> RESERVED : 1. Checkout Hold (ACT-PRD-008)
    RESERVED --> ATP : 1a. Checkout Aborted / Expired (ACT-PRD-010)
    RESERVED --> ALLOCATED : 2. Payment Succeeded (ACT-PRD-009)
    ALLOCATED --> ATP : 2a. Order Cancelled Prior to Fulfillment (ACT-PRD-010B)
    ALLOCATED --> HANDED_OVER : 3. Counter Pickup Handover / Service Installed (ACT-PRD-031)
    HANDED_OVER --> RETURNED : 4. Physically Returned & Inspected (ACT-PRD-014)
    RETURNED --> ATP : Restocked to Available Inventory
```

1. **Release Active Checkout Reservation (`ACT-PRD-010`)**:
   - *Trigger*: Checkout saga compensation or expiration janitor (`ACT-PRD-019`).
   - *State Transition*: `quantity_reserved = quantity_reserved - :qty` (where `status = 'ACTIVE'`).
   - *Effect on On-Hand*: `quantity_on_hand` unchanged. Restores Available-to-Promise ($	ext{ATP}$).
2. **Cancel Confirmed Order Allocation (`ACT-PRD-010B` - Allocation Cancellation)**:
   - *Endpoint*: `POST /api/v1/automotive/products/inventory/allocations/{id}/cancel`
   - *Trigger*: Post-payment order cancellation (`ACT-OPS-007`).
   - *Preconditions*: Allocation must be in state `ALLOCATED_PENDING_FULFILLMENT`.
   - *State Transition*: `quantity_allocated = quantity_allocated - :qty` (where `id = :allocationId AND status = 'ALLOCATED'`).
   - *Effect on On-Hand*: `quantity_on_hand` unchanged. Restores $	ext{ATP}$. Emits `StockAllocationCancelledEvent`.
   - *Duplicate / Concurrent Handling*: If already fulfilled (`HANDED_OVER`), cancellation is rejected with HTTP 409 Conflict.
3. **Partial Order Fulfillment**:
   - Supports line-level fulfillment tracking: records `fulfilled_quantity` on allocation item. Decrements `quantity_allocated` and `quantity_on_hand` strictly by fulfilled quantity. Unfulfilled remainder stays allocated until subsequent fulfillment or explicit partial cancellation.
4. **Physical Handover / Installation (`ACT-PRD-031`)**:
   - *Trigger*: Customer carry-out PIN verification (`ACT-OPS-016`) or technician work order finalization (`ACT-OPS-014`).
   - *Preconditions*: Allocation status must be `ALLOCATED`.
   - *State Transition*: `quantity_on_hand = quantity_on_hand - :qty, quantity_allocated = quantity_allocated - :qty`.
   - *Effect on ATP*: $	ext{ATP}$ formula remains identical since both on-hand and allocated drop by the same quantity.
5. **Physical Goods Return, Inspection & Disposition (`ACT-PRD-014` & `ACT-PRD-028`)**:
   - *Strict Accounting Principle*: Physically returned items are NEVER automatically returned to sellable Available-to-Promise inventory.
   - *Mandatory Inspection & Quarantine*:
     - When tires are returned physically to a store counter, store staff issues `POST /api/v1/automotive/products/inventory/returns/intake`. Stock enters `RETURNED_QUARANTINE` status in `inventory_quarantine_item`. `quantity_on_hand` and Available-to-Promise ($	ext{ATP}$) remain unchanged.
     - Store manager or certified technician conducts physical inspection for tread wear (32nds inch gauge), bead tears, punctures, and mounting marks.
   - *Formal Disposition Outcomes*:
     - *Outcome A (Sellable - Full Restock)*: If unmounted and pristine, manager approves restock (`ACT-PRD-014`). Executes `quantity_on_hand = quantity_on_hand + :qty` with audit reason `RMA_RESTOCK_APPROVED`. Stock returns to $	ext{ATP}$.
     - *Outcome B (Damaged / Unsellable)*: If damaged or worn, item is written off via `ACT-PRD-028` (`Mark Damaged Stock`). Stock moves to salvage scrap inventory; never enters $	ext{ATP}$.
     - *Outcome C (Warranty / Factory Defect)*: Item logged into `warranty_dispute_log` for vendor credit claims against distributor/OEM.
     - *Outcome D (Service Rework / Dispute)*: Defective installation rework consumes warranty parts without charging customer; logged against original `work_order_id`.
6. **Accounting for Consumed Service Parts**:
   - Shop supplies (valve stems, wheel weights, oil) consumed during work orders are deducted directly from on-hand inventory via `ACT-PRD-031` linked to the `work_order_id`, recording permanent audit entries in `inventory_movement_ledger`.

---

## 4. Background Operations & Daemons
1. **`ReservationJanitorJob`** (`ACT-PRD-019`): Runs every 60 seconds; selects expired holds with `FOR UPDATE SKIP LOCKED`; releases `quantity_reserved`; marks reservations `EXPIRED`.
2. **`StockLedgerArchivalJob`**: Runs daily at 02:00 AM; archives movement ledger records older than 365 days into cold storage.
