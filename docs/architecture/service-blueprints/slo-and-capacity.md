# Unified Service Level Objectives (SLOs), Capacity Sizing, and API Standards

> **Status**: AUTHORITATIVE PERFORMANCE & API STANDARDS (Phase 2F-B-R2)
> **Scale Baseline**: 15–50 Regional Physical Stores (10–25 bays/store, 100k+ SKUs)
> **Planning Load**: Initial 15 external RPS (45 peak), Medium-Scale 75 external RPS (225 peak), Peak Season Spike 675 external RPS.
> **Note**: Latency targets are architectural design objectives, not measured production metrics.

---

## 1. Capacity & Workload Model (15 to 50 Stores)

### 1.1 Planning Load Assumptions
- **Baseline Scale**: Regional retail chain with 15 initial stores scaling to 50 physical branches.
- **Store Dimensions**: 10–25 bays per branch, operating 10 hours/day, 6 days/week.
- **Traffic Assumptions (Not measured production traffic)**:
  - Initial Load (15 Stores): 15 external RPS steady / 45 peak RPS.
  - Medium-Scale (50 Stores): 75 external RPS steady / 225 peak RPS.
  - Seasonal Spike (Tire Rush): 675 external peak RPS.

### 1.2 Internal RPC & Traffic Amplification
A single mixed checkout (`POST /checkout/sessions`) triggers an internal fan-out:
1. `automotive-operations` $\to$ Redis cart lookup (1 read).
2. `automotive-operations` $\to$ `automotive-product` stock hold (1 write).
3. `automotive-operations` $\to$ `store-management` bay hold (1 write).
4. `automotive-operations` $\to$ Stripe API payment intent (1 external call).
5. Payment capture $\to$ `automotive-product` confirm allocation (1 write).
6. Payment capture $\to$ `store-management` confirm bay (1 write).
7. Payment capture $\to$ `appointment` create booking (1 write).
8. Payment capture $\to$ Transactional outbox event insertion (1 local write).
- **Amplification Factor**: $1\text{ external checkout} \approx 7\text{ internal synchronous/asynchronous operations}$.

---

## 2. Activity SLO Tiering & Targets

| Tier | Category | Target Availability | Target Latency (p95) | Target Latency (p99) | Examples |
| :---: | :--- | :---: | :---: | :---: | :--- |
| **Tier 1** | Core Commerce & Cart | 99.95% | $\le 80\text{ ms}$ | $\le 150\text{ ms}$ | Cart add, catalog search, stock check, fitment lookup |
| **Tier 2** | Sagas & Bookings | 99.90% | $\le 200\text{ ms}$ | $\le 450\text{ ms}$ | Checkout submit, bay reservation, deal contracting |
| **Tier 3** | Staff Operations | 99.50% | $\le 400\text{ ms}$ | $\le 800\text{ ms}$ | Work order updates, quote drafting, admin catalog sync |
| **Tier 4** | Async Background | 99.00% | Queue Age $\le 5\text{ s}$ | Completion $\le 30\text{ s}$ | Outbox relays, SMS/email dispatch, hold janitors |

---

## 3. Comprehensive Activity SLO Matrix (All 8 Services)

| Activity ID | Activity Name | Tier | Read/Write | Peak RPS (50 Stores) | p95 Latency Target | Correctness Invariant |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **ACT-OPS-001** | Create Draft Order | Tier 2 | Write | 15 RPS | 60 ms | Snapshots agreed line prices |
| **ACT-OPS-002** | Submit Checkout Session | Tier 1 | Write | 25 RPS | 120 ms | Partition multi-store carts |
| **ACT-OPS-003** | Complete Payment & Capture | Tier 1 | Write | 20 RPS | 180 ms | Zero duplicate charges |
| **ACT-OPS-010** | Create Work Order | Tier 2 | Write | 10 RPS | 80 ms | Single work order per visit |
| **ACT-OPS-012** | Update Task Status | Tier 3 | Write | 30 RPS | 50 ms | Technicians edit assigned tasks |
| **ACT-OPS-017** | Add Item to Active Cart | Tier 1 | Write | 150 RPS | 25 ms | Redis atomic update |
| **ACT-OPS-018** | Merge Guest Cart | Tier 1 | Write | 20 RPS | 45 ms | Preserves existing user items |
| **ACT-OPS-019** | Revalidate Cart Stock/Price | Tier 1 | Read | 120 RPS | 40 ms | Never checks out stale price |
| **ACT-OPS-021** | Generate Supplemental Quote | Tier 3 | Write | 8 RPS | 90 ms | Versioned quote revision |
| **ACT-OPS-022** | Customer Quote Approval | Tier 2 | Write | 5 RPS | 70 ms | Explicit digital signature/token |
| **ACT-PRD-001** | Search Tire Catalog | Tier 1 | Read | 250 RPS | 35 ms | Filtered by size & category |
| **ACT-PRD-003** | Lookup Vehicle Fitment | Tier 1 | Read | 200 RPS | 25 ms | Authoritative OEM specs |
| **ACT-PRD-006** | Query Branch Stock Balances | Tier 1 | Read | 180 RPS | 30 ms | Read-committed balance |
| **ACT-PRD-008** | Reserve Physical Stock | Tier 1 | Write | 30 RPS | 35 ms | Zero overselling invariant |
| **ACT-PRD-009** | Confirm Stock Allocation | Tier 2 | Write | 25 RPS | 40 ms | Move reserved to allocated |
| **ACT-PRD-029** | Define Automotive Service | Tier 3 | Write | 2 RPS | 50 ms | Globally unique service ID |
| **ACT-PRD-030** | Configure Service Pricing | Tier 3 | Write | 5 RPS | 45 ms | Store override precedence |
| **ACT-PRD-031** | Physical Stock Handover | Tier 2 | Write | 15 RPS | 60 ms | Decrements quantity_on_hand |
| **ACT-SAL-002** | Request Vehicle Deposit Hold | Tier 2 | Write | 5 RPS | 90 ms | Single deposit hold per VIN |
| **ACT-SAL-005** | Finalize Vehicle Sale Contract | Tier 2 | Write | 2 RPS | 150 ms | Irreversible legal boundary |
| **ACT-VEH-001** | Ingest Vehicle by VIN | Tier 3 | Write | 3 RPS | 80 ms | 17-char VIN uniqueness |
| **ACT-VEH-003** | Search Vehicle Listings | Tier 1 | Read | 120 RPS | 40 ms | Public search indexed |
| **ACT-APT-001** | Search Available Slots | Tier 1 | Read | 140 RPS | 45 ms | Computed against GiST bay holds |
| **ACT-APT-002** | Book Appointment | Tier 2 | Write | 25 RPS | 110 ms | Valid bay hold required |
| **ACT-APT-010** | Redeem Schedule-Later Token | Tier 2 | Write | 8 RPS | 100 ms | Unscheduled entitlement only |
| **ACT-STR-001** | Search Nearby Stores | Tier 1 | Read | 150 RPS | 25 ms | PostGIS ST_DWithin radius |
| **ACT-STR-007** | Reserve Service Bay | Tier 1 | Write | 30 RPS | 45 ms | PostgreSQL GiST range lock |
| **ACT-IDN-001** | Authenticate User & Issue JWT | Tier 1 | Read | 80 RPS | 35 ms | Keycloak token verification |
| **ACT-IDN-005** | Save Vehicle to Garage | Tier 2 | Write | 15 RPS | 40 ms | Linked to customer user_id |
| **ACT-NOT-003** | Dispatch Transactional SMS | Tier 4 | Async | 60 Msg/s | Latency $\le 3\text{s}$ | Zero drop, DLQ retry |

