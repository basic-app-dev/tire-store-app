# Microservice Architecture Specification: `store-management` (Consolidated with `appointment`)

> **Service Identity**: `store-management` (Port 8098) — *Absorbs retired standalone `appointment` (Port 8097) per `P5-DEC-01` (2026-11-27)*
> **Status**: AUTHORITATIVE PART 5 SPECIFICATION (`P5-DEC-01`–`P5-DEC-11`)
> **Primary Authority**: Store Administration (Branches, Hours, IANA Timezones, Closures, Service Offerings), Bay Scheduling (GiST `TSTZRANGE` Holds & Best-Fit Assignment), and Appointment Management (Vehicle Visits, Rescheduling, Cancellations)
> **Storage**: PostgreSQL + PostGIS (`store_management_db` / `store_management`)
> **Consolidated Modules**: 3 Substantive Modules (`Store Administration`, `Bay Scheduling`, `Appointment Management`)
> **Total Activities Owned**: 23 Activities (`ACT-STR-001`..`013` + `ACT-APT-001`..`010`)

---

## 1. Domain Boundary & Module Architecture (`P5-DEC-01`)

`store-management` governs retail branch facilities, operating calendars, bay capacity, and customer vehicle appointments in **one service-owned PostgreSQL database**. Merging `appointment` into `store-management` eliminates the cross-service bay-to-appointment transaction while preserving the distributed Checkout Saga for physical inventory (`automotive-product`) and payment (`automotive-operations`).

```text
store-management (Port 8098)
├── network/      # MODULE 1: Store Administration (ACT-STR-001..006, 012)
├── capacity/     # MODULE 2: Bay Scheduling (ACT-STR-007..011, 013)
└── appointment/  # MODULE 3: Appointment Management (ACT-APT-001..010; Part 7 entitlement redemption owner)
```

---

## 2. Business Entities & Canonical Lifecycles (`P5-DEC-05`, `P5-DEC-06`, `P5-DEC-10`)

1. `store_branches`: `id`, `store_number`, `name`, `location_geog` (`GEOGRAPHY(POINT, 4326)`), `timezone` (IANA `zone_id`), `default_visit_buffer_minutes`, `slot_increment_minutes`, `is_active`.
2. `store_operating_hours` & `store_calendar_exceptions`: Multiple opening intervals per weekday, holidays, modified hours, and emergency closures.
3. `store_service_offerings`: `(store_id, service_id, is_offered)` — operational offering only (`automotive-product.store_service_price` owns USD pricing).
4. `service_bays` & `bay_unavailability_blocks`: Active bays (all active bays at a store are interchangeable for all offered services in V1; `bay_number` is internal staff-only and never exposed to customers).
5. `service_appointments`, `appointment_services` & `bay_schedule_entries`: One appointment = one vehicle visit at one store with 1+ services scheduled sequentially in one auto-selected bay.
   - **Canonical Hold / Appointment Lifecycle**:
     - `HELD` (10m checkout-entry deadline) → `CONFIRMED` (payment/order confirmed; durable past 10m) → `CHECKED_IN` → `IN_SERVICE` → `COMPLETED`
     - `HELD` → `EXPIRED` (10m timeout / in-TX retirement) or `RELEASED` (checkout cancel/compensation)
     - `CONFIRMED` → `RESCHEDULED` (new bay/slot committed) or `CANCELLED` (non-destructive) or `NO_SHOW`

---

## 3. Module Specifications & Business Activities

