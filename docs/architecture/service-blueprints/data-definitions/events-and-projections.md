# RabbitMQ Event Contracts, Transactional Outbox, and Read Projections

> **Status**: AUTHORITATIVE PART 1 SPECIFICATION (Updated 2026-11-25 per `P1-DEC-01`–`P1-DEC-05`)
> **Infrastructure Target**: RabbitMQ 3.13+ Topic Exchange (`tirestore.events`) + PostgreSQL Transactional Outbox & Consumer Inbox
> **Delivery Guarantee**: At-least-once delivery (not exactly-once and not globally ordered). Historical references to `tire.store.events` in legacy audit docs are superseded (`tirestore.events` is canonical).

---

## 1. Transactional Outbox & Consumer Inbox (Canonical Part 1 Contract)

To ensure local ACID atomicity between business mutations and asynchronous domain event emission without distributed 2PC, every producing service owns an `outbox_event` table (singular) and every consuming service owns a `consumer_inbox` table inside **its own dedicated PostgreSQL database and matching named schema**.

> **Service-Owned Flyway Instantiation**: The canonical `outbox_event` and `consumer_inbox` DDL below must be instantiated inside each applicable service's **own Flyway migrations** (`backend/services/<service>/src/main/resources/db/migration/V*.sql`) according to that service's declared Producer/Consumer role in `data-definitions/services/<service>.md`. Do **not** create shared cross-service tables or duplicate eight full SQL definitions in Markdown.

### 1.1 Canonical Outbox Schema (`<service_schema>.outbox_event`)

Normative example for `automotive_operations` (each producing service applies the identical logical table in its own matching schema):

```sql
CREATE TABLE automotive_operations.outbox_event (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    producer_service  VARCHAR(64) NOT NULL,
    event_type        VARCHAR(128) NOT NULL,
    schema_version    VARCHAR(16) NOT NULL,
    aggregate_type    VARCHAR(64) NOT NULL,
    aggregate_id      VARCHAR(128) NOT NULL,
    aggregate_version BIGINT NOT NULL CHECK (aggregate_version >= 1),
    routing_key       VARCHAR(128) NOT NULL,
    correlation_id    VARCHAR(128),
    causation_id      VARCHAR(128),
    payload           JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),

    status            VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    attempt_count     INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    next_attempt_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    claim_token       UUID,
    claimed_by        VARCHAR(128),
    claim_expires_at  TIMESTAMPTZ,
    published_at      TIMESTAMPTZ,
    last_error        TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_outbox_status CHECK (
        status IN ('PENDING', 'CLAIMED', 'PUBLISHED', 'BLOCKED')
    ),
    CONSTRAINT chk_outbox_claim CHECK (
        (status = 'CLAIMED' AND claim_token IS NOT NULL
         AND claimed_by IS NOT NULL AND claim_expires_at IS NOT NULL)
        OR
        (status <> 'CLAIMED' AND claim_token IS NULL
         AND claimed_by IS NULL AND claim_expires_at IS NULL)
    ),
    CONSTRAINT chk_outbox_published CHECK (
        (status = 'PUBLISHED' AND published_at IS NOT NULL)
        OR (status <> 'PUBLISHED' AND published_at IS NULL)
    )
);

CREATE INDEX idx_outbox_ready
ON automotive_operations.outbox_event(next_attempt_at, created_at, id)
WHERE status = 'PENDING';

CREATE INDEX idx_outbox_expired_claim
ON automotive_operations.outbox_event(claim_expires_at, id)
WHERE status = 'CLAIMED';

CREATE INDEX idx_outbox_published_cleanup
ON automotive_operations.outbox_event(published_at)
WHERE status = 'PUBLISHED';
```

### 1.2 Canonical Consumer Inbox Schema (`<service_schema>.consumer_inbox`)

Each consuming service owns its own instance (normative example for `automotive_operations`):

