# Data Lifecycle, Retention Rules, Sizing Capacity, and Disaster Recovery

> **Status**: AUTHORITATIVE DATA LIFECYCLE & CAPACITY SPECIFICATION (Phase 2F-C)
> **Target Scale**: 15–50 Stores (10–25 bays/store, 100k+ SKUs)

---

## 1. Data Retention & Archival Policies

| Data Category | Primary Datastore | Operational TTL | Business Retention | Archival & Purge Mechanism |
| :--- | :--- | :--- | :--- | :--- |
| **Guest Shopping Carts** | Redis | Retired in V1 (`P4-DEC-01`) | None | No anonymous/guest carts in V1; authentication required |
| **Authenticated Account Carts** | Redis | 7 days inactivity (`cart:account:{user_id}`) | None | Native Redis TTL expiration refreshed on mutation; `cart:mut:{user_id}:{mutation_id}` dedupe TTL 24h |
| **Stock Reservations (Holds)**| PostgreSQL | 10 minutes (`P3-DEC-07`) | 24 hours | `ReservationJanitorJob` marks EXPIRED; purged after 24h |
| **Bay Reservations (Holds)** | PostgreSQL | 10 minutes (`P5-DEC-08`) | 24 hours (non-destructive history retained) | In-TX expired-hold retirement (`APT-16`) + `BayReservationJanitorJob` marks `EXPIRED`; never deleted |
| **VIN Deposit Sales Holds** | PostgreSQL | 72 hours | 30 days | `VinHoldJanitorJob` releases hold; retained for deal history |
| **Commercial Orders & Invoices**| PostgreSQL | None | 7 Years (Legal) | Cold partition storage after 2 years; read-only |
| **Inventory Operation Audit** | PostgreSQL | None | Operational Audit (`DEFERRED_BY_OWNER_V1` for 7y partitioned ledger) | Unpartitioned `inventory_operation` (`P3-DEC-05`); legal compliance retention deferred to Part 11 |
| **Work Orders & Inspection Logs**| PostgreSQL | None | 7 Years | Indexed historical vehicle service record |
| **Vehicle Sales Contracts** | S3 / PostgreSQL | None | 10 Years (DMV/State) | Cryptographic immutable PDF storage in S3 bucket |
| **Notification Delivery Logs** | PostgreSQL | None | 365 Days | Monthly partition drop for records > 1 year |
| **Outbox Events (Published)** | PostgreSQL | Retained 7 days post-publish | 7 Days (Operational Default) | Daily cleanup job deletes only `status = 'PUBLISHED'` rows where `published_at < clock_timestamp() - INTERVAL '7 days'`; `PENDING`/`CLAIMED`/`BLOCKED` are never auto-purged (legal retention reviewed in Part 11). |

---

## 2. Capacity Sizing & Growth Models (15 to 50 Stores)

### 2.1 Storage Growth Projections
- **Branch Inventory Records**:
  $$50\text{ stores} \times 5,000\text{ active SKUs} = 250,000\text{ rows in } \texttt{store\_inventory} \approx 40\text{ MB}.$$
- **Commercial Orders**:
  $$50\text{ stores} \times 50\text{ orders/day} = 2,500\text{ orders/day} \approx 912,500\text{ orders/year} \approx 1.2\text{ GB/year}.$$
- **Stock Movements (Audit Ledger)**:
  $$2,500\text{ orders/day} \times 4\text{ tires/order} = 10,000\text{ movements/day} \approx 3.65\text{M rows/year} \approx 1.5\text{ GB/year}.$$
- **Active Redis Carts**:
  $$10,000\text{ concurrent carts} \times 2.5\text{ KB/cart} = 25\text{ MB memory footprint} \ll 2\text{ GB allocated Redis heap}.$$

### 2.2 PostgreSQL Connection Pool Budgeting (HikariCP)
To prevent PostgreSQL process exhaustion on medium-scale Kubernetes clusters:
- Each service replica: `minimumIdle = 5`, `maximumPoolSize = 15`.
- 2 replicas per service $\times$ 7 target services $\times$ 15 connections $= 210\text{ max database connections}$.
- Standard PostgreSQL `max_connections = 400` comfortably accommodates peak rush traffic without queuing.

---

## 3. Disaster Recovery & Failover Specifications

| Service Datastore | Durability Level | RPO Target | RTO Target | Failover & Recovery Strategy |
| :--- | :--- | :---: | :---: | :--- |
| **PostgreSQL Databases (All 7 Target Services)**| Synchronous WAL | $\le 1\text{ minute}$ | $\le 5\text{ minutes}$ | Automated Patroni / Cloud Native PG failover; continuous WAL archiving to S3. |
| **Redis Active Cart Store** | Proposed AOF `everysec` | Trade-off (Prospective loss during power crash) | $\le 30\text{ seconds}$ | Redis Sentinel / Cluster auto-failover. If catastrophic loss, active carts reset to empty; frontend prompts re-add. Orders remain intact in PostgreSQL. |
| **RabbitMQ Event Broker** | Persistent Messages | $\le 5\text{ seconds}$ | $\le 2\text{ minutes}$ | Quorum Queues across 3 nodes; transactional outbox buffers all messages during outage. |
| **MinIO / S3 Object Store** | Erasure Coded | 0 seconds | $\le 1\text{ minute}$ | Multi-region bucket replication for signed vehicle contracts and inspection images. |
