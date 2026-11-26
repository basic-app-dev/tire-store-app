# Physical Data Architecture Specification: `identity-access`

> **Service Identity**: `identity-access` (Port 8096)
> **Status**: AUTHORITATIVE IMPLEMENTATION SPECIFICATION (Phase 2F-C)
> **Primary Storage**: PostgreSQL (profiles, store roles, virtual garage)
> **Logical Database**: `identity_access_db` | **Database Schema**: `identity_access`
> **Flyway & Role Ownership (`OPS-01`)**: `spring.flyway.schemas=identity_access`, `spring.flyway.default-schema=identity_access`; migration role `identity_access_migrator` (DDL on `identity_access` only), runtime role `identity_access_app` (DML only, zero cross-DB/schema grants).

---

## 1. Relational DDL Specifications

```sql
CREATE TABLE identity_access.user_profiles (
    id UUID PRIMARY KEY, -- Keycloak sub UUID
    email VARCHAR(255) NOT NULL UNIQUE,
    first_name VARCHAR(64) NOT NULL,
    last_name VARCHAR(64) NOT NULL,
    phone_number VARCHAR(32) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE identity_access.store_role_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES identity_access.user_profiles(id) ON DELETE CASCADE,
    store_id UUID NOT NULL,
    role_name VARCHAR(32) NOT NULL CHECK (role_name IN ('shop_worker', 'store_manager')),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_store_role UNIQUE (user_id, store_id, role_name)
);

CREATE TABLE identity_access.customer_garage_vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES identity_access.user_profiles(id) ON DELETE CASCADE,
    year INTEGER NOT NULL CHECK (year BETWEEN 1990 AND 2030),
    make VARCHAR(64) NOT NULL,
    model VARCHAR(64) NOT NULL,
    trim VARCHAR(64) NULL,
    license_plate VARCHAR(16) NULL,
    vin CHAR(17) NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_garage_customer ON identity_access.customer_garage_vehicles (customer_id);
```

---

## Local Outbox & Consumer Inbox Tables (`identity_access`)
- **Messaging Role**: **Producer & Consumer**
- **Service-Owned Flyway Instantiation**: Instantiates `identity_access.outbox_event` and `identity_access.consumer_inbox` via `backend/services/identity-access/src/main/resources/db/migration/V*.sql` for identity/role/garage synchronization events.
- **Canonical Schema Reference**: Follow the exact `outbox_event` / `consumer_inbox` DDL, T1/T2/T3 boundaries, and retry rules in [`../events-and-projections.md`](../events-and-projections.md) (no shared cross-service tables; DDL is instantiated in `identity_access` within `identity_access_db`).
