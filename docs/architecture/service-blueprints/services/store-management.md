# Microservice Architecture Specification: `store-management`

> **Service Identity**: `store-management` (Port 8098)
> **Status**: AUTHORITATIVE IMPLEMENTATION SPECIFICATION (Phase 2F-B-R2)
> **Primary Authority**: Physical Store Facilities, GPS Spatial Radius Searches, Operating Hours, Capabilities & Service Bay Scheduling
> **Storage**: PostgreSQL + PostGIS (stores, spatial points, service bays, GiST schedule ranges)
> **Consolidated Modules**: 2 Substantive Modules
> **Total Activities Owned**: 13 Activities (`ACT-STR-001` through `ACT-STR-013`)
> **Total Unique HTTP Endpoints**: 12 Endpoints (11 HTTP routes + 1 background janitor operation)

---

## 1. Domain Boundary & Module Architecture

`store-management` governs the physical reality of retail locations: geographical branches, operating schedules, physical equipment capabilities, and service bay reservations.

```
store-management (Port 8098)
├── network/      # MODULE 1: Store Network & Facilities Module (7 activities: ACT-STR-001..006, 012)
└── capacity/     # MODULE 2: Resource Capacity & Bay Scheduling Module (6 activities: ACT-STR-007..011, 013)
```

---

## 2. Business Entities & State Machine Transitions

### 2.1 Core Entities
1. `store_branch`: `id`, `store_number`, `name`, `address_line1`, `city`, `state`, `postal_code`, `location_geog` (PostGIS GEOGRAPHY(POINT, 4326)), `phone`, `status`.
2. `store_operating_hours`: `id`, `store_id`, `day_of_week`, `open_time`, `close_time`, `is_closed`.
3. `service_bay`: `id`, `store_id`, `bay_number`, `bay_type` (ALIGNMENT, STANDARD_LIFT, HEAVY_DUTY), `status`.
4. `bay_schedule_entry`: `id`, `bay_id`, `booked_period` (TSRANGE), `status` (HELD, BOOKED, CANCELLED), `order_id`, `expires_at`.

---

## 3. Module Specifications & Business Activities

### 3.1 Module 1: Store Network & Facilities Module
- **ACT-STR-001**: Search Nearby Stores by GPS Radius
  - **HTTP Method & Path**: `GET /api/v1/stores/nearby` (Visibility: PUBLIC)
  - **Query Params**: `lat=37.7749&lng=-122.4194&radius_meters=25000`
  - **Algorithm**: Executes PostGIS spatial query:
    ```sql
    SELECT id, store_number, name, ST_Distance(location_geog, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography) as dist_meters
    FROM store_branch
    WHERE ST_DWithin(location_geog, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, :radius_meters)
    ORDER BY dist_meters ASC LIMIT 10;
    ```
  - **SLO Target**: p95 < 25 ms.
- **ACT-STR-002**: Get Detailed Store Profile & Amenities (`GET /api/v1/stores/{id}`) | SLO: < 20 ms.
- **ACT-STR-003**: Query Store Operating Hours & Holidays (`GET /api/v1/stores/{id}/hours`) | SLO: < 20 ms.
- **ACT-STR-004**: Register New Branch Location (`POST /api/v1/stores/admin/stores`) | Geocodes spatial point | SLO: < 120 ms.
- **ACT-STR-005**: Update Branch Operating Hours (`PUT /api/v1/stores/admin/stores/{id}/hours`) | SLO: < 50 ms.
- **ACT-STR-006**: Query Store Service Offerings (`GET /api/v1/stores/{id}/services`) | Facility capabilities | SLO: < 25 ms.
- **ACT-STR-012**: Emergency Store Closure Override (`POST /api/v1/stores/admin/stores/{id}/emergency-closure`) | Flags store closed | SLO: < 60 ms.

---

### 3.2 Module 2: Resource Capacity & Bay Scheduling Module
- **ACT-STR-007**: Reserve Service Bay Slot
  - **HTTP Method & Path**: `POST /api/v1/stores/bays/reservations` (Visibility: INTERNAL / SAGA)
  - **Request Body**:
    ```json
    {
      "store_id": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
      "bay_id": "3a4b5c6d-7e8f-9a0b-1c2d-3e4f5a6b7c8d",
      "start_time": "2026-11-25T14:00:00Z",
      "end_time": "2026-11-25T15:00:00Z",
      "ttl_minutes": 15
    }
    ```
  - **Response**: `201 Created` with `bay_reservation_id` and `expires_at`.
  - **Concurrency Mechanism**: System selects compatible bay automatically; PostgreSQL GiST range exclusion prevents physical double-booking. | SLO: < 45 ms.
- **ACT-STR-008**: Confirm Bay Reservation on Checkout Payment (`POST /api/v1/stores/bays/reservations/{id}/confirm`) | Transitions hold to BOOKED | SLO: < 40 ms.
- **ACT-STR-009**: Release Bay Hold on Cancel / Compensation (`DELETE /api/v1/stores/bays/reservations/{id}`) | Removes GiST entry | SLO: < 35 ms.
- **ACT-STR-010**: Purge Expired Bay Holds (`NO HTTP ENDPOINT`) | `BayReservationJanitorJob` running every 60s | SLO: 60s delay.
- **ACT-STR-011**: Query Real-Time Bay Schedule Grid (`GET /api/v1/stores/{id}/bays/schedule`) | Shop worker grid view | SLO: < 45 ms.
- **ACT-STR-013**: Configure Service Bay Capabilities (`POST /api/v1/stores/admin/stores/{id}/bays`) | Admin config | SLO: < 60 ms.
