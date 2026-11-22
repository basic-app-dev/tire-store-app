# Automotive Product Service (`automotive-product`) — Capability & Architecture Blueprint

> **Service Status**: Skeletons & Health Endpoint `[EXISTING]`; Business Logic & Flyway Migrations `[PLANNED]`  
> **Port**: `8092`  
> **Key Architectural Authority**: Independent microservice database; authoritative owner of tire/parts catalog, vehicle fitment reference rules, and store physical stock ledger.

---

## A. Service Overview

### 1. Business Purpose & Scope
The `automotive-product` microservice is the central product catalog, fitment validation, and branch-level physical inventory engine for tires, wheels, and automotive parts. It manages tire specifications, physical dimensional attributes, Year/Make/Model/Trim (YMMT) vehicle fitment compatibility rules, store-level inventory counts (on-hand, reserved, allocated), atomic reservation locking during customer checkout, retail pricing rules, and search filtering.

### 2. Owned Domain Entities
- **Tire Brand & Product Family**: Commercial manufacturer taxonomy and tire lines.
- **Product SKU & Dimensions**: Physical tire attributes (width, aspect ratio, rim diameter, load index, speed rating, UTQG, sidewall).
- **Vehicle Fitment Rule**: OEM factory sizing and optional plus-sizing rules mapped to vehicle Year/Make/Model/Trim.
- **Store Inventory Balance**: Physical inventory ledger tracking `quantity_on_hand`, `quantity_reserved`, and `quantity_allocated` per store branch.
- **Stock Reservation**: Time-bounded hold on physical stock during customer checkout (proposed default: 15-minute TTL [configurable policy]).
- **Stock Movement Log**: Immutable append-only audit ledger of every physical inventory change (`RECEIPT`, `TRANSFER`, `RESERVATION_HOLD`, `RESERVATION_RELEASE`, `SALE_ALLOCATION`, `ADJUSTMENT`).
- **Product Pricing & Promotion**: Base MSRP, promotional discount campaigns, and store-specific price overrides.

### 3. Owned Business Capabilities
- Comprehensive tire and automotive parts catalog management.
- Authoritative vehicle fitment compatibility lookup.
- Real-time Available-to-Promise (ATP) stock calculation:
  $$\text{quantity\_available} = \text{quantity\_on\_hand} - (\text{quantity\_reserved} + \text{quantity\_allocated})$$
- Atomic stock reservation and release during checkout.
- Multi-branch inventory transfer and physical stock intake.
- Pricing resolution with store overrides and promotional rules.

### 4. Primary Consumers & Authorized Actors
- **Consumers**:
  - `apps/web` & `apps/mobile`: Public tire catalog search, dimension filtering, fitment selector.
  - `automotive-operations`: Inquires stock availability, requests atomic reservations during checkout, confirms allocation upon payment.
- **Authorized Actors**:
  - `customer`: Public read access to catalog, fitment rules, and store stock availability.
  - `shop_worker`: Scans inventory receipts, records physical inventory counts.
  - `store_manager`: Adjusts branch stock counts, initiates inter-branch inventory transfers.
  - `super_admin`: Creates new tire brands, adds SKUs, ingests vehicle fitment reference datasets.

### 5. Service Dependencies
- **Downstream Services Consumed**: None. `automotive-product` is a pure system of record.
- **External Dependencies**: External fitment data feeds (NHTSA / OEM vehicle specs).

### 6. Events Published & Consumed `[PLANNED via Outbox]`
- **Events Published**:
  - `product.catalog.sku_created` (v1)
  - `product.inventory.low_stock` (v1)
  - `product.inventory.transfer_dispatched` (v1)
  - `product.inventory.transfer_received` (v1)

### 7. Data Consistency & Invariants
- **Non-Negative Available Stock Invariant**: Available stock cannot drop below zero.
- **Atomic Concurrency Control**:
  - Preferred implementation: **Conditional Atomic SQL Update**:
    ```sql
    UPDATE store_inventory 
    SET quantity_reserved = quantity_reserved + :requestedQty, updated_at = NOW() 
    WHERE store_id = :storeId AND sku_id = :skuId 
      AND (quantity_on_hand - quantity_reserved - quantity_allocated) >= :requestedQty;
    ```
  - If `rowsUpdated == 1`, reservation succeeds; if `rowsUpdated == 0`, HTTP `409 Conflict` is returned immediately.
  - Evaluated alternative: Pessimistic Row Locking (`SELECT ... FOR UPDATE`) is used when multi-row transaction consistency across bundled SKUs is required.

---

## B. Internal Module Decomposition

### 1. Product Catalog Module
- **Responsibility**: Manages brands, product lines, specifications, and SKU attributes.
- **Owned Data**: `tire_brand`, `product_family`, `product_sku`, `tire_specification`.

### 2. Vehicle Fitment Module
- **Responsibility**: Manages generic Year/Make/Model/Trim taxonomy, OEM tire specifications, and plus-sizing rules.
- **Owned Data**: `vehicle_reference_trim`, `fitment_specification`.

### 3. Branch Inventory Module
- **Responsibility**: Tracks physical inventory balances, stock movements, and receipts per store.
- **Owned Data**: `store_inventory`, `stock_movement`, `inventory_receipt`.

### 4. Stock Reservation Module
- **Responsibility**: Manages temporary reservation holds during checkout, confirmation upon payment, and TTL cleanup.
- **Owned Data**: `stock_reservation`.

### 5. Pricing & Promotion Module
- **Responsibility**: Resolves base MSRP, store price overrides, and promotional discount rules.
- **Owned Data**: `product_price`, `store_price_override`, `promo_campaign`.