### 3.1 Module 1: Store Administration
- **ACT-STR-001**: Search Nearby Stores by GPS Radius (`GET /api/v1/stores/nearby`, PostGIS `ST_DWithin` / `ST_Distance`) | SLO: < 25 ms.
- **ACT-STR-002**: Get Store Profile & Amenities (`GET /api/v1/stores/{id}`) | SLO: < 20 ms.
- **ACT-STR-003**: Query Store Operating Hours, Timezone & Calendar Exceptions (`GET /api/v1/stores/{id}/hours`) | SLO: < 20 ms.
- **ACT-STR-004**: Register New Branch Location (`POST /api/v1/stores/admin/stores`) | SLO: < 120 ms.
- **ACT-STR-005**: Update Branch Operating Intervals (`PUT /api/v1/stores/admin/stores/{id}/hours`) | SLO: < 50 ms.
- **ACT-STR-006**: Query Store Service Offerings (`GET /api/v1/stores/{id}/services`) | SLO: < 25 ms.
- **ACT-STR-012**: Emergency / Exceptional Store Closure (`POST /api/v1/stores/admin/stores/{id}/emergency-closure`) — Inserts `store_calendar_exceptions`, flags impacted `CONFIRMED` appointments (`closure_review_required = TRUE`), and emits `StoreClosureImpactedAppointmentsEvent` for staff review and customer notification (**never silently deletes or auto-refunds**). | SLO: < 60 ms.

### 3.2 Module 2: Bay Scheduling (`P5-DEC-05`, `P5-DEC-06`, `P5-DEC-08`)
- **ACT-STR-007**: Atomically Hold Bay & Appointment (`POST /api/v1/stores/bays/reservations`, INTERNAL / SAGA)
  - **Request**: `{ store_id, checkout_attempt_id, idempotency_key, expires_at, scheduled_start, scheduled_end, vehicle_snapshot, customer_id, services:[{service_id, service_code, estimated_duration_minutes}] }` (**never accepts customer-chosen `bay_id`**).
  - **Algorithm**: Claims `idempotency_key` + `canonical_request_hash`, validates `expires_at` (shared 10m deadline from `checkout_attempt`), validates operating interval & IANA DST local time, atomically retires conflicting expired `HELD` rows (`expires_at <= clock_timestamp()`), picks best-fit active bay, and inserts `service_appointments` (`HELD`) + `appointment_services` + `bay_schedule_entries` (`HELD`) in **one local PostgreSQL TX**.
  - **Response (`201 Created`)**: Returns `appointment_id`, `bay_reservation_id` (opaque hold ID), `status: "HELD"`, `expires_at` (**omits `bay_number` / `assigned_bay_id` for customer-facing payloads**).
- **ACT-STR-008**: Confirm Bay Hold & Appointment (`POST /api/v1/stores/bays/reservations/{id}/confirm`) — Guards `status = 'HELD' AND expires_at > clock_timestamp()` (`affected_rows = 1`); transitions to `CONFIRMED` (or returns `409 BAY_RESERVATION_EXPIRED`).
- **ACT-STR-009**: Release Bay Hold (`DELETE /api/v1/stores/bays/reservations/{id}`) — Non-destructively transitions `HELD -> RELEASED` (retains row for audit).
- **ACT-STR-010**: `BayReservationJanitorJob` (`NO HTTP ENDPOINT`, every 60s, `SKIP LOCKED`) — Transitions expired `HELD` entries to `EXPIRED` and emits `ServiceSlotAvailabilityChangedEvent`.
- **ACT-STR-011**: Query Real-Time Bay Schedule Grid (`GET /api/v1/stores/{id}/bays/schedule`, STAFF) — Staff-only view showing `assigned_bay_id` / `bay_number` and `closure_review_required` flags.
- **ACT-STR-013**: Configure Store Bays & Maintenance Blocks (`POST /api/v1/stores/admin/stores/{id}/bays`) — Manages active bays and `bay_unavailability_blocks`.

### 3.3 Module 3: Appointment Management (`ACT-APT-001`–`010`, Consolidated into `store-management` :8098)

> **Customer Bay-ID Privacy Rule (`P5-DEC-05`)**: Customer-facing appointment APIs (`ACT-APT-001`, `003`, `004`, `005`, `008`, `010`) **never require, accept, or expose** internal `bay_id`, `assigned_bay_id`, or `bay_number`. Internal bay assignment is visible only on staff-authenticated endpoints (`ACT-STR-011`, staff view of `ACT-APT-003`/`006`/`007`).

