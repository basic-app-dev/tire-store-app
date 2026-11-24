# Physical Data Architecture Specification: `automotive-operations`

> **Service Identity**: `automotive-operations` (Port 8091)
> **Status**: AUTHORITATIVE IMPLEMENTATION SPECIFICATION (Phase 2F-C)
> **Primary Storage**: PostgreSQL (orders, line items, checkout sagas, work orders, quotes, outbox) + Redis (active carts)
> **Database Schema**: `automotive_operations`
> **Owned Modules**: Cart & Checkout Module, Order & Commercial Fulfillment Module, Work Order & Workshop Execution Module

---

## 1. Entity-Relationship Model (Mermaid ERD)

```mermaid
erDiagram
    ORDER_RECORD ||--|{ ORDER_LINE_ITEM : contains
    ORDER_RECORD ||--o| CHECKOUT_SAGA_INSTANCE : orchestrates
    ORDER_RECORD ||--o{ WORK_ORDER : initiates
    WORK_ORDER ||--|{ WORK_ORDER_TASK : includes
    WORK_ORDER ||--o{ SUPPLEMENTAL_QUOTE : generates
    SUPPLEMENTAL_QUOTE ||--|{ QUOTE_LINE_ITEM : contains
    ORDER_RECORD ||--o{ PAYMENT_RECORD : charges

    ORDER_RECORD {
        uuid id PK
        varchar order_number UK
        uuid customer_id
        uuid store_id
        varchar status
        integer total_amount_cents
        char currency
        timestamptz created_at
    }

    ORDER_LINE_ITEM {
        uuid id PK
        uuid order_id FK
        uuid sellable_item_id
        varchar item_type
        varchar sku_code
        integer quantity
        integer unit_price_cents
        varchar booking_status
    }

    WORK_ORDER {
        uuid id PK
        varchar ticket_number UK
        uuid order_id
        uuid appointment_id
        uuid store_id
        varchar vehicle_vin
        varchar status
        uuid assigned_technician_id
        timestamptz created_at
    }

    WORK_ORDER_TASK {
        uuid id PK
        uuid work_order_id FK
        varchar task_name
        varchar status
        integer sequence
    }
```

---

## 2. PostgreSQL Relational DDL Specifications

### 2.1 Table: `orders`
```sql
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(32) NOT NULL UNIQUE,
    customer_id UUID NOT NULL,
    store_id UUID NOT NULL,
    status VARCHAR(32) NOT NULL,
    subtotal_cents INTEGER NOT NULL CHECK (subtotal_cents >= 0),
    tax_cents INTEGER NOT NULL CHECK (tax_cents >= 0),
    total_amount_cents INTEGER NOT NULL CHECK (total_amount_cents >= 0),
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    customer_email VARCHAR(255) NOT NULL,
    pickup_pin_hash VARCHAR(64) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT chk_order_status CHECK (status IN (
        'DRAFT', 'PENDING_PAYMENT', 'PAID', 'PROCESSING',
        'READY_FOR_PICKUP', 'FULFILLED', 'CANCELLED', 'REFUNDED'
    ))
);

CREATE INDEX idx_orders_customer ON orders (customer_id, created_at DESC);
CREATE INDEX idx_orders_store_status ON orders (store_id, status, created_at DESC);
```