### 6. Search & Filtering Module
- **Responsibility**: High-speed multi-attribute filtering (width, ratio, rim, speed rating, season) using composite B-Tree indexes.

---

## C. Comprehensive Activity Catalog

| Activity ID | Activity Name | Module | Initiator / Trigger | Transaction Boundary | Consistency | Concurrency Control | Authorization | Priority | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **ACT-PRD-001** | Create Product SKU | Catalog | `super_admin` | Local Service TX | Strong | Unique SKU Code | `super_admin` | MVP | Proposed |
| **ACT-PRD-002** | Update Product SKU Attributes | Catalog | `super_admin` | Local Service TX | Strong | Optimistic `@Version` | `super_admin` | MVP | Proposed |
| **ACT-PRD-003** | Ingest Vehicle Fitment Rules | Fitment | `super_admin` / Feed | Local Batch TX | Strong | Unique Composite Trim | `super_admin` | MVP | Proposed |
| **ACT-PRD-004** | Lookup Vehicle Fitment | Fitment | Customer / Web / Mobile | Read-Only Local TX | Eventual | B-Tree Composite Index | Public | MVP | Proposed |
| **ACT-PRD-005** | Filter Tires by Dimensions | Search | Customer / Web / Mobile | Read-Only Local TX | Eventual | Composite B-Tree Index | Public | MVP | Proposed |
| **ACT-PRD-006** | Receive Supplier Stock at Store | Inventory | Store Cashier / Mgr | Local Service TX | Strong | Row Lock / Audit | `store_manager` | MVP | Proposed |
| **ACT-PRD-007** | Check Available-to-Promise (ATP) | Inventory | Operations / Web | Read-Only Local TX | Strong | Read Committed | Public | MVP | Proposed |
| **ACT-PRD-008** | Create Stock Reservation Hold | Reservation | `automotive-operations` | Local Service TX | Strong | Conditional SQL Update | System / Token | MVP | Proposed |
| **ACT-PRD-009** | Confirm Stock Allocation | Reservation | `automotive-operations` | Local Service TX | Strong | Status Precondition | System / Token | MVP | Proposed |
| **ACT-PRD-010** | Release / Compensate Stock Hold | Reservation | `automotive-operations` | Local Service TX | Strong | Idempotent Update | System / Token | MVP | Proposed |
| **ACT-PRD-011** | Expire Abandoned Holds (Janitor) | Reservation | `@Scheduled` Janitor | Local Batch TX | Strong | `SKIP LOCKED` | System | MVP | Proposed |
| **ACT-PRD-012** | Initiate Inter-Branch Transfer | Inventory | Store Manager | Local Service TX | Strong | Stock Balance Check | `store_manager` | Next | Proposed |
| **ACT-PRD-013** | Receive Inter-Branch Transfer | Inventory | Target Store Manager | Local Service TX | Strong | Transfer Record Check | `store_manager` | Next | Proposed |
| **ACT-PRD-014** | Execute Manual Stock Adjustment | Inventory | Store Manager | Local Service TX | Strong | Audit Ledger Append | `store_manager` | MVP | Proposed |
| **ACT-PRD-015** | Configure Promotional Price Rule | Pricing | Marketing Manager | Local Service TX | Strong | Date Range Check | `super_admin` | MVP | Proposed |
| **ACT-PRD-016** | Set Store-Level Price Override | Pricing | Store Manager | Local Service TX | Strong | Optimistic `@Version` | `store_manager` | Next | Proposed |
| **ACT-PRD-017** | Resolve Effective Price for SKU | Pricing | Catalog Query / Order | Read-Only Local TX | Strong | Hierarchical Lookup | Public | MVP | Proposed |
| **ACT-PRD-018** | List Inventory Balances for Store | Inventory | Store Staff Portal | Read-Only Local TX | Strong | B-Tree Index Scan | `shop_worker` | MVP | Proposed |
| **ACT-PRD-019** | Audit Stock Movement History | Inventory | Compliance Auditor | Read-Only Local TX | Strong | Immutable Log | `store_manager` | Next | Proposed |
| **ACT-PRD-020** | Deactivate Product SKU | Catalog | `super_admin` | Local Service TX | Strong | Active Orders Check | `super_admin` | Next | Proposed |
| **ACT-PRD-021** | Bulk Import Product SKUs | Catalog | `super_admin` | Local Batch TX | Strong | Batch Validation | `super_admin` | Next | Proposed |
| **ACT-PRD-022** | Create Tire Brand & Family | Catalog | `super_admin` | Local Service TX | Strong | Unique Brand Name | `super_admin` | MVP | Proposed |
| **ACT-PRD-023** | Search Tires by Keyword / Model | Search | Public Web / Mobile | Read-Only Local TX | Eventual | `pg_trgm` GIN Index | Public | MVP | Proposed |
| **ACT-PRD-024** | Verify Plus-Sizing Safety | Fitment | Tire Specialist | Read-Only Local TX | Strong | Rolling Diameter Rule | Public | Next | Proposed |
| **ACT-PRD-025** | Flag Low Stock Thresholds | Inventory | System Monitoring | Read-Only Local TX | Strong | Threshold Predicate | System | Next | Proposed |
| **ACT-PRD-026** | Ingest Staggered Fitment Rules | Fitment | `super_admin` | Local Batch TX | Strong | Front/Rear Pair Check | `super_admin` | Next | Proposed |
| **ACT-PRD-027** | Retrieve Product Tech Sheet | Catalog | Public Web / Mobile | Read-Only Local TX | Strong | Primary Key Lookup | Public | MVP | Proposed |
| **ACT-PRD-028** | Calculate Batch Inventory Valuation | Inventory | Financial Accountant | Read-Only Local TX | Strong | Aggregation Query | `super_admin` | Next | Proposed |
