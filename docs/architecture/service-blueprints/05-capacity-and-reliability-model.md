# Medium-Scale Capacity, Traffic Amplification & Reliability Model

> **Document Status**: `PROPOSED MODEL` / `PLANNING BASELINE` (Phase 2E-R Revised)  
> **Notice**: All traffic rates, user counts, and transaction volumes modeled in this document are **hypothetical engineering planning parameters** calibrated for a regional retail automotive chain (15 to 50 physical stores). They represent sizing baselines for resource quotas and connection budgeting, **not** measured historical production benchmarks.

---

## 1. Workload Scenarios & Planning Baselines

```
Scenario A: Initial Production Launch (15 Retail Branches)
  - Footprint: 15 physical branches (10–15 bays per branch)
  - Registered Accounts: ~50,000 customers
  - Daily Active Users (DAU): ~2,500
  - Peak Concurrent User Sessions: ~150
  - Average Platform Traffic: ~4.0 external req/sec | Peak: ~25.0 external req/sec

Scenario B: Medium-Scale Target (50 Retail Branches — Steady State)
  - Footprint: 50 physical branches (10–25 bays per branch)
  - Registered Accounts: ~250,000 customers
  - Daily Active Users (DAU): ~15,000
  - Peak Concurrent User Sessions: ~1,000
  - Average Platform Traffic: ~29.0 external req/sec | Peak: ~150.0 external req/sec

Scenario C: Seasonal Peak Rush (Winter Tire Swap / Black Friday Event)
  - Footprint: 50 physical branches operating at maximum service bay utilization
  - Daily Active Users (DAU): ~60,000 (4x surge over steady state)
  - Peak Concurrent User Sessions: ~4,000
  - Peak-to-Average Multiplier: ~5.5 to 6.0
  - Average Platform Traffic: ~125.0 external req/sec | Peak: ~750.0 external req/sec
```

---

## 2. Traffic Amplification & Fan-Out Analysis

A critical architectural distinction is that **external user requests do not equal internal microservice requests**. A single complex business request (such as checking out or searching tire fitment) amplifies into multiple downstream REST calls, database queries, and asynchronous events:

### Request Amplification Matrix

| Business Workflow | External User Requests | Downstream Internal REST Calls | Resulting SQL Queries / Statements | Outbox / Async Messages Emitted | Amplification Factor (External to DB) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Tire Catalog Search (by size)** | 1 | 0 (direct to `automotive-product`) | 1–2 (B-Tree index scan + count) | 0 | **1x to 2x** |
| **Fitment + Nearby Stock Search** | 1 | 2 (`store-management` PostGIS + `automotive-product` stock) | 3–4 (Spatial query + stock lookup) | 0 | **3x to 4x** |
| **Vehicle Listing Detail Page** | 1 | 0 (direct to `vehicle-product`) | 2–3 (Vehicle record + photos + inspection) | 0 | **2x to 3x** |
| **Tire Checkout (with Installation)** | 1 | 4 (Stock hold + Bay hold + Appt create + Stripe intent) | 8–12 (Saga update, stock lock, bay exclusion, appt insert, outbox insert) | 1 (`operations.order.paid`) | **8x to 12x** |
| **Used Vehicle Deposit Hold** | 1 | 2 (`vehicle-product` hold + Stripe intent) | 4–6 (Saga update, VIN hold, deposit record, outbox insert) | 1 (`sales.deposit.received`) | **4x to 6x** |
| **Order Cancellation** | 1 | 3 (Stripe refund + stock release + bay release) | 6–8 (Order status, movement restock, bay delete, credit note) | 1 (`operations.order.cancelled`) | **6x to 8x** |

---

## 3. Platform Capacity Profiles (Scenario B Medium-Scale Baseline)

Accounting for traffic amplification factors, the platform capacity requirements at peak (Scenario B: 150 peak external RPS) are modeled below:

| Microservice | External Peak RPS | Internal Downstream Ingress RPS | Total Peak Ingress RPS | Dominant Query Profile | Target p95 Latency | HikariCP Pool Size per Pod | Target Pod Replicas |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: |
| **`automotive-operations`** | 5.0 | 0.0 | **5.0 req/s** | Write-Intensive ACID Saga, Outbox inserts | < 250 ms | 10 conns | 2–3 |
| **`automotive-product`** | 80.0 | 5.0 (holds) | **85.0 req/s** | Read-Heavy B-Tree scans + atomic inventory updates | < 30 ms | 10 conns | 3–4 |
| **`store-management`** | 25.0 | 5.0 (holds) | **30.0 req/s** | Read-Heavy PostGIS spatial + GiST range exclusion | < 20 ms | 10 conns | 2–3 |
| **`appointment`** | 8.0 | 5.0 (holds) | **13.0 req/s** | Balanced Read/Write scheduling inserts | < 40 ms | 10 conns | 2 |
| **`vehicle-product`** | 15.0 | 0.5 (holds) | **15.5 req/s** | Read-Heavy listings + unique VIN lookups | < 40 ms | 10 conns | 2 |
| **`vehicle-sales`** | 2.0 | 0.0 | **2.0 req/s** | Low-Volume, high-value ACID contracts and deposits | < 250 ms | 10 conns | 2 |
| **`identity-access`** | 15.0 | 0.0 | **15.0 req/s** | Read-Heavy JWT verification + customer garage | < 20 ms | 10 conns | 2 |
| **`notification`** | 0.0 | 10.0 (events) | **10.0 msg/s** | Async message consumer + provider HTTP dispatch | < 1000 ms (Queue) | 5 conns | 2 |