### 2.2 Table: `order_items`
```sql
CREATE TABLE service_entitlements (
    redemption_token VARCHAR(128) PRIMARY KEY,
    order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL,
    service_item_id UUID NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'ISSUED',
    locked_by_attempt_id UUID NULL,
    fencing_generation BIGINT NOT NULL DEFAULT 1,
    lease_expires_at TIMESTAMPTZ NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    redeemed_appointment_id UUID NULL,
    redeemed_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT chk_entitlement_status CHECK (status IN ('ISSUED', 'REDEMPTION_PENDING', 'REDEEMED', 'EXPIRED', 'REFUNDED'))
);

CREATE INDEX idx_entitlement_customer ON service_entitlements (customer_id, status);

CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    sellable_item_id UUID NOT NULL,
    item_type VARCHAR(16) NOT NULL CHECK (item_type IN ('PRODUCT', 'SERVICE')),
    sku_code VARCHAR(64) NOT NULL,
    description VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
    total_price_cents INTEGER NOT NULL CHECK (total_price_cents >= 0),
    booking_status VARCHAR(32) NOT NULL DEFAULT 'NOT_APPLICABLE',
    CONSTRAINT chk_item_booking_status CHECK (booking_status IN (
        'NOT_APPLICABLE', 'ENTITLED_UNSCHEDULED', 'SCHEDULED', 'COMPLETED'
    ))
);

CREATE INDEX idx_order_items_order ON order_items (order_id);
```

### 2.2B Table: `checkout_attempt`
```sql
CREATE TABLE checkout_attempt (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id UUID NOT NULL,
    cart_version INTEGER NOT NULL,
    customer_id UUID NOT NULL,
    store_id UUID NOT NULL,
    idempotency_key UUID NOT NULL,
    payment_intent_id VARCHAR(128) NULL,
    status VARCHAR(32) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_checkout_attempt_status CHECK (status IN (
        'INITIATED', 'HOLDS_ACQUIRED', 'PAYMENT_PENDING',
        'AUTHORIZED', 'SETTLED', 'COMPLETED',
        'EXPIRED_UNAUTHORIZED', 'FAILED', 'CANCELLED'
    ))
);

-- Durable Idempotency Across Lifecycle: Preserves idempotent deduplication across both active and terminal attempts
CREATE UNIQUE INDEX idx_uk_checkout_idempotency_global
ON checkout_attempt (customer_id, idempotency_key);

-- Lifecycle-Wide Nonterminal Uniqueness: Prevents duplicate active attempts for the same customer cart partition
CREATE UNIQUE INDEX idx_uk_active_checkout_partition
ON checkout_attempt (customer_id, cart_id, store_id)
WHERE status IN ('INITIATED', 'HOLDS_ACQUIRED', 'PAYMENT_PENDING', 'AUTHORIZED');

-- Strict 1:1 mapping between external payment intent and checkout attempt
CREATE UNIQUE INDEX idx_uk_payment_intent_active
ON checkout_attempt (payment_intent_id)
WHERE payment_intent_id IS NOT NULL;
```

### 2.3 Table: `checkout_saga_instance`
```sql
CREATE TABLE checkout_saga_instance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL UNIQUE REFERENCES orders(id),
    current_step VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL,
    idempotency_key UUID NOT NULL UNIQUE,
    stock_reservation_id UUID NULL,
    bay_reservation_id UUID NULL,
    payment_intent_id VARCHAR(128) NULL,
    error_message TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_saga_status CHECK (status IN ('IN_PROGRESS', 'COMPLETED', 'FAILED', 'COMPENSATING', 'COMPENSATED'))
);

CREATE INDEX idx_saga_recovery ON checkout_saga_instance (status, updated_at)
WHERE status IN ('IN_PROGRESS', 'COMPENSATING');
```

### 2.4 Table: `work_orders` & `work_order_tasks`
```sql
CREATE TABLE work_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number VARCHAR(32) NOT NULL UNIQUE,
    order_id UUID NULL REFERENCES orders(id),
    appointment_id UUID NULL,
    store_id UUID NOT NULL,
    vehicle_vin CHAR(17) NOT NULL,
    status VARCHAR(32) NOT NULL,
    assigned_technician_id UUID NULL,
    customer_notes TEXT NULL,
    inspection_findings JSONB NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT chk_work_order_status CHECK (status IN (
        'CREATED', 'VEHICLE_CHECKED_IN', 'IN_PROGRESS',
        'PENDING_QUOTE_APPROVAL', 'QUOTE_APPROVED', 'COMPLETED', 'CANCELLED'
    ))
);

CREATE INDEX idx_work_orders_store_status ON work_orders (store_id, status);
CREATE INDEX idx_work_orders_vin ON work_orders (vehicle_vin);

CREATE TABLE work_order_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    service_item_id UUID NOT NULL,
    task_name VARCHAR(128) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    sequence INTEGER NOT NULL DEFAULT 1,
    technician_notes TEXT NULL,
    completed_at TIMESTAMPTZ NULL,
    CONSTRAINT chk_task_status CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'CANCELLED'))
);
```

