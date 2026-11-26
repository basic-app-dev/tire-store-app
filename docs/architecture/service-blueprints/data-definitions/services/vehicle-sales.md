# Physical Data Architecture Specification: `vehicle-sales`

> **Service Identity**: `vehicle-sales` (Port 8093)
> **Status**: AUTHORITATIVE IMPLEMENTATION SPECIFICATION (Phase 2F-C)
> **Primary Storage**: PostgreSQL (deals, sales contracts, holding deposits, outbox) + S3 (signed contract PDFs)
> **Logical Database**: `vehicle_sales_db` | **Database Schema**: `vehicle_sales`
> **Flyway & Role Ownership (`OPS-01`)**: `spring.flyway.schemas=vehicle_sales`, `spring.flyway.default-schema=vehicle_sales`; migration role `vehicle_sales_migrator` (DDL on `vehicle_sales` only), runtime role `vehicle_sales_app` (DML only, zero cross-DB/schema grants).

---

## 1. Relational DDL Specifications

```sql
CREATE TABLE vehicle_sales.sales_deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_number VARCHAR(32) NOT NULL UNIQUE,
    customer_id UUID NOT NULL,
    vehicle_vin CHAR(17) NOT NULL,
    store_id UUID NOT NULL,
    salesperson_id UUID NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'INQUIRY',
    negotiated_price_cents INTEGER NOT NULL CHECK (negotiated_price_cents > 0),
    trade_in_credit_cents INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_deal_status CHECK (status IN (
        'INQUIRY', 'TEST_DRIVE_SCHEDULED', 'DEPOSIT_HELD',
        'CONTRACT_PENDING', 'CONTRACT_SIGNED', 'FUNDED', 'DELIVERED', 'CANCELLED'
    ))
);

CREATE TABLE vehicle_sales.holding_deposits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID NOT NULL REFERENCES vehicle_sales.sales_deals(id) ON DELETE CASCADE,
    vehicle_vin CHAR(17) NOT NULL,
    customer_id UUID NOT NULL,
    amount_cents INTEGER NOT NULL DEFAULT 50000,
    status VARCHAR(32) NOT NULL DEFAULT 'HELD',
    payment_intent_id VARCHAR(128) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_deposit_status CHECK (status IN ('HELD', 'APPLIED_TO_SALE', 'REFUNDED', 'FORFEITED'))
);

CREATE TABLE vehicle_sales.sales_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID NOT NULL UNIQUE REFERENCES vehicle_sales.sales_deals(id),
    contract_pdf_s3_key VARCHAR(255) NOT NULL,
    odometer_reading INTEGER NOT NULL,
    customer_signed_at TIMESTAMPTZ NULL,
    dealer_signed_at TIMESTAMPTZ NULL,
    docusign_envelope_id VARCHAR(128) NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'DRAFT'
);
```

---

## Local Outbox & Consumer Inbox Tables (`vehicle_sales`)
- **Messaging Role**: **Producer**
- **Service-Owned Flyway Instantiation**: Instantiates `vehicle_sales.outbox_event` (produces `VehicleDepositHeldEvent`, `VehicleSoldEvent`) via `backend/services/vehicle-sales/src/main/resources/db/migration/V*.sql` (add `vehicle_sales.consumer_inbox` only if future deal workflows subscribe to external broker events).
- **Canonical Schema Reference**: Follow the exact `outbox_event` / `consumer_inbox` DDL, T1/T2/T3 boundaries, and retry rules in [`../events-and-projections.md`](../events-and-projections.md) (no shared cross-service tables; DDL is instantiated in `vehicle_sales` within `vehicle_sales_db`).