- **ACT-APT-001**: Advisory Slot Availability Search (`GET /api/v1/stores/{storeId}/appointments/availability?date_from=...&date_to=...&duration_minutes=...`, PUBLIC / CUSTOMER) | SLO: < 45 ms.
  - **Deterministic V1 Best-Fit Scheduling Algorithm (`P5-DEC-06`, `APT-21`)**:
    1. Compute `total_duration = sum(service_durations) + store.default_visit_buffer_minutes`.
    2. Convert `[date_from, date_to]` in store IANA `timezone` to allowed UTC intervals from `store_operating_hours` and `store_calendar_exceptions`, rejecting DST nonexistent local gaps and handling DST fall-back ambiguities deterministically.
    3. Subtract `bay_unavailability_blocks` and active `bay_schedule_entries` (`HELD` with `expires_at > clock_timestamp()`, `CONFIRMED`) per active bay.
    4. Generate candidate `scheduled_start` times on `slot_increment_minutes` boundaries (e.g., 15m increments; a 90m visit starting at 10:15 occupies `[10:15, 11:45)`).
    5. Verify at least one active bay has continuous free time `[start, start + total_duration)` completely inside one allowed operating interval.
    6. At authoritative reservation (`ACT-STR-007`), select the bay with **minimal remaining-gap fragmentation** (smallest free block that fits the visit), breaking ties deterministically by `bay_number ASC, bay_id ASC`.
    7. Return available start/end times only (**no bay IDs or bay numbers**; advisory only, not a guarantee).
    - *V1 Employee Limitation*: Bay availability does **not** independently guarantee technician/employee availability; manual worker assignment is handled in Part 8.
- **ACT-APT-002**: Internal Booking Confirmation (`POST /api/v1/appointments`, INTERNAL / SAGA) | SLO: < 110 ms.
  - Consolidated into `store-management` local ACID transactions inside `ACT-STR-007` (hold) and `ACT-STR-008` (confirm). No cross-service REST call between appointment and bay scheduling.
- **ACT-APT-003**: Get Appointment Booking Details (`GET /api/v1/appointments/{id}`, CUSTOMER / STAFF) | SLO: < 25 ms.
  - Returns appointment status, store summary, vehicle snapshot, scheduled window, and services; **omits `assigned_bay_id` and `bay_number` for customer callers**.
- **ACT-APT-004**: Reschedule Service Appointment (`POST /api/v1/appointments/{id}/reschedule`, CUSTOMER / STAFF) | SLO: < 120 ms.
  - Single local ACID transaction inside `store-management`: validates new slot against store hours/closures, acquires new best-fit `bay_schedule_entries` row, releases previous bay entry (`RESCHEDULED`), updates `service_appointments`, and inserts `appointment_reschedule_logs` + `AppointmentRescheduledEvent` outbox record (Part 7 finalizes entitlement/reschedule matrix, `APT-11`).
- **ACT-APT-005**: Cancel Customer Appointment (`POST /api/v1/appointments/{id}/cancel`, CUSTOMER / STAFF) | SLO: < 60 ms.
  - Single local ACID transaction: guarded non-destructive transition to `CANCELLED`, releases active `bay_schedule_entries` (`CANCELLED`), and emits `AppointmentCancelledEvent` (`APT-12` refund/entitlement matrix finalized in Part 7).
- **ACT-APT-006**: Confirm Shop Walk-In Customer Intake (`POST /api/v1/appointments/walk-in`, STAFF) | SLO: < 70 ms.
  - Binds drive-in vehicle immediately to best-fit available service bay in one local ACID transaction.
- **ACT-APT-007**: Mark Appointment Vehicle Checked-In (`POST /api/v1/appointments/{id}/check-in`, STAFF) | SLO: < 40 ms.
  - Technician scans customer QR / looks up name; transitions `CONFIRMED -> CHECKED_IN`.
- **ACT-APT-008**: Query Customer Upcoming Appointments (`GET /api/v1/appointments/customer/{customerId}`, CUSTOMER) | SLO: < 30 ms.
  - Returns customer appointments ordered by `scheduled_start`; **never exposes `assigned_bay_id` or `bay_number`**.