```sql
CREATE TABLE automotive_operations.consumer_inbox (
    consumer_name      VARCHAR(128) NOT NULL,
    event_id           UUID NOT NULL,
    event_type         VARCHAR(128) NOT NULL,
    schema_version     VARCHAR(16) NOT NULL,
    processed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (consumer_name, event_id)
);

-- Durable Consumer-Scoped Retry Coordination (shares (consumer_name, event_id) budget across duplicate retry branches)
CREATE TABLE automotive_operations.consumer_retry_state (
    consumer_name     VARCHAR(128) NOT NULL,
    event_id          UUID NOT NULL,
    status            VARCHAR(24) NOT NULL DEFAULT 'IN_PROGRESS',
    attempt_count     INTEGER NOT NULL DEFAULT 1 CHECK (attempt_count BETWEEN 1 AND 5),
    active_token      UUID,
    lease_expires_at  TIMESTAMPTZ,
    next_retry_at     TIMESTAMPTZ,
    last_error        TEXT,
    quarantined_at    TIMESTAMPTZ,
    dlq_published_at  TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (consumer_name, event_id),
    CONSTRAINT chk_retry_status CHECK (
        status IN ('IN_PROGRESS', 'RETRY_PENDING', 'QUARANTINE_PENDING', 'QUARANTINED', 'COMPLETED')
    )
);
```

- **Handler Naming Discipline**: `consumer_name` is a stable **logical handler identifier** (e.g., `automotive-operations.order-cancelled-stock-handler`), **never** a pod name, container ID, or thread ID.
- **Handler Rename Migration**: If a logical handler is renamed, a Flyway data migration must alias or copy prior `(old_consumer_name, event_id)` rows within the retention window to the new `consumer_name` before deploying the renamed handler, preventing accidental replays or silent skips.
- **Single Source of Event State**: Do not store two independent copies of the same event state in conflicting tables.

### 1.3 Exact Outbox State Machine & SQL Transaction Boundaries

```text
PENDING --(T2 claim)--> CLAIMED --(broker confirm ACK + routed, T3)--> PUBLISHED
                           |
                           | publish NACK, confirm timeout, connection failure,
                           | basic.return (unroutable), or lease expiry
                           v
                     PENDING (next_attempt_at = exponential backoff + jitter, cap 5m)
                           |
                           +-- 12 claims exhausted or nonretryable routing/config defect --> BLOCKED (alert)
```

**Operational Defaults (`P1-DEC-03`)**: Poll interval **500 ms** (configurable; does not guarantee delivery latency), claim batch limit **50**, initial claim lease **60 seconds**, per-publish confirm timeout **10 seconds**, max **12 publish claims** before `BLOCKED` + alert, exponential backoff with jitter capped at **5 minutes**, `PUBLISHED` retention **7 days** (`PENDING`/`CLAIMED`/`BLOCKED` are never auto-purged).

1. **T1 — Business Commit (Local ACID)**:
   - In **one PostgreSQL transaction**, update the authoritative business tables and `INSERT` one `outbox_event` row with `status = 'PENDING'`, immutable `id` (`event_id`), metadata, and `payload` (`data` object).
   - Commit **both** or roll back **both**. Never publish to RabbitMQ inside T1.

2. **T2 — Claim Batch (Short Local PostgreSQL Transaction, `READ COMMITTED`)**:
   - Do not hold row locks while publishing. Parameterize `:worker_id` and `:batch_limit` (max 50):
   ```sql
   BEGIN;
   WITH picked AS (
       SELECT id
       FROM automotive_operations.outbox_event
       WHERE (
           (status = 'PENDING' AND next_attempt_at <= clock_timestamp())
           OR
           (status = 'CLAIMED' AND claim_expires_at <= clock_timestamp())
       ) AND attempt_count < 12
       ORDER BY created_at, id
       LIMIT :batch_limit
       FOR UPDATE SKIP LOCKED
   )
   UPDATE automotive_operations.outbox_event AS o
   SET status = 'CLAIMED',
       claimed_by = :worker_id,
       claim_token = gen_random_uuid(),
       claim_expires_at = clock_timestamp() + INTERVAL '60 seconds',
       attempt_count = attempt_count + 1,
       updated_at = clock_timestamp()
   FROM picked
   WHERE o.id = picked.id
   RETURNING o.*;
   COMMIT;
   ```
   - A separate housekeeping pass moves eligible exhausted `PENDING`/expired `CLAIMED` rows (`attempt_count >= 12`) to `BLOCKED` with an operational alert so they are never stranded silently.

