# Microservice Architecture Specification: `appointment`

> **Service Identity**: `appointment` (Port 8097)
> **Status**: AUTHORITATIVE IMPLEMENTATION SPECIFICATION (Phase 2F-B-R2)
> **Primary Authority**: Customer Appointments, Service Bookings, Rescheduling, Shop Check-Ins & Schedule-Later Entitlements
> **Storage**: PostgreSQL (appointments, booking passes, schedule logs)
> **Consolidated Modules**: 2 Substantive Modules
> **Total Activities Owned**: 10 Activities (`ACT-APT-001` through `ACT-APT-010`)
> **Total Unique HTTP Endpoints**: 9 Endpoints (9 HTTP routes + 1 background daemon)

---

## 1. Domain Boundary & Module Architecture

`appointment` manages the customer booking lifecycle, coordinating directly with `store-management` for physical service bay reservations.

```
appointment (Port 8097)
├── management/   # MODULE 1: Appointment Management Module (9 activities: ACT-APT-001, 003..009, 010)
└── scheduling/   # MODULE 2: Scheduling & Capacity Integration Module (1 activity: ACT-APT-002)
```

---

## 2. Business Entities & State Machine Transitions

### 2.1 Core Entities
1. `service_appointment`: `id`, `appointment_number`, `customer_id`, `store_id`, `order_id`, `scheduled_start`, `scheduled_end`, `status`, `bay_reservation_id`.
2. `service_entitlement`: `id`, `order_item_id`, `customer_id`, `service_item_id`, `redemption_token`, `status`, `expires_at`.

### 2.2 Appointment Lifecycle
```text
Appointment Lifecycle:
  [PENDING_CAPACITY_HOLD] --> [PENDING_ENTITLEMENT_CONFIRMATION] --> [CONFIRMED] --> [CHECKED_IN] --> [COMPLETED]
           |                                     |                         |
           +--> [ABORTED_HOLD_FAILED]            +--> [ABORTED_LOCK_LOST]  +--> [RESCHEDULED]
                                                                           +--> [CANCELLED]
```

---

## 3. Module Specifications & Business Activities

### 3.1 Module 1: Appointment Management Module
- **ACT-APT-001**: Search Available Appointment Slots
  - **HTTP Method & Path**: `GET /api/v1/appointments/availability` (Visibility: PUBLIC / CUSTOMER)
  - **Query Params**: `store_id`, `service_code`, `date_from`, `date_to`
  - **Algorithm**: Queries `store-management` (:8098) for compatible service bay schedules; calculates available overlapping time windows. | SLO: < 45 ms.
- **ACT-APT-003**: Get Appointment Booking Details
  - **HTTP Method & Path**: `GET /api/v1/appointments/{id}` (Visibility: CUSTOMER / STAFF) | SLO: < 25 ms.
- **ACT-APT-004**: Reschedule Service Appointment
  - **HTTP Method & Path**: `POST /api/v1/appointments/{id}/reschedule` (Visibility: CUSTOMER / STAFF)
  - **Algorithm**: Two-phase move: requests new bay reservation from `store-management`; on success, updates appointment start/end and releases old bay hold. | SLO: < 120 ms.
- **ACT-APT-005**: Cancel Customer Appointment
  - **HTTP Method & Path**: `POST /api/v1/appointments/{id}/cancel` (Visibility: CUSTOMER / STAFF)
  - **Algorithm**: Transitions appointment to `CANCELLED`; calls `DELETE /api/v1/stores/bays/reservations/{bay_res_id}`. | SLO: < 60 ms.
- **ACT-APT-006**: Confirm Shop Walk-In Customer Intake
  - **HTTP Method & Path**: `POST /api/v1/appointments/walk-in` (Visibility: STAFF)
  - **Algorithm**: Binds drive-in vehicle immediately to first available service bay. | SLO: < 70 ms.
- **ACT-APT-007**: Mark Appointment Vehicle Checked-In
  - **HTTP Method & Path**: `POST /api/v1/appointments/{id}/check-in` (Visibility: STAFF)
  - **Algorithm**: Technician scans customer QR / looks up name; transitions status to `CHECKED_IN`. | SLO: < 40 ms.
- **ACT-APT-008**: Query Customer Upcoming Appointments
  - **HTTP Method & Path**: `GET /api/v1/appointments/customer/{customerId}` (Visibility: CUSTOMER) | SLO: < 30 ms.
- **ACT-APT-009**: Dispatch Automated Appointment Reminder
  - **Trigger**: Cron every 15m (`AppointmentReminderJob`).
  - **Endpoint**: `NO HTTP ENDPOINT` (Internal Background Daemon).
  - **Algorithm**: Queries appointments scheduled in next 24h & 2h; dispatches SMS/email via `notification`.
