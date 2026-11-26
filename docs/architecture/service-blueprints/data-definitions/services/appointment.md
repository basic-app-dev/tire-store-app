# Physical Data Architecture Specification: `appointment`

> **Service Identity**: `appointment` (Port 8097)
> **Status**: AUTHORITATIVE IMPLEMENTATION SPECIFICATION (Phase 2F-C-R)
> **Primary Storage**: PostgreSQL (appointments, reschedule history)
> **Logical Database**: `appointment_db` | **Database Schema**: `appointment`
> **Flyway & Role Ownership (`OPS-01`)**: `spring.flyway.schemas=appointment`, `spring.flyway.default-schema=appointment`; migration role `appointment_migrator` (DDL on `appointment` only), runtime role `appointment_app` (DML only, zero cross-DB/schema grants).
> **Entitlement Architecture**: Authoritative purchased service entitlements (`service_entitlements`) reside strictly in `automotive-operations`. `appointment` coordinates the customer booking and redemption flow by validating the token idempotently with `automotive-operations` (`POST /api/v1/automotive/operations/entitlements/redeem`) before confirming the appointment.

---

## 1. Relational DDL Specifications

```sql
CREATE TABLE appointment.service_appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_number VARCHAR(32) NOT NULL UNIQUE,
    customer_id UUID NOT NULL,
    store_id UUID NOT NULL,
    order_id UUID NULL,
    bay_reservation_id UUID NOT NULL,
    entitlement_token VARCHAR(128) NULL,
    scheduled_start TIMESTAMPTZ NOT NULL,
    scheduled_end TIMESTAMPTZ NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'SCHEDULED',
    customer_vehicle_summary JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT chk_appt_status CHECK (status IN (
        'SCHEDULED', 'CONFIRMED', 'CHECKED_IN',
        'IN_SERVICE', 'COMPLETED', 'CANCELLED', 'NO_SHOW'
    )),
    CONSTRAINT chk_appt_duration CHECK (scheduled_end > scheduled_start)
);

CREATE INDEX idx_appts_store_schedule ON appointment.service_appointments (store_id, scheduled_start);
CREATE INDEX idx_appts_customer ON appointment.service_appointments (customer_id, scheduled_start DESC);
CREATE INDEX idx_appts_order ON appointment.service_appointments (order_id) WHERE order_id IS NOT NULL;
CREATE UNIQUE INDEX idx_appts_active_entitlement ON appointment.service_appointments (entitlement_token)
WHERE entitlement_token IS NOT NULL AND status NOT IN ('CANCELLED', 'NO_SHOW');

CREATE TABLE appointment.appointment_reschedule_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL REFERENCES appointment.service_appointments(id) ON DELETE RESTRICT,
    previous_start TIMESTAMPTZ NOT NULL,
    previous_end TIMESTAMPTZ NOT NULL,
    new_start TIMESTAMPTZ NOT NULL,
    new_end TIMESTAMPTZ NOT NULL,
    previous_bay_reservation_id UUID NOT NULL,
    new_bay_reservation_id UUID NOT NULL,
    rescheduled_by VARCHAR(64) NOT NULL,
    rescheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 2. Idempotent Entitlement Redemption Workflow (`ACT-APT-010`)

When a customer redeems a `SCHEDULE_LATER` entitlement:
1. Customer enters redemption token and target time slot.
2. `appointment` initiates local transaction: inserts draft appointment in state `SCHEDULED` referencing `entitlement_token`.
3. `appointment` requests bay reservation hold from `store-management` (:8098).
4. `appointment` calls `automotive-operations` (:8091) `POST /api/v1/automotive/operations/entitlements/redeem` (passing token, appointment_id, idempotency_key).
5. `automotive-operations` conditionally transitions entitlement from `ENTITLED_UNSCHEDULED` to `REDEEMED`. If already redeemed or refunded, returns HTTP 409 Conflict.
6. Upon confirmation from `automotive-operations`, `appointment` commits appointment status `CONFIRMED`.
7. If `automotive-operations` rejects the token or refunds in-flight, `appointment` releases the bay hold and marks appointment `CANCELLED`.

---

## Local Outbox & Consumer Inbox Tables (`appointment`)
- **Messaging Role**: **Producer & Consumer**
- **Service-Owned Flyway Instantiation**: Instantiates both `appointment.outbox_event` (produces `AppointmentConfirmedEvent`, `AppointmentRescheduledEvent`) and `appointment.consumer_inbox` (consumes `ServiceDefinitionChangedEvent`, `StoreOfferingChangedEvent`) via `backend/services/appointment/src/main/resources/db/migration/V*.sql`.
- **Canonical Schema Reference**: Follow the exact `outbox_event` / `consumer_inbox` DDL, T1/T2/T3 boundaries, and retry rules in [`../events-and-projections.md`](../events-and-projections.md) (no shared cross-service tables; DDL is instantiated in `appointment` within `appointment_db`).