- **ACT-APT-009**: Dispatch Automated Appointment Reminder (`AppointmentReminderJob`, `NO HTTP ENDPOINT`, Cron every 15m)
  - Queries `CONFIRMED` appointments scheduled in next 24h & 2h; dispatches SMS/email via `notification` (`APT-13`).
- **ACT-APT-010**: Redeem `SCHEDULE_LATER` Service Entitlement (`POST /api/v1/appointments/entitlements/redeem`, CUSTOMER) | SLO: < 120 ms.
  - **Request Headers**: `Idempotency-Key: {uuid}`, `Authorization: Bearer {jwt}`
  - **Request Body** *(no `bay_id` accepted)*:
    ```json
    {
      "redemption_token": "ent_tok_998877",
      "store_id": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
      "requested_slot": {
        "start_time": "2026-11-28T10:00:00Z",
        "end_time": "2026-11-28T11:00:00Z"
      }
    }
    ```
  - **Response (`201 Created`)** *(no `bay_id` or `bay_number` exposed)*:
    ```json
    {
      "appointment_id": "apt-9988-7766",
      "redemption_attempt_id": "att-4455-6677",
      "status": "CONFIRMED",
      "booking_pass_url": "/passes/apt-9988-7766"
    }
    ```
  - **Fenced Coordination Protocol & Part 7 Dependencies (`APT-01`–`APT-10`, owned by `store-management`)**:
    1. *Durable Attempt*: `store-management` persists `redemption_attempt` (`PENDING_LOCK`, `lease_deadline = clock_timestamp() + INTERVAL '15 min'`).
    2. *Fenced Lease Lock*: Calls `automotive-operations` `POST /api/v1/automotive/operations/entitlements/{token}/lock-for-redemption` with `attempt_id` and monotonic `fencing_token` (CAS on `status = 'ISSUED'` or expired `REDEMPTION_PENDING`; returns `409` on active conflict).
    3. *Local ACID Bay + Appointment Hold*: Inside `store_management_db`, `store-management` selects best-fit bay and inserts `bay_schedule_entries` (`HELD`) + `service_appointments` (`PENDING_ENTITLEMENT_CONFIRMATION`). If unavailable, releases entitlement lock in `automotive-operations`.
    4. *Commit Entitlement*: Calls `automotive-operations` `POST .../commit-redemption` with `attempt_id` and `fencing_token` (`REDEMPTION_PENDING -> REDEEMED`; stale fencing token rejected with `409`).
    5. *Local ACID Confirm & Crash Reconciliation*: `store-management` transitions local `bay_schedule_entries` and `service_appointments` to `CONFIRMED` in one local TX. `AppointmentRedemptionReconciliationJob` sweeps `PENDING_*` attempts past lease deadline. *(Full state matrix, refund/cancellation rules, and `redemption_attempt` DDL finalized in Part 7: `APT-01`–`APT-13`.)*

---

## 4. Target Consolidation Migration Plan (`appointment` :8097 → `store-management` :8098 — `P5-DEC-11`)

*(Documentation-only roadmap; **do not** delete `backend/services/appointment/` during Part 5.)*
1. **Database & Flyway**: Move `service_appointments`, `appointment_services`, and `appointment_reschedule_logs` into `store_management` Flyway migrations (`store_management_db`); retire `appointment_db`, `appointment_migrator`, and `appointment_app` roles.
2. **Endpoints & Clients**: Serve `/api/v1/stores/{storeId}/appointments/**` and `/api/v1/appointments/**` from `store-management` (:8098); update APISIX ingress routes and `automotive-operations` Spring HTTP client base URL from `appointment:8097` to `store-management:8098`.
3. **Events & Saga**: Update `AppointmentConfirmedEvent`, `AppointmentRescheduledEvent`, `AppointmentCancelledEvent` producer from `appointment` to `store-management` on `tirestore.events`. `automotive-operations` Saga calls `store-management` once for atomic bay+appointment hold/confirm.
4. **Kubernetes & Build**: Retire `appointment` Deployment/Service/Helm values and port `8097` in Phase 3; retain `7` independent Gradle projects.
