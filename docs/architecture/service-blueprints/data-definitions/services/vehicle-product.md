# Physical Data Architecture Specification: `vehicle-product`

> **Service Identity**: `vehicle-product` (Port 8094)
> **Status**: AUTHORITATIVE IMPLEMENTATION SPECIFICATION (Phase 2F-C)
> **Primary Storage**: PostgreSQL (vehicles, inspections, holds, listings, photos) + S3 (photo media)
> **Database Schema**: `vehicle_product`

---

## 1. Relational DDL Specifications

```sql
CREATE TABLE vin_vehicles (
    vin CHAR(17) PRIMARY KEY,
    store_id UUID NOT NULL,
    year INTEGER NOT NULL CHECK (year BETWEEN 1990 AND 2030),
    make VARCHAR(64) NOT NULL,
    model VARCHAR(64) NOT NULL,
    trim VARCHAR(64) NULL,
    mileage INTEGER NOT NULL CHECK (mileage >= 0),
    exterior_color VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'INGESTED',
    listing_price_cents INTEGER NOT NULL CHECK (listing_price_cents > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_vehicle_status CHECK (status IN (
        'INGESTED', 'INSPECTION_PENDING', 'RECONDITIONING',
        'LISTED', 'DEPOSIT_HOLD', 'SALE_PENDING', 'SOLD', 'WHOLESALE'
    ))
);

CREATE TABLE vin_sales_holds (
    vin CHAR(17) PRIMARY KEY REFERENCES vin_vehicles(vin),
    deal_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE mechanical_inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vin CHAR(17) NOT NULL REFERENCES vin_vehicles(vin) ON DELETE CASCADE,
    technician_id UUID NOT NULL,
    passed_150_point BOOLEAN NOT NULL DEFAULT FALSE,
    inspection_report JSONB NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```