---

## 4. PostgreSQL Connection Pool Budgeting & Derivations

> [!IMPORTANT]
> **Database Connection Sizing Correction**:
> Canonical PostgreSQL has a default setting of `max_connections = 100`. Sizing connection pools across 8 microservices requires explicit mathematical budgeting to prevent database connection exhaustion.

### Connection Budget Formula
$$\text{Total Application Connections} = \sum_{s=1}^{8} \left( \text{Replicas}_s \times \text{HikariCP Pool Size}_s \right) + \text{Reserved Admin / Monitoring Headroom}$$

### Connection Budgeting Scenarios

#### A. Local Development Environment (`tire-store-local` on kind)
- Single replica per service (`replicas: 1`).
- HikariCP pool size per service: **10 connections** (notification: 5 connections).
- Calculation:
  $$\text{App Connections} = (7 \times 10) + (1 \times 5) = 75\text{ connections}$$
  $$\text{Admin / Flyway / Actuator Headroom} = 15\text{ connections}$$
  $$\text{Total Peak Connections} = 75 + 15 = 90\text{ connections} \le 100\text{ (Default limit)}$$
- *Conclusion*: Local kind safely operates within PostgreSQL's default `max_connections = 100` without connection starvation.

#### B. Production Multi-Replica Target (Scenario B — 50 Stores)
- 2 to 3 replicas per service (approx. 20 total Pods across platform).
- At 10 connections per Pod:
  $$\text{App Connections} = 20\text{ Pods} \times 10\text{ conns/Pod} = 200\text{ connections}$$
- *Evaluation*: 200 connections exceeds the vanilla PostgreSQL default limit of 100.
- **Production Strategy (Two Approved Options)**:
  1. **Option 1 (Tuned Dedicated Databases)**: When each service runs its dedicated PostgreSQL instance (or dedicated RDS database), each database only services $3 \times 10 = 30$ connections, safely within default bounds.
  2. **Option 2 (PgBouncer Connection Pooling)**: If services share a managed PostgreSQL cluster, deploy **PgBouncer** in transaction pooling mode (`pool_mode = transaction`). PgBouncer multiplexes hundreds of client connections into 20–30 physical PostgreSQL server connections, completely eliminating connection overhead.

---

## 5. Mathematical Concurrency Derivations (Little's Law)

$$L = \lambda \times W$$
- $L$ = In-flight concurrent requests in the system.
- $\lambda$ = Arrival rate (Requests per second, RPS).
- $W$ = Average response latency in seconds.

### Concrete In-Flight Concurrency Calculations (Scenario B Peak)

1. **High-Throughput Tire Catalog Search (`automotive-product`)**:
   $$\lambda = 85.0\text{ req/s},\quad W = 0.025\text{ s (25 ms)}$$
   $$L = 85.0 \times 0.025 = 2.125\text{ concurrent requests}$$
   *Meaning*: At steady peak, approximately 2 requests are actively executing in the JVM at any microsecond. A pool of 10 connections easily handles this load without queueing.

2. **Distributed Checkout Saga (`automotive-operations`)**:
   $$\lambda = 5.0\text{ req/s},\quad W = 0.250\text{ s (250 ms)}$$
   $$L = 5.0 \times 0.250 = 1.25\text{ concurrent sagas}$$
   *Meaning*: Approximately 1 to 2 checkout sagas are in-flight concurrently. Even with external Stripe latency, concurrency remains well within thread pool limits.

---

## 6. Saturation Benchmarking & Verification Plan

All capacity assumptions will be validated prior to production launch using **k6 load test scripts**:
1. **Catalog Search Step-Load**: Ramp from 10 to 120 RPS over 10 minutes against `/api/v1/automotive/products/tires`. Assert p95 < 30ms and CPU < 65%.
2. **Concurrent Inventory Contention Test**: 100 concurrent virtual users attempting to reserve the last 4 tires simultaneously. Assert 0 oversold, 0 deadlocks, and clean 409 Conflict returns for 99 users.
3. **End-to-End Checkout Saga Test**: 5 concurrent checkout sagas/sec sustained for 15 minutes. Assert 100% agreement between Stripe mock capture, order status, stock allocation, and bay reservations.