3. **RabbitMQ Publish (Outside SQL Transaction)**:
   - Publish the persisted envelope to durable topic exchange **`tirestore.events`** using stored `routing_key`.
   - Set `delivery_mode=2` (persistent), `mandatory=true`, publisher confirm mode, `content_type='application/json'`, and AMQP `message_id = event_id`. Correlate broker responses to each `(event_id, claim_token)`.
   - **Broker Guarantee Distinction**: A publisher confirm (`basic.ack`) means **broker acceptance only**, not consumer processing. A `mandatory` publication can trigger `basic.return` (no queue accepted the route) *and* later receive `basic.ack`; `basic.return` must be tracked and marks the attempt **failed** (routing/config defect -> `BLOCKED` + alert). Never treat TCP write completion or `convertAndSend()` return as publish success.

4. **T3 — Record Publication Outcome (Short Local PostgreSQL Transaction)**:
   - **Success** (positive confirm with no `basic.return`):
     ```sql
     UPDATE automotive_operations.outbox_event
     SET status = 'PUBLISHED', published_at = clock_timestamp(),
         claim_token = NULL, claimed_by = NULL, claim_expires_at = NULL,
         last_error = NULL, updated_at = clock_timestamp()
     WHERE id = :event_id AND status = 'CLAIMED' AND claim_token = :claim_token;
     ```
     **Check affected row count = 1.** If `0`, the lease expired and another worker claimed it; do not overwrite the newer owner.
     - **Claim-Token Guarantee Scope**: `claim_token` protects **PostgreSQL row/state ownership** (preventing a stale worker from overwriting a newer worker's `CLAIMED` or `PUBLISHED` row in T3), **but it cannot prevent duplicate RabbitMQ publication** when a 60-second lease expires while a slow worker is still publishing. At-least-once broker delivery remains the invariant, and `consumer_inbox` deduplication absorbs duplicate deliveries safely.
   - **Retryable failure / timeout / uncertain confirm**: `UPDATE` guarded by `(id, status = 'CLAIMED', claim_token = :claim_token)` clearing claim fields, restoring `PENDING`, setting `next_attempt_at` (exponential backoff with jitter, max 5m), and recording `last_error`. After 12 claims or on nonretryable `basic.return`/config errors, transition to `BLOCKED` and alert.
   - **Audited Administrative Recovery for `BLOCKED` Outbox Events**:
     1. Inspect `last_error`, `routing_key`, and `event_type` on `BLOCKED` rows; fix the underlying defect (e.g., declare missing RabbitMQ queue/binding or resolve configuration defect).
     2. **Preserve Immutability**: Never alter the original `id` (`event_id`), `payload`, `aggregate_id`, `aggregate_version`, `schema_version`, or `created_at`.
     3. **Audited Reset**: Record the operator identity, incident/ticket reference, and timestamp in an operational audit entry, then execute a guarded reset to resume publication via `TransactionalOutboxRelay`:
        ```sql
        UPDATE automotive_operations.outbox_event
        SET status = 'PENDING',
            attempt_count = 0,
            next_attempt_at = clock_timestamp(),
            claim_token = NULL,
            claimed_by = NULL,
            claim_expires_at = NULL,
            last_error = NULL,
            updated_at = clock_timestamp()
        WHERE id = :event_id AND status = 'BLOCKED';
        ```
   - **Cleanup**: A daily housekeeping job deletes only `PUBLISHED` rows where `published_at < clock_timestamp() - INTERVAL '7 days'`. Separate business audit history is preserved in domain tables.

### 1.4 Consumer Inbox Transaction & RabbitMQ ACK Behavior

For every durable queue delivery:
1. Validate envelope syntax, `event_id`, `event_type`, and `schema_version`. Malformed payloads or unsupported future schema versions route through bounded retry / quarantine DLQ with alert (never silently dropped).
2. Begin **one local PostgreSQL transaction**.
3. Atomically claim `(consumer_name, event_id)`:
   ```sql
   INSERT INTO automotive_operations.consumer_inbox
     (consumer_name, event_id, event_type, schema_version)
   VALUES (:consumer_name, :event_id, :event_type, :schema_version)
   ON CONFLICT (consumer_name, event_id) DO NOTHING
   RETURNING event_id;
   ```
4. If inserted (`1` row returned), execute **only local PostgreSQL business mutations** (including inserting a local pending notification request or downstream outbox event) and commit. If `0` rows returned (conflict), the event was already committed by this logical handler; commit/finish without repeating side effects.
5. **Only after SQL commit succeeds**, send manual RabbitMQ `basic.ack`. Never call external email, SMS, or payment APIs inside this SQL transaction.
6. **Canonical Durable 5-Attempt Consumer Retry Coordination (`consumer_retry_state` + `x-retry-count`) & Quarantine DLQ**:
   - **Authoritative Budget vs. Header Metadata**: `x-retry-count` on AMQP delayed-retry queues is **routing/diagnostic metadata only**, never the sole authoritative retry counter. The single authoritative 5-attempt budget across all duplicate deliveries, delayed retry branches, concurrent consumers, and pod/broker restarts is `<service_schema>.consumer_retry_state` keyed by `(consumer_name, event_id)`.
   - **Admission Gate & State Transitions (Before Handler Execution)**:
     1. Inside a short local SQL transaction, check `consumer_inbox` for `(consumer_name, event_id)`. If already present, immediately `basic.ack` and stop (no retry budget consumed).
     2. Otherwise, atomically claim one attempt from the shared 5-attempt budget:
        ```sql
        INSERT INTO automotive_operations.consumer_retry_state
          (consumer_name, event_id, status, attempt_count, active_token, lease_expires_at, next_retry_at)
        VALUES (:consumer_name, :event_id, 'IN_PROGRESS', 1, :token, clock_timestamp() + INTERVAL '60 seconds', NULL)
        ON CONFLICT (consumer_name, event_id) DO UPDATE
        SET status = 'IN_PROGRESS',
            attempt_count = consumer_retry_state.attempt_count + 1,
            active_token = :token,
            lease_expires_at = clock_timestamp() + INTERVAL '60 seconds',
            next_retry_at = NULL,
            updated_at = clock_timestamp()
        WHERE (
            (consumer_retry_state.status = 'RETRY_PENDING'
             AND (consumer_retry_state.next_retry_at IS NULL OR consumer_retry_state.next_retry_at <= clock_timestamp()))
            OR (consumer_retry_state.status = 'IN_PROGRESS' AND consumer_retry_state.lease_expires_at <= clock_timestamp())
        )
        AND consumer_retry_state.attempt_count < 5
        RETURNING attempt_count;
        ```
     3. **If `0` rows returned**:
        - `COMPLETED`: already committed -> `basic.ack` and stop.
        - `QUARANTINED` (`dlq_published_at IS NOT NULL`): already quarantined and confirmed in `<queue>.dlq` -> `basic.ack` and stop (prevents duplicate DLQ publications).
        - `IN_PROGRESS` with `attempt_count = 5` and `lease_expires_at <= clock_timestamp()` (5th-attempt crash recovery), OR `QUARANTINE_PENDING` with `lease_expires_at <= clock_timestamp()`: **do not admit a 6th processing attempt**. Atomically claim quarantine-DLQ publication:
          ```sql
          UPDATE automotive_operations.consumer_retry_state
          SET status = 'QUARANTINE_PENDING',
              active_token = :dlq_token,
              lease_expires_at = clock_timestamp() + INTERVAL '60 seconds',
              quarantined_at = COALESCE(quarantined_at, clock_timestamp()),
              updated_at = clock_timestamp()
          WHERE consumer_name = :consumer_name
            AND event_id = :event_id
            AND (
                (status = 'IN_PROGRESS' AND attempt_count = 5 AND lease_expires_at <= clock_timestamp())
                OR (status = 'QUARANTINE_PENDING' AND lease_expires_at <= clock_timestamp())
            )
          RETURNING attempt_count;
          ```
          If `1` row returned, publish to `<queue>.dlq`, wait for positive publisher confirm (`basic.ack`, no `basic.return`), mark `status = 'QUARANTINED', dlq_published_at = clock_timestamp(), active_token = NULL, lease_expires_at = NULL` (`WHERE active_token = :dlq_token`), and only then `basic.ack` the delivery. If `0` rows returned, another worker is actively publishing to DLQ -> route via bounded delayed redelivery without consuming budget.
        - `IN_PROGRESS` (unexpired lease held by a concurrent consumer) or `RETRY_PENDING` with `next_retry_at > clock_timestamp()`: **do not** increment `attempt_count` or consume the 5-attempt processing budget, and **do not** use immediate `NACK requeue=true`. Instead, route the waiting delivery via **bounded delayed redelivery** (publish to a short-delay wait queue with Confirm-Before-ACK, preserving `message_id`, `event_id`, and `payload`, then ACK the original). If the active worker crashes or its 60s lease expires before completion, the delayed delivery reclaims `IN_PROGRESS` via `lease_expires_at <= clock_timestamp()` (for `attempt_count < 5`) or triggers 5th-attempt quarantine recovery above (for `attempt_count = 5`).
   - **Fenced Success Transaction (Same Local TX as `consumer_inbox`)**:
     - Inside the single local PostgreSQL transaction containing `INSERT INTO consumer_inbox ... ON CONFLICT DO NOTHING` and all local business mutations, atomically fence and complete the active attempt:
       ```sql
       UPDATE automotive_operations.consumer_retry_state
       SET status = 'COMPLETED',
           active_token = NULL,
           lease_expires_at = NULL,
           next_retry_at = NULL,
           updated_at = clock_timestamp()
       WHERE consumer_name = :consumer_name
         AND event_id = :event_id
         AND status = 'IN_PROGRESS'
         AND active_token = :token;
       ```
     - **Check affected row count = 1.** If `0` rows updated (the lease expired and another worker reclaimed or quarantined the event), **immediately abort and roll back the entire SQL transaction** (rolling back `consumer_inbox` and all local business mutations) and do not `basic.ack`. Only when `rowcount = 1` and the SQL transaction commits should the worker send manual `basic.ack`.
   - **Guarded Failure Transitions & Confirm-Before-ACK Loss Prevention**:
     - If `attempt_count < 5` (retryable error): in a short local TX, execute:
       ```sql
       UPDATE automotive_operations.consumer_retry_state
       SET status = 'RETRY_PENDING',
           next_retry_at = clock_timestamp() + :backoff_interval,
           active_token = NULL,
           lease_expires_at = NULL,
           last_error = :err,
           updated_at = clock_timestamp()
       WHERE consumer_name = :consumer_name
         AND event_id = :event_id
         AND status = 'IN_PROGRESS'
         AND active_token = :token;
       ```
       **Check affected row count = 1** (if `0`, abort without publishing retry or overwriting newer state). When `1`, publish a persistent copy (`delivery_mode=2`, `mandatory=true`) to the delayed-retry queue with `x-retry-count = attempt_count - 1` (preserving immutable `message_id`, `event_id`, occurrence `timestamp`, `payload`, `x-original-routing-key`, `x-first-failure-at`, and `x-last-error`).
     - If `attempt_count >= 5` or nonretryable poison/schema error: in a short local TX, transition `WHERE status = 'IN_PROGRESS' AND active_token = :token` (`rowcount = 1` required) to `status = 'QUARANTINE_PENDING'`, `active_token = :dlq_token`, `lease_expires_at = clock_timestamp() + INTERVAL '60 seconds'`, `quarantined_at = clock_timestamp()`, `last_error = :err`. Publish persistent copy with full diagnostic headers to `<queue>.dlq` + alert; after positive broker confirm, mark `status = 'QUARANTINED', dlq_published_at = clock_timestamp(), active_token = NULL, lease_expires_at = NULL` (`WHERE status = 'QUARANTINE_PENDING' AND active_token = :dlq_token`).
     - **Confirm-Before-ACK**: The consumer **must** receive positive publisher `basic.ack` (with no `basic.return`) for the retry or DLQ copy **before** sending `basic.ack` on the original delivery. On `basic.nack`, `basic.return`, confirm timeout, or uncertain publish outcome, **do not ACK the original delivery**—leave it unacknowledged so RabbitMQ preserves/redelivers it rather than risking silent message loss.
   - **Quorum Queue `x-delivery-limit` Distinction**: RabbitMQ Quorum Queue `x-delivery-limit` / `x-delivery-count` is an **additional broker-level safeguard** against tight crash-before-republish loops, **not** an interchangeable guarantee of exactly five application processing attempts.
   - **Crash Recovery Examples**:
     - *Crash between confirmed retry publish and original ACK*: RabbitMQ redelivers the original (`x-retry-count=0`) while the delayed retry (`x-retry-count=1`) also exists. Both branches contend on the single `(consumer_name, event_id)` row in `consumer_retry_state`: at most 5 total logical attempts are ever admitted, and once any branch commits (`COMPLETED`) or exhausts (`QUARANTINED`), subsequent duplicate branches see that terminal state and are safely ACKed without extra processing.
     - *Crash during `IN_PROGRESS` before retry/success*: After the 60s lease expires, the next delivery reclaims `IN_PROGRESS` via `lease_expires_at <= clock_timestamp()`, incrementing `attempt_count` within the same 5-attempt cap. *(Note: Notification provider delivery attempts remain a Part 10 concern.)*

---

## 2. Standard Event Envelope & Schema Versioning

`outbox_event.payload` stores only the immutable `data` JSON object. The publisher constructs the wire envelope **solely from immutable persisted `outbox_event` columns** (ensuring identical logical values across all retries; `timestamp` is persisted `created_at`, never publish time):

```json
{
  "event_id": "e4f5a6b7-c8d9-40e1-a2b3-c4d5e6f7a8b9",
  "event_type": "OrderConfirmedEvent",
  "schema_version": "1.0",
  "producer_service": "automotive-operations",
  "aggregate_type": "ORDER",
  "aggregate_id": "8bd07b6f-f7a7-4504-8fbe-cb2454d389c2",
  "aggregate_version": 2,
  "timestamp": "2026-11-25T20:30:00Z",
  "correlation_id": "client-request-123",
  "causation_id": "checkout-operation-456",
  "data": {
    "order_id": "8bd07b6f-f7a7-4504-8fbe-cb2454d389c2",
    "customer_id": "3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f",
    "store_id": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
    "total_cents": 64795,
    "currency": "USD"
  }
}
```

- **Nullable Tracing Headers**: `correlation_id` and `causation_id` are optional (`NULL` in DB / omitted or `null` in JSON when absent, e.g., system-initiated janitor events).
- **Schema Versioning Rules**: Major version (`1.x` -> `2.0`) indicates breaking structural changes; minor version (`1.0` -> `1.1`) indicates backward-compatible additive fields. Consumers must ignore unknown additive fields within a supported major version and reject/quarantine incompatible major versions rather than applying them as valid.

---

## 3. Catalog of Core Domain Events & Broker Topology

All events publish to durable topic exchange **`tirestore.events`** with explicitly declared durable subscriber queues and bindings (missing routing is an operational defect).

| Event Name | Producer Service | Routing Key | Consumer Services / Durable Queues | Business Trigger |
| :--- | :--- | :--- | :--- | :--- |
| **`ProductPriceChangedEvent`** | `automotive-product` | `catalog.product.price` | `automotive-operations` (`q.ops.catalog-price`) | Base or store override price updated |
| **`StockAllocationConfirmedEvent`** | `automotive-product` | `inventory.stock.allocated` | `automotive-operations` (`q.ops.stock-allocated`) | Checkout stock allocation confirmed |
| **`OrderConfirmedEvent`** | `automotive-operations`| `order.commerce.confirmed` | `notification` (`q.notif.order-confirmed`), `automotive-operations` | Order obligations confirmed |
| **`OrderCancelledEvent`** | `automotive-operations`| `order.commerce.cancelled` | `automotive-product` (`q.prd.order-cancelled`), `store-management` (`q.str.order-cancelled`), `notification` (`q.notif.order-cancelled`) | Customer cancel or saga compensation |
| **`QuoteApprovedEvent`** | `automotive-operations`| `workshop.quote.approved` | `notification` (`q.notif.quote-approved`) | Customer authorized supplemental repairs |
| **`WorkOrderCompletedEvent`** | `automotive-operations`| `workshop.order.completed` | `automotive-product` (`q.prd.wo-completed`), `notification` (`q.notif.wo-completed`) | Shop labor finished; parts consumed |
| **`AppointmentConfirmedEvent`** | `appointment` | `appointment.booking.confirmed`| `notification` (`q.notif.appt-confirmed`), `store-management` (`q.str.appt-confirmed`) | Service bay booking finalized |
| **`AppointmentRescheduledEvent`**| `appointment` | `appointment.booking.rescheduled`| `notification` (`q.notif.appt-rescheduled`), `store-management` (`q.str.appt-rescheduled`) | Booking moved to new bay / time slot |
| **`VehicleDepositHeldEvent`** | `vehicle-sales` | `sales.vehicle.deposit_held` | `vehicle-product` (`q.vpr.deposit-held`), `notification` (`q.notif.deposit-held`) | Deposit collected; VIN held |
| **`VehicleSoldEvent`** | `vehicle-sales` | `sales.vehicle.sold` | `vehicle-product` (`q.vpr.vehicle-sold`), `notification` (`q.notif.vehicle-sold`) | Contract executed; VIN marked SOLD |

---

## 4. Distributed Failure & Recovery Matrix (Part 1 Verification Contract)

| # | Fault Scenario | System Behavior & Invariant Maintained |
| :-: | :--- | :--- |
| **1** | **Pre-commit crash (inside T1)** | PostgreSQL rolls back both business entity changes and `outbox_event` insert. Zero phantom events emitted. |
| **2** | **Post-T1 commit / pre-publish crash** | Business state and `PENDING` `outbox_event` survive in PostgreSQL. Next relay poll claims and publishes the event. |
| **3** | **Post-confirm / pre-T3 mark crash** | `CLAIMED` lease expires after 60s; another relay re-claims and republishes **the exact same `event_id`**. Consumer inbox suppresses duplicate side effects. |
| **4** | **Unroutable mandatory message (`basic.return`)** | `basic.return` listener flags attempt failed even if `basic.ack` arrives; row transitions to `BLOCKED` and fires an operational alert. |
| **5** | **Broker NACK or RabbitMQ outage** | T3 restores `PENDING` with exponential backoff + jitter (capped at 5m); backlog safely buffers in PostgreSQL until broker recovers. |
| **6** | **Lost consumer ACK after SQL commit** | RabbitMQ redelivers the message; consumer inbox `ON CONFLICT DO NOTHING` returns `0` rows, skips side effects, and ACKs cleanly. |
| **7** | **Parallel duplicate consumer deliveries** | PostgreSQL PK `(consumer_name, event_id)` serializes concurrent inserts; exactly one transaction executes local mutations, the other skips and ACKs. |
| **8** | **Expired worker lease while slow publish finishes** | Newer worker holds new `claim_token`; stale worker's T3 `UPDATE ... WHERE claim_token = :old` updates `0` rows and aborts without overwriting newer state. |
| **9** | **Poison / malformed payload** | Consumer validation rejects payload; after 5 total broker attempts (1 + 4 delayed retries), message routes to durable quarantine DLQ with alert. |
| **10** | **Future-schema or out-of-order events** | Incompatible major `schema_version` routes to quarantine DLQ; older/gapped `aggregate_version` is detected by consumer version checks (reconciliation specified in Part 10). |

---

## 5. Cross-Service Read Projections & Replication Boundaries

To prevent high-latency synchronous RPC fan-outs across the API Gateway during browsing and cart loading, carefully scoped read-only projections are permitted:

| Projection Target | Destination Service | Source Service | Copied Attributes | Synchronization Trigger | Stale Tolerance | Authoritative Authority |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Cart Product Display** | `automotive-operations` (Redis) | `automotive-product` | SKU name, brand, thumbnail URL, list price | Copied on item-add; revalidated on `/validate` | Max 24 hours | **NEVER authorizes checkout! Must revalidate.** |
| **Service Duration Cache** | `appointment` (Local Memory/PG) | `automotive-product` | Service code, estimated duration, required bay type | Consumes `ServiceDefinitionChangedEvent` | Max 6 hours | Advisory for slot calculation; re-verified at bay hold. |
| **Store Capability Projection**| `appointment` | `store-management` | Store ID, active bay count, alignment rack capability | Consumes `StoreOfferingChangedEvent` | Max 24 hours | Re-verified during bay reservation. |
| **Customer Garage Profile** | `automotive-operations` | `identity-access` | Vehicle ID, YMMT, license plate | Fetched on checkout initiation | Max 1 hour | Immutable snapshot on order. |

### Strict Projection Rules
1. **Never Authorize State Mutations**: A read projection is strictly for display and validation hints. **No financial charge, physical stock allocation, or contract finalization may be authorized from a projection.**
2. **Version Checking & Rebuild**: Consumers must check `aggregate_version` to reject stale out-of-order updates and flag version gaps (full projection repair/rebuild workflows are finalized in Part 10).