### 2.5 Table: `supplemental_quotes`
```sql
CREATE TABLE supplemental_quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    revision_number INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING_CUSTOMER_APPROVAL',
    additional_labor_cents INTEGER NOT NULL DEFAULT 0,
    additional_parts_cents INTEGER NOT NULL DEFAULT 0,
    total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
    items JSONB NOT NULL,
    approval_token VARCHAR(128) NOT NULL UNIQUE,
    approved_at TIMESTAMPTZ NULL,
    approved_by VARCHAR(128) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_quote_status CHECK (status IN ('PENDING_CUSTOMER_APPROVAL', 'APPROVED', 'REJECTED', 'SUPERSEDED'))
);

CREATE UNIQUE INDEX idx_work_order_quote_rev ON supplemental_quotes (work_order_id, revision_number);
```

---

## 3. Redis Cart & Cache Data Modeling

### 3.1 Key Schema: Active Cart Document
- **Key Pattern**: `cart:{cart_id}` (e.g., `cart:7b8c9d0e-1f2a-3b4c-5d6e-7f8a9b0c1d2e`)
- **Redis Type**: String (Serialized JSON)
- **TTL**: 604,800 seconds (7 days for authenticated users) / 172,800 seconds (48 hours for guests). Refreshed on each mutation.
- **Value JSON Structure**:
  ```json
  {
    "cart_id": "7b8c9d0e-1f2a-3b4c-5d6e-7f8a9b0c1d2e",
    "version": 4,
    "user_id": "u9z8y7x6-5w4v-3u2t-1s0r-q9p8o7n6m5l4",
    "store_id": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
    "currency": "USD",
    "created_at": 1732400000,
    "updated_at": 1732400500,
    "items": [
      {
        "line_id": "li-01",
        "sku_id": "8a3e7b1a-4d2c-4b5a-9f8e-1b2c3d4e5f6a",
        "item_type": "PRODUCT",
        "title": "Michelin Defender 2 225/65R17",
        "quantity": 4,
        "store_id": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
        "unit_price_cents": 14999,
        "selected_vehicle": { "year": 2022, "make": "Toyota", "model": "RAV4", "trim": "XLE" }
      },
      {
        "line_id": "li-02",
        "sku_id": "srv-mount-balance-17",
        "item_type": "SERVICE",
        "title": "Tire Mounting & Balancing",
        "quantity": 4,
        "store_id": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
        "unit_price_cents": 2000,
        "linked_product_line_id": "li-01"
      }
    ]
  }
  ```

### 3.2 Key Schema: User-to-Cart Mapping
- **Key Pattern**: `user-cart:{user_id}`
- **Redis Type**: String (Contains UUID of current active cart)
- **TTL**: 604,800 seconds.

---

## 4. Local ACID Transaction Boundaries

1. **Checkout Initiation (`ACT-OPS-002`)**:
   `BEGIN` $	o$ Insert `orders` (status `PENDING_PAYMENT`) $	o$ Insert `order_items` (snapshot prices) $	o$ Insert `checkout_saga_instance` $	o$ Insert `outbox_event` $	o$ `COMMIT`. Remote HTTP calls to reserve stock and bays occur **outside** this SQL transaction.
2. **Supplemental Quote Approval (`ACT-OPS-022`)**:
   `BEGIN` $	o$ `SELECT * FROM supplemental_quotes WHERE id = :id FOR UPDATE` $	o$ Update quote status to `APPROVED` $	o$ Insert new `work_order_tasks` for authorized labor/parts $	o$ Insert `outbox_event` $	o$ `COMMIT`.
