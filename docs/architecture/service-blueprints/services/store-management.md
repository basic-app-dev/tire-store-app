# Store Management Service (`store-management`) — Capability & Architecture Blueprint

> **Service Status**: Skeletons & Health Endpoint `[EXISTING]`; Business Logic & Flyway Migrations `[PLANNED]`  
> **Port**: `8098`  
> **Key Architectural Authority**: Approved Decision D (Authoritative Owner of Stores, Operating Hours, Physical Bays & Exclusion Constraints).

---

## A. Service Overview

### 1. Business Purpose & Scope
The `store-management` microservice is the authoritative system of record for the physical retail store network. It manages retail branch locations, PostGIS geographic coordinates, operating hours, holiday blackout dates, store service capabilities (e.g., standard lift, heavy-duty truck lift, wheel alignment bay), physical bay registries, and exclusive physical bay scheduling reservations.

### 2. Owned Domain Entities
- **Retail Store**: Physical branch location, address, contact phone, PostGIS spatial point (`geography(Point, 4326)`), active status.
- **Operating Hours**: Weekly recurring operating schedule (day of week, open/close times).
- **Store Blackout / Closure**: Exceptional holiday closures, emergency weather closures, or maintenance blackouts.
- **Service Capability**: Specific mechanical services supported by the store (Passenger Tires, Commercial Fleet, Alignment, AC).
- **Service Bay**: Physical lift/station within a store, bay type, maximum vehicle weight capacity, equipment features.
- **Bay Reservation**: Exclusive time-range hold preventing physical double-booking.

### 3. Owned Business Capabilities
- Master store directory and proximity search using PostGIS spatial indexing (`ST_DWithin`).
- Store operating schedule and holiday blackout management.
- Service bay configuration and capacity registry.
- Exclusive physical bay reservation and confirmation.
- Automated double-booking prevention enforced at the database level.

### 4. Primary Consumers & Authorized Actors
- **Consumers**:
  - `apps/web` & `apps/mobile`: Store locator, proximity search, hours of operation.
  - `appointment`: Requests bay availability and holds for standalone appointments.
  - `automotive-operations`: Requests bay holds for tire checkout sagas.
- **Authorized Actors**:
  - `customer`: Public access to store directory and operating hours.
  - `shop_worker`: Views assigned bay daily schedule.
  - `store_manager`: Updates store operating hours, creates temporary blackout dates, configures bay types.
  - `super_admin`: Provisions new retail store branches, sets global store capabilities.

### 5. Service Dependencies
- **Downstream Services Consumed**: None. `store-management` is a pure system of record.
- **External Dependencies**: PostGIS PostgreSQL spatial extensions.

### 6. Events Published & Consumed `[PLANNED via Outbox]`
- **Events Published**:
  - `store.directory.created` (v1)
  - `store.hours.updated` (v1)
  - `store.bay.reserved` (v1)
  - `store.bay.released` (v1)

### 7. Data Consistency & Invariants
- **Zero Double-Booking Guarantee**: Double-booking a physical service bay is made mathematically impossible at the database engine level using PostgreSQL GiST Range Exclusion Constraints:
  ```sql
  ALTER TABLE bay_reservation 
  ADD CONSTRAINT exclude_overlapping_bays 
  EXCLUDE USING GIST (bay_id WITH =, time_range WITH &&) 
  WHERE (status IN ('HELD', 'CONFIRMED'));
  ```
- **Spatial Indexing**: Store locations use PostGIS `ST_DWithin` with GiST spatial indexes to resolve sub-20ms proximity lookups.

---

## B. Internal Module Decomposition

### 1. Store Directory Module
- **Responsibility**: Manages physical store metadata, addresses, contacts, and PostGIS geographic points.
- **Owned Data**: `retail_store`.

### 2. Operating Hours Module
- **Responsibility**: Manages weekly recurring schedules, holiday closures, and emergency shutdowns.
- **Owned Data**: `store_operating_hours`, `store_blackout`.

### 3. Service Capability Module
- **Responsibility**: Manages supported services (Tires, Alignment, Brakes) and equipment certifications per store.
- **Owned Data**: `store_capability_mapping`.

### 4. Bay Registry Module
- **Responsibility**: Manages physical lifts, dimensions, and weight ratings within each branch.
- **Owned Data**: `service_bay`.

### 5. Exclusive Bay Reservation Module
- **Responsibility**: Manages tentative holds during checkout, confirmed reservations, and background hold expiration (proposed default: 15-minute TTL [configurable policy]).
- **Owned Data**: `bay_reservation`.

---

## C. Comprehensive Activity Catalog

| Activity ID | Activity Name | Module | Initiator / Trigger | Transaction Boundary | Consistency | Concurrency Control | Authorization | Priority | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **ACT-STR-001** | Create Retail Store Branch | Directory | `super_admin` | Local Service TX | Strong | Unique Store Code | `super_admin` | MVP | Proposed |
| **ACT-STR-002** | Update Store Contact & Details | Directory | `store_manager` | Local Service TX | Strong | Optimistic `@Version` | `store_manager` | MVP | Proposed |
| **ACT-STR-003** | Find Stores Nearby (Spatial Radius) | Directory | Customer / Web / Mobile | Read-Only Local TX | Eventual | PostGIS Spatial Index | Public | MVP | Proposed |
| **ACT-STR-004** | Configure Weekly Operating Hours | Hours | `store_manager` | Local Service TX | Strong | Time Range Check | `store_manager` | MVP | Proposed |
| **ACT-STR-005** | Add Store Holiday Blackout Date | Hours | `store_manager` | Local Service TX | Strong | Blackout Overlap Check | `store_manager` | MVP | Proposed |
| **ACT-STR-006** | Query Store Active Hours for Date | Hours | Web / Mobile / Appt | Read-Only Local TX | Strong | Composite Index Scan | Public | MVP | Proposed |
| **ACT-STR-007** | Register Physical Service Bay | Bay | `store_manager` | Local Service TX | Strong | Unique Bay Number | `store_manager` | MVP | Proposed |
| **ACT-STR-008** | Create Tentative Bay Hold | Reservation | Operations / Appt | Local Service TX | Strong | GiST Range Exclusion | System / Token | MVP | Proposed |
| **ACT-STR-009** | Confirm Bay Reservation | Reservation | Saga / Appt Service | Local Service TX | Strong | Status Precondition | System / Token | MVP | Proposed |
| **ACT-STR-010** | Release / Compensate Bay Hold | Reservation | Saga / Appt Service | Local Service TX | Strong | Idempotent Delete | System / Token | MVP | Proposed |
| **ACT-STR-011** | Expire Abandoned Bay Holds | Reservation | `@Scheduled` Janitor | Local Batch TX | Strong | `SKIP LOCKED` | System | MVP | Proposed |
| **ACT-STR-012** | Map Store Service Capabilities | Capability | `store_manager` | Local Service TX | Strong | Capability Enum Check | `store_manager` | MVP | Proposed |
| **ACT-STR-013** | List Bay Daily Occupancy Schedule | Bay | Store Technician Portal | Read-Only Local TX | Strong | B-Tree Date Scan | `shop_worker` | MVP | Proposed |