- **ACT-APT-010**: Redeem Schedule-Later Service Entitlement (Two-Phase Coordination)
  - **HTTP Method & Path**: `POST /api/v1/appointments/entitlements/redeem` (Visibility: CUSTOMER)
  - **Request Headers**: `Idempotency-Key: {uuid}`, `Authorization: Bearer {jwt}`
  - **Request Body**:
    ```json
    {
      "redemption_token": "ent_tok_998877",
      "store_id": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
      "requested_slot": {
        "bay_id": "3a4b5c6d-7e8f-9a0b-1c2d-3e4f5a6b7c8d",
        "start_time": "2026-11-28T10:00:00Z",
        "end_time": "2026-11-28T11:00:00Z"
      }
    }
    ```
  - **Response**: `201 Created`
    ```json
    {
      "appointment_id": "apt-9988-7766",
      "redemption_attempt_id": "att-4455-6677",
      "status": "CONFIRMED",
      "booking_pass_url": "/passes/apt-9988-7766"
    }
    ```
  - **Coordination Protocol (Saga Orchestration with Durable Leases & Fencing - No 2PC/XA)**:
    1. *Durable Attempt Creation*: `appointment` generates `redemption_attempt_id` and stores record in `redemption_attempt` table (PostgreSQL) with `status = PENDING_LOCK`, `attempt_version = 1`, and `lease_deadline = NOW() + INTERVAL '15 min'`.
    2. *Step 1 (Fenced Lease Lock in Operations)*: Calls `POST /api/v1/automotive/operations/entitlements/{token}/lock-for-redemption` with `attempt_id`, `fencing_token = epoch_millis`, and 15m lease. `automotive-operations` executes atomic CAS:
       ```sql
       UPDATE service_entitlements
       SET status = 'REDEMPTION_PENDING',
           locked_by_attempt_id = :attemptId,
           fencing_token = :fencingToken,
           lease_expires_at = NOW() + INTERVAL '15 min',
           version = version + 1
       WHERE redemption_token = :token
         AND (status = 'ISSUED' OR (status = 'REDEMPTION_PENDING' AND lease_expires_at < NOW()));
       ```
       If 0 rows updated (e.g. already `REDEEMED`, `REFUNDED`, or locked by an active unexpired attempt), returns HTTP 409 Conflict.
    2b. *Stale Attempt Rejection*: When committing redemption (`Step 4`), operations validates both token and fencing token:
       ```sql
       UPDATE service_entitlements
       SET status = 'REDEEMED',
           redeemed_appointment_id = :appointmentId,
           updated_at = NOW()
       WHERE redemption_token = :token
         AND status = 'REDEMPTION_PENDING'
         AND locked_by_attempt_id = :attemptId
         AND fencing_token = :fencingToken;
       ```
       If an earlier attempt timed out and a newer attempt acquired a higher fencing token, the stale commit updates 0 rows and is rejected with HTTP 409 Stale Lease.
    3. *Step 2 (Reserve Bay Hold)*: `appointment` calls `store-management` (`POST /api/v1/stores/bays/reservations`). If slot unavailable, calls operations to release lock (`POST .../release-redemption-lock`) and transitions attempt to `ABORTED_SLOT_UNAVAILABLE`.
    4. *Step 3 (Local Persistence in Pending State)*: Inserts `service_appointment` with `status = 'PENDING_ENTITLEMENT_CONFIRMATION'` and `bay_reservation_id`.
    5. *Step 4 (Commit Entitlement in Operations)*: Calls `POST /api/v1/automotive/operations/entitlements/{token}/commit-redemption` passing `attempt_id` and `fencing_token`. Operations validates fencing token, transitions `status: REDEMPTION_PENDING -> REDEEMED`, binds `redeemed_appointment_id`, and returns HTTP 200 OK.
    6. *Step 5 (Confirm Bay & Confirm Appointment)*: `appointment` calls `store-management` to confirm bay (`POST .../confirm`), then updates local appointment `status: PENDING_ENTITLEMENT_CONFIRMATION -> CONFIRMED`.
    7. *Timeout & Crash Reconciliation*: If `appointment` crashes or network times out:
       - `AppointmentRedemptionReconciliationJob` sweeps attempts stuck in `PENDING_*` past lease deadline.
       - If Operations committed the entitlement, appointment resumes confirmation.
       - If Operations did not commit, appointment marks attempt `FAILED`, releases bay hold in store-management, and unlocks entitlement in operations back to `ISSUED`. | SLO: < 120 ms.

---

### 3.2 Module 2: Scheduling & Capacity Integration Module
- **ACT-APT-002**: Book Service Appointment & Coordinate Bay Hold
  - **HTTP Method & Path**: `POST /api/v1/appointments` (Visibility: CUSTOMER / SAGA)
  - **Request Body**:
    ```json
    {
      "order_id": "ord-20261123-0091",
      "store_id": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
      "bay_reservation_id": "bay-res-5544-3322",
      "scheduled_start": "2026-11-25T14:00:00Z",
      "scheduled_end": "2026-11-25T15:00:00Z"
    }
    ```
  - **Response**: `201 Created` with appointment ID and booking pass. | SLO: < 110 ms.
