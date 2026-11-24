# Physical Data Architecture Specification: `vehicle-sales`

> **Service Identity**: `vehicle-sales` (Port 8093)
> **Status**: AUTHORITATIVE IMPLEMENTATION SPECIFICATION (Phase 2F-C)
> **Primary Storage**: PostgreSQL (deals, sales contracts, holding deposits, outbox) + S3 (signed contract PDFs)
> **Database Schema**: `vehicle_sales`

---

## 1. Relational DDL Specifications

```sql
CREATE TABLE sales_deals (
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

CREATE TABLE holding_deposits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID NOT NULL REFERENCES sales_deals(id) ON DELETE CASCADE,
    vehicle_vin CHAR(17) NOT NULL,
    customer_id UUID NOT NULL,
    amount_cents INTEGER NOT NULL DEFAULT 50000,
    status VARCHAR(32) NOT NULL DEFAULT 'HELD',
    payment_intent_id VARCHAR(128) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_deposit_status CHECK (status IN ('HELD', 'APPLIED_TO_SALE', 'REFUNDED', 'FORFEITED'))
);

CREATE TABLE sales_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID NOT NULL UNIQUE REFERENCES sales_deals(id),
    contract_pdf_s3_key VARCHAR(255) NOT NULL,
    odometer_reading INTEGER NOT NULL,
    customer_signed_at TIMESTAMPTZ NULL,
    dealer_signed_at TIMESTAMPTZ NULL,
    docusign_envelope_id VARCHAR(128) NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'DRAFT'
);
```
