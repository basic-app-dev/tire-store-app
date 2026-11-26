# Physical Data Architecture Specification: `vehicle-product`

> **Service Identity**: `vehicle-product` (Port 8094)
> **Status**: AUTHORITATIVE IMPLEMENTATION SPECIFICATION (Phase 2F-C)
> **Primary Storage**: PostgreSQL (vehicles, inspections, holds, listings, photos) + S3 (photo media)
> **Logical Database**: `vehicle_product_db` | **Database Schema**: `vehicle_product`
> **Flyway & Role Ownership (`OPS-01`)**: `spring.flyway.schemas=vehicle_product`, `spring.flyway.default-schema=vehicle_product`; migration role `vehicle_product_migrator` (DDL on `vehicle_product` only), runtime role `vehicle_product_app` (DML only, zero cross-DB/schema grants).

---

## 1. Relational DDL Specifications

```sql
CREATE TABLE vehicle_product.vin_vehicles (
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

CREATE TABLE vehicle_product.vin_sales_holds (
    vin CHAR(17) PRIMARY KEY REFERENCES vehicle_product.vin_vehicles(vin),
    deal_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE vehicle_product.mechanical_inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vin CHAR(17) NOT NULL REFERENCES vehicle_product.vin_vehicles(vin) ON DELETE CASCADE,
    technician_id UUID NOT NULL,
    passed_150_point BOOLEAN NOT NULL DEFAULT FALSE,
    inspection_report JSONB NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## Local Outbox & Consumer Inbox Tables (`vehicle_product`)
- **Messaging Role**: **Consumer (Primary) / Producer (Optional)**
- **Service-Owned Flyway Instantiation**: Instantiates `vehicle_product.consumer_inbox` (consumes `VehicleDepositHeldEvent`, `VehicleSoldEvent`) via `backend/services/vehicle-product/src/main/resources/db/migration/V*.sql` (instantiate `vehicle_product.outbox_event` if vehicle listing/inspection domain events are emitted).
- **Canonical Schema Reference**: Follow the exact `outbox_event` / `consumer_inbox` DDL, T1/T2/T3 boundaries, and retry rules in [`../events-and-projections.md`](../events-and-projections.md) (no shared cross-service tables; DDL is instantiated in `vehicle_product` within `vehicle_product_db`).
