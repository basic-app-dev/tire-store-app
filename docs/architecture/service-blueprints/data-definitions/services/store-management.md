# Physical Data Architecture Specification: `store-management`

> **Service Identity**: `store-management` (Port 8098)
> **Status**: AUTHORITATIVE IMPLEMENTATION SPECIFICATION (Phase 2F-C-R)
> **Primary Storage**: PostgreSQL + PostGIS (stores, hours, service bays, GiST schedule entries)
> **Logical Database**: `store_management_db` | **Database Schema**: `store_management`
> **Flyway & Role Ownership (`OPS-01`)**: `spring.flyway.schemas=store_management`, `spring.flyway.default-schema=store_management`; migration role `store_management_migrator` (DDL on `store_management` only), runtime role `store_management_app` (DML only, zero cross-DB/schema grants).
> **Bay Scheduling Strategy Classification**: PROPOSED IMPLEMENTATION STRATEGY. The system models physical capacity using automated compatible bay assignment backed by PostgreSQL GiST range exclusions on `TSTZRANGE` with `btree_gist`. Customers choose appointment times, not physical bay numbers; the scheduler allocates an available compatible bay without risking overbooking.

---

## 1. Relational DDL Specifications

```sql
CREATE EXTENSION IF NOT EXISTS postgis SCHEMA store_management;
CREATE EXTENSION IF NOT EXISTS btree_gist SCHEMA store_management;

CREATE TABLE store_management.store_branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_number VARCHAR(16) NOT NULL UNIQUE,
    name VARCHAR(128) NOT NULL,
    address_line1 VARCHAR(255) NOT NULL,
    city VARCHAR(64) NOT NULL,
    state CHAR(2) NOT NULL,
    postal_code VARCHAR(16) NOT NULL,
    location_geog GEOGRAPHY(POINT, 4326) NOT NULL,
    phone VARCHAR(32) NOT NULL,
    timezone VARCHAR(64) NOT NULL DEFAULT 'America/New_York',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_store_location ON store_management.store_branches USING GIST (location_geog);

CREATE TABLE store_management.store_operating_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES store_management.store_branches(id) ON DELETE RESTRICT,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    open_time TIME NOT NULL,
    close_time TIME NOT NULL,
    is_closed BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT uq_store_day UNIQUE (store_id, day_of_week),
    CONSTRAINT chk_hours_valid CHECK (is_closed OR close_time > open_time)
);

CREATE TABLE store_management.service_bays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES store_management.store_branches(id) ON DELETE RESTRICT,
    bay_number INTEGER NOT NULL,
    bay_type VARCHAR(32) NOT NULL CHECK (bay_type IN ('STANDARD_LIFT', 'ALIGNMENT_RACK', 'HEAVY_DUTY')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_store_bay_number UNIQUE (store_id, bay_number)
);

CREATE TABLE store_management.bay_schedule_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bay_id UUID NOT NULL REFERENCES store_management.service_bays(id) ON DELETE RESTRICT,
    booked_period TSTZRANGE NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'HELD',
    order_id UUID NULL,
    idempotency_key UUID NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT chk_schedule_status CHECK (status IN ('HELD', 'BOOKED', 'RELEASED', 'CANCELLED')),
    CONSTRAINT chk_nonempty_interval CHECK (NOT isempty(booked_period) AND lower(booked_period) < upper(booked_period)),
    EXCLUDE USING GIST (bay_id WITH =, booked_period WITH &&)
    WHERE (status NOT IN ('RELEASED', 'CANCELLED'))
);

CREATE INDEX idx_schedule_janitor ON store_management.bay_schedule_entries (expires_at)
WHERE status = 'HELD';
CREATE INDEX idx_schedule_lookup ON store_management.bay_schedule_entries (bay_id, lower(booked_period));
```

---

## 2. Concurrency Safety, Non-Destructive Lifecycle & Recovery

1. **Foreign Key Integrity (`ON DELETE RESTRICT`)**: Prevents catastrophic cascading destruction of booking history if a store or service bay is retired.
2. **`TSTZRANGE` with `btree_gist`**: Preserves absolute UTC timezone offsets across all store branches, preventing DST or local clock shift anomalies.
3. **Partial GiST Exclusion**: Only active holds (`HELD`, `BOOKED`) participate in the exclusion check. Once released or cancelled, the entry remains in the database for auditing and historical schedule analysis without blocking new reservations.
4. **Expiration Janitor Algorithm**:
   ```sql
   UPDATE store_management.bay_schedule_entries
   SET status = 'RELEASED', updated_at = NOW()
   WHERE status = 'HELD' AND expires_at < NOW();
   ```

---

## Local Outbox & Consumer Inbox Tables (`store_management`)
- **Messaging Role**: **Producer & Consumer**
- **Service-Owned Flyway Instantiation**: Instantiates both `store_management.outbox_event` (produces `StoreOfferingChangedEvent`) and `store_management.consumer_inbox` (consumes `OrderCancelledEvent`, `AppointmentConfirmedEvent`, `AppointmentRescheduledEvent`) via `backend/services/store-management/src/main/resources/db/migration/V*.sql`.
- **Canonical Schema Reference**: Follow the exact `outbox_event` / `consumer_inbox` DDL, T1/T2/T3 boundaries, and retry rules in [`../events-and-projections.md`](../events-and-projections.md) (no shared cross-service tables; DDL is instantiated in `store_management` within `store_management_db`).
