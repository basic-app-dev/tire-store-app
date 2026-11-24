# Physical Data Architecture Specification: `identity-access`

> **Service Identity**: `identity-access` (Port 8096)
> **Status**: AUTHORITATIVE IMPLEMENTATION SPECIFICATION (Phase 2F-C)
> **Primary Storage**: PostgreSQL (profiles, store roles, virtual garage)
> **Database Schema**: `identity_access`

---

## 1. Relational DDL Specifications

```sql
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY, -- Keycloak sub UUID
    email VARCHAR(255) NOT NULL UNIQUE,
    first_name VARCHAR(64) NOT NULL,
    last_name VARCHAR(64) NOT NULL,
    phone_number VARCHAR(32) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE store_role_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    store_id UUID NOT NULL,
    role_name VARCHAR(32) NOT NULL CHECK (role_name IN ('shop_worker', 'store_manager')),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_store_role UNIQUE (user_id, store_id, role_name)
);

CREATE TABLE customer_garage_vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    year INTEGER NOT NULL CHECK (year BETWEEN 1990 AND 2030),
    make VARCHAR(64) NOT NULL,
    model VARCHAR(64) NOT NULL,
    trim VARCHAR(64) NULL,
    license_plate VARCHAR(16) NULL,
    vin CHAR(17) NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_garage_customer ON customer_garage_vehicles (customer_id);
```
