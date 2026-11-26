# Physical Data Architecture Specification: `notification`

> **Service Identity**: `notification` (Port 8095)
> **Status**: AUTHORITATIVE IMPLEMENTATION SPECIFICATION (Phase 2F-C)
> **Primary Storage**: PostgreSQL (templates, preferences, delivery attempts, requests)
> **Logical Database**: `notification_db` | **Database Schema**: `notification`
> **Flyway & Role Ownership (`OPS-01`)**: `spring.flyway.schemas=notification`, `spring.flyway.default-schema=notification`; migration role `notification_migrator` (DDL on `notification` only), runtime role `notification_app` (DML only, zero cross-DB/schema grants).

---

## 1. Relational DDL Specifications

```sql
CREATE TABLE notification.notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_code VARCHAR(64) NOT NULL UNIQUE,
    channel VARCHAR(16) NOT NULL CHECK (channel IN ('SMS', 'EMAIL', 'PUSH')),
    subject_template TEXT NULL,
    body_template TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE notification.customer_preferences (
    customer_id UUID PRIMARY KEY,
    sms_opt_in BOOLEAN NOT NULL DEFAULT TRUE,
    email_opt_in BOOLEAN NOT NULL DEFAULT TRUE,
    push_opt_in BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notification.delivery_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL,
    channel VARCHAR(16) NOT NULL,
    recipient_address VARCHAR(255) NOT NULL,
    provider_name VARCHAR(32) NOT NULL,
    provider_message_id VARCHAR(128) NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'QUEUED',
    error_message TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_delivery_status CHECK (status IN ('QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED'))
);

CREATE INDEX idx_delivery_audit ON notification.delivery_attempts (customer_id, created_at DESC);
```

---

## Local Outbox & Consumer Inbox Tables (`notification`)
- **Messaging Role**: **Consumer**
- **Service-Owned Flyway Instantiation**: Instantiates `notification.consumer_inbox` (consumes `OrderConfirmedEvent`, `OrderCancelledEvent`, `QuoteApprovedEvent`, `WorkOrderCompletedEvent`, `AppointmentConfirmedEvent`, `AppointmentRescheduledEvent`, `VehicleDepositHeldEvent`, `VehicleSoldEvent`) via `backend/services/notification/src/main/resources/db/migration/V*.sql` (instantiate `notification.outbox_event` only if emitting delivery-status domain events).
- **Canonical Schema Reference**: Follow the exact `outbox_event` / `consumer_inbox` DDL, T1/T2/T3 boundaries, and retry rules in [`../events-and-projections.md`](../events-and-projections.md) (no shared cross-service tables; DDL is instantiated in `notification` within `notification_db`).
