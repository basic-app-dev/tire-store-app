# RabbitMQ Event Contracts, Transactional Outbox, and Read Projections

> **Status**: AUTHORITATIVE ASYNCHRONOUS INTEGRATION SPECIFICATION (Phase 2F-C)
> **Infrastructure Target**: RabbitMQ 3.13+ Topic Exchanges + PostgreSQL Transactional Outbox


### 1.3 Consumer Idempotency & Deduplication Inbox Schema
To guarantee at-least-once processing without duplicate side effects, consumers record processed `event_id`s in an inbox table:
```sql
CREATE TABLE consumer_inbox (
    event_id UUID PRIMARY KEY,
    event_type VARCHAR(128) NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```
Consumers check `SELECT 1 FROM consumer_inbox WHERE event_id = :event_id` within their local transaction. If present, the message is acknowledged and skipped.

---

## 1. Transactional Outbox Pattern & Event Dispatch

To ensure absolute atomicity between local business mutations and asynchronous domain event emission without 2PC, all microservices implement the Transactional Outbox pattern.

### 1.1 Outbox Schema (Standardized Across All 8 Services)
```sql
CREATE TABLE outbox_event (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type VARCHAR(64) NOT NULL,
    aggregate_id VARCHAR(64) NOT NULL,
    event_type VARCHAR(128) NOT NULL,
    payload JSONB NOT NULL,
    routing_key VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ NULL
);

CREATE INDEX idx_outbox_unpublished
ON outbox_event (created_at ASC)
WHERE published_at IS NULL;
```

### 1.2 Outbox Relay Execution Algorithm
1. Within the local business transaction (e.g., confirming an order), the service inserts the business state mutation and an `outbox_event` row.
2. A scheduled daemon (`TransactionalOutboxRelay`, with a proposed polling interval of 500ms pending production load profiling) executes:
   ```sql
   SELECT id, routing_key, payload
   FROM outbox_event
   WHERE published_at IS NULL
   ORDER BY created_at ASC
   FOR UPDATE SKIP LOCKED
   LIMIT 50;
   ```
3. The relay publishes each message to RabbitMQ topic exchange `tirestore.events` with delivery mode 2 (persistent).
4. Upon receiving publisher confirmation from RabbitMQ, the relay updates `published_at = NOW()` or deletes the row.

---

## 2. Standard Event Envelope & Message Schema

Every published event adheres to a strict JSON envelope:

```json
{
  "event_id": "e4f5a6b7-c8d9-40e1-a2b3-c4d5e6f7a8b9",
  "event_type": "OrderConfirmedEvent",
  "schema_version": "1.0",
  "aggregate_type": "ORDER",
  "aggregate_id": "ord-20261123-0091",
  "aggregate_version": 2,
  "timestamp": "2026-11-23T23:30:00Z",
  "correlation_id": "c7a8b9e0-1122-3344-5566-778899aabbcc",
  "causation_id": "req-9988-7766-5544",
  "producer_service": "automotive-operations",
  "data": {
    "order_id": "ord-20261123-0091",
    "customer_id": "cust-8877-6655",
    "store_id": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
    "total_cents": 64795,
    "currency": "USD",
    "line_items": [
      {
        "sku_code": "TIRE-225-65-17",
        "quantity": 4,
        "unit_price_cents": 14999
      }
    ]
  }
}
```

---

## 3. Catalog of Core Domain Events

| Event Name | Producer Service | Routing Key | Consumer Services | Business Trigger |
| :--- | :--- | :--- | :--- | :--- |
| **`ProductPriceChangedEvent`** | `automotive-product` | `catalog.product.price` | Operations, Web Cache | Base or store override price updated |
| **`StockAllocationConfirmedEvent`** | `automotive-product` | `inventory.stock.allocated` | Operations, Workshop | Checkout payment confirmed; stock allocated |
| **`OrderConfirmedEvent`** | `automotive-operations`| `order.commerce.confirmed` | Notification, Workshop, Garage| Payment captured; order finalized |
| **`OrderCancelledEvent`** | `automotive-operations`| `order.commerce.cancelled` | Product, Store, Notification | Customer cancel or saga compensation |
| **`QuoteApprovedEvent`** | `automotive-operations`| `workshop.quote.approved` | Notification, Technicians | Customer authorized supplemental repairs |
| **`WorkOrderCompletedEvent`** | `automotive-operations`| `workshop.order.completed` | Product, Notification, Invoicing| Shop labor finished; parts consumed |
| **`AppointmentConfirmedEvent`** | `appointment` | `appointment.booking.confirmed`| Notification, Store | Service bay booking finalized |
| **`AppointmentRescheduledEvent`**| `appointment` | `appointment.booking.rescheduled`| Notification, Store | Booking moved to new bay / time slot |
| **`VehicleDepositHeldEvent`** | `vehicle-sales` | `sales.vehicle.deposit_held` | Vehicle-Product, Notification | $500 deposit collected; VIN locked |
| **`VehicleSoldEvent`** | `vehicle-sales` | `sales.vehicle.sold` | Vehicle-Product, Public Listings| Contract executed; VIN marked SOLD |

---

## 4. Cross-Service Read Projections & Replication Boundaries

To prevent high-latency synchronous RPC fan-outs across the API Gateway during browsing and cart loading, carefully scoped read-only projections are permitted:

| Projection Target | Destination Service | Source Service | Copied Attributes | Synchronization Trigger | Stale Tolerance | Authoritative Authority |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Cart Product Display** | `automotive-operations` (Redis) | `automotive-product` | SKU name, brand, thumbnail URL, list price | Copied on item-add; revalidated on `/validate` | Max 24 hours | **NEVER authorizes checkout! Must revalidate.** |
| **Service Duration Cache** | `appointment` (Local Memory/PG) | `automotive-product` | Service code, estimated duration, required bay type | Consumes `ServiceDefinitionChangedEvent` | Max 6 hours | Authoritative for slot calculation only. |
| **Store Capability Projection**| `appointment` | `store-management` | Store ID, active bay count, alignment rack capability | Consumes `StoreOfferingChangedEvent` | Max 24 hours | Re-verified during bay reservation. |
| **Customer Garage Profile** | `automotive-operations` | `identity-access` | Vehicle ID, YMMT, license plate | Fetched on checkout initiation | Max 1 hour | Immutable snapshot on order. |

### Strict Projection Rules
1. **Never Authorize State Mutations**: A read projection is strictly for display and validation hints. **No financial charge, physical stock allocation, or contract finalization may be authorized from a projection.**
2. **Rebuild Strategy**: Every projection must maintain an automated bootstrap script or batch query that can reconstruct the local projection from the authoritative source database within 5 minutes.
