# Vehicle Product Service (`vehicle-product`) — Capability & Architecture Blueprint

> **Service Status**: Skeletons & Health Endpoint `[EXISTING]`; Business Logic & Flyway Migrations `[PLANNED]`  
> **Port**: `8094`  
> **Key Architectural Authority**: Independent microservice database; authoritative owner of VIN physical vehicle units.

---

## A. Service Overview

### 1. Business Purpose & Scope
The `vehicle-product` microservice is the authoritative system of record for all physical used vehicles in inventory. It manages vehicle identification numbers (VINs), vehicle specifications, physical condition logs, 150-point inspection records, damage appraisals, photo media assets, and vehicle availability states (`DRAFT`, `INSPECTION`, `LISTED`, `HELD`, `PENDING_SALE`, `SOLD`, `WHOLESALE`).

### 2. Owned Domain Entities
- **Vehicle Unit (VIN)**: Physical vehicle instance, 17-character VIN checksum, mileage, exterior/interior colors, location store ID.
- **Vehicle Listing**: Public pricing, vehicle options, marketing description, and web publication state.
- **Vehicle Inspection Report**: Comprehensive 150-point inspection record, tire tread depths, brake pad thickness, mechanical defect notes.
- **Vehicle Hold**: Exclusive time-bounded reservation on a specific VIN (proposed default: 48-hour TTL [configurable policy]).
- **Photo Asset Metadata**: High-resolution image references, CDN URLs, primary thumbnail flag, and image display order.

### 3. Owned Business Capabilities
- 17-character VIN format validation, check-digit calculation, and uniqueness enforcement.
- Multi-point vehicle inspection capture and digital condition report publication.
- Vehicle availability lifecycle management and state transitions.
- Atomic vehicle hold reservation and release.
- Vehicle photo gallery management.

### 4. Primary Consumers & Authorized Actors
- **Consumers**:
  - `apps/web` & `apps/mobile`: Public used vehicle inventory search, detail pages, inspection reports.
  - `vehicle-sales`: Queries vehicle availability, requests temporary holds, marks vehicle `SOLD`.
- **Authorized Actors**:
  - `customer`: Browses listed inventory, views inspection reports and photo galleries.
  - `shop_worker` / Technician: Completes 150-point inspection reports, logs tire/brake wear.
  - `store_manager`: Creates vehicle intake records, updates listing prices, publishes listings.
  - `super_admin`: Global vehicle inventory audit, multi-branch transfers.

### 5. Service Dependencies
- **Downstream Services Consumed**: None. `vehicle-product` is a pure system of record.
- **External Dependencies**: Object Storage / CDN (AWS S3 or Cloudflare R2 for vehicle photo storage).

### 6. Events Published & Consumed `[PLANNED via Outbox]`
- **Events Published**:
  - `vehicle.inventory.created` (v1)
  - `vehicle.listing.published` (v1)
  - `vehicle.hold.created` (v1)
  - `vehicle.hold.released` (v1)
  - `vehicle.inventory.sold` (v1)

### 7. Data Consistency & Invariants
- **VIN Uniqueness**: The 17-character VIN is enforced unique across active inventory via a PostgreSQL unique index.
- **Atomic State Transitions**: Vehicle hold reservation executes as a conditional atomic update:
  ```sql
  UPDATE vehicle_unit 
  SET status = 'HELD', updated_at = NOW() 
  WHERE id = :vehicleId AND status = 'LISTED';
  ```
  If `rowsUpdated == 0`, the vehicle is already held or sold, and HTTP `409 Conflict` is returned immediately.
- **Terminal Sold Invariant**: A vehicle marked `SOLD` cannot transition back to `AVAILABLE` via automated Saga rollback.

---

## B. Internal Module Decomposition

### 1. Vehicle Inventory Module
- **Responsibility**: Tracks physical VIN instances, mileage, title status, intake dates, and store lot locations.
- **Owned Data**: `vehicle_unit`, `vehicle_status_history`.

### 2. Vehicle Listing Module
- **Responsibility**: Manages public catalog pricing, features, publication states, and promotional badges.
- **Owned Data**: `vehicle_listing`, `vehicle_feature`.

### 3. Condition & Inspection Module
- **Responsibility**: Records 150-point inspection results, tire/brake wear measurements, and cosmetic damage.
- **Owned Data**: `vehicle_inspection`, `inspection_item`.

### 4. Vehicle Hold Module
- **Responsibility**: Manages temporary customer holds securing a VIN during deposit processing, and background TTL expiration.
- **Owned Data**: `vehicle_hold`.

### 5. Photo Asset Module
- **Responsibility**: Manages image upload metadata, CDN links, and thumbnail ordering.
- **Owned Data**: `vehicle_photo`.

---

## C. Comprehensive Activity Catalog

| Activity ID | Activity Name | Module | Initiator / Trigger | Transaction Boundary | Consistency | Concurrency Control | Authorization | Priority | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **ACT-VEH-001** | Ingest Vehicle by VIN & Validate | Inventory | Store Manager at Intake | Local Service TX | Strong | Unique Index on `vin` | `store_manager` | MVP | Proposed |
| **ACT-VEH-002** | Record 150-Point Inspection | Condition | Certified Technician | Local Service TX | Strong | Inspection Immutable | `shop_worker` | MVP | Proposed |
| **ACT-VEH-003** | Upload Vehicle Media & Photos | Media | Lot Photographer | Local Service TX | Strong | Client Batch ID | `shop_worker` | MVP | Proposed |
| **ACT-VEH-004** | Publish Vehicle Listing | Listing | Store Sales Manager | Local Service TX + Outbox | Strong | Precondition Validation | `store_manager` | MVP | Proposed |
| **ACT-VEH-005** | Search Used Vehicle Inventory | Listing | Public Web / Mobile | Read-Only Local TX | Eventual | Read Projections / Index | Public | MVP | Proposed |
| **ACT-VEH-006** | Place Atomic Hold on Vehicle VIN | Hold | `vehicle-sales` (Saga) | Local Service TX | Strong | Conditional SQL Update | Service / Token | MVP | Proposed |
| **ACT-VEH-007** | Release Vehicle Hold | Hold | `vehicle-sales` / TTL Janitor | Local Service TX | Strong | Conditional SQL Update | Service / Token | MVP | Proposed |
| **ACT-VEH-008** | Mark Vehicle Permanently Sold | Inventory | `vehicle-sales` (Contract) | Local Service TX + Outbox | Strong | Status Precondition | Service / Token | MVP | Proposed |
| **ACT-VEH-009** | Update Vehicle Branch Location | Inventory | Store Manager | Local Service TX | Strong | Optimistic `@Version` | `store_manager` | Next | Proposed |
| **ACT-VEH-010** | Retrieve Vehicle Inspection Report | Condition | Public Customer | Read-Only Local TX | Strong | Read Replica / Index | Public | MVP | Proposed |