---

## 4. Global API Standards & Conventions

### 4.1 Base URIs & Versioning
- Gateway Ingress: `https://api.tirestore.local/api/v1/{service-subdomain}/**`
- Internal Service: `http://{service-hostname}:{port}/api/v1/{service-subdomain}/**`

### 4.2 Standard Request & Response Headers
- `X-Correlation-ID`: UUIDv4 passed across all service calls for distributed tracing.
- `Idempotency-Key`: UUIDv4 mandatory on all mutating financial and reservation calls (`POST /checkout/sessions`, `POST /reservations`).
- `Authorization`: `Bearer {JWT}` issued by Keycloak OIDC provider.
- `X-Store-ID`: Contextual header for store-scoped staff roles (`shop_worker`, `store_manager`).

### 4.3 Unified Error Representation (RFC 7807)
All errors return `application/problem+json` containing `type`, `title`, `status`, `detail`, `instance`, `code`, `timestamp`, and `correlation_id`.

---

## 5. Background Daemons Master Directory

| Service | Daemon / Worker | Trigger | Concurrency Control | Freshness / SLO Target |
| :--- | :--- | :--- | :--- | :--- |
| **`automotive-product`** | `ReservationJanitorJob` | Fixed delay 60s | PostgreSQL `SKIP LOCKED` | Expires 10m holds within 60s (`P3-DEC-07`) |
| **`automotive-product`** | `StockLedgerArchivalJob`| `DEFERRED_BY_OWNER_V1` | — | Annual movement partitioning removed in V1 (`P3-DEC-05`) |
| **`automotive-operations`** | `CheckoutSagaRecoveryJob`| Fixed delay 60s | PostgreSQL `SKIP LOCKED` | Recovers crashed sagas within 5m |
| **All Producing Services** | `TransactionalOutboxRelay`| Fixed delay 500ms (Part 1 default) | PostgreSQL `SKIP LOCKED` (batch 50, 60s lease) | Publishes to `tirestore.events` with confirms (poll interval does not guarantee delivery latency) |
| **`automotive-operations`** | `AbandonedCartEvaluator` | Cron hourly at :15 | Redis scan with cursor | Flags inactive carts $\ge 24\text{h}$ |
| **`store-management`** | `BayReservationJanitorJob`| Fixed delay 60s | Atomic conditional delete | Releases unconfirmed bays within 60s |
| **`store-management`** | `StoreHoursSyncJob` | Cron daily at 01:00 AM | Batch update projections | Freshness within 24h |
| **`appointment`** | `AppointmentReminderJob` | Cron every 15m | Reads appointments next 24h | Dispatches alerts 24h & 2h prior |
| **`appointment`** | `EntitlementExpiryJanitor`| Cron weekly Sunday 03:00 AM| Updates expired SCHEDULE_LATER | Transitions tokens > 365 days |
| **`vehicle-product`** | `VinHoldJanitorJob` | Fixed delay 300s | Releases expired 72h holds | Frees vehicle for public sale |
| **`vehicle-sales`** | `SalesDealJanitorJob` | Cron daily at 04:00 AM | Archives abandoned inquiries | Cleans stale draft deals > 30d |
| **`notification`** | `NotificationRetryWorker` | RabbitMQ Backoff | Exponential backoff (1s, 5s, 30s) | Max 3 attempts before DLQ |
| **`notification`** | `DeadLetterQueueMonitor` | Continuous consumer | Alerts on DLQ spike | Alert dispatched within 30s |
| **`identity-access`** | `KeycloakSyncWorker` | Event-driven webhook | Idempotent profile upsert | Sync within 2s of profile change |
