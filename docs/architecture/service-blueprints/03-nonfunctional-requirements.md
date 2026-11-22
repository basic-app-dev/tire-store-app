# Nonfunctional Requirements, Availability & Resilience Blueprint

> **Document Status**: `PROPOSED TARGETS` / `DESIGN SPECIFICATION` (Phase 2E-R Revised)  
> **Environment Baseline**: Local kind single-node development cluster (`[EXISTING]`); Multi-AZ Kubernetes & Managed PostgreSQL (`[PLANNED PRODUCTION TARGET]`)  
> **Notice**: All availability figures, latencies, and recovery times in this document are **proposed engineering targets (SLOs)**, not measured historical metrics or contractual guarantees.

---

## 1. Service-Level Objectives (SLOs) & Differentiated Operation Classes

Not all operations within a service have the same operational criticality. Correctness of financial transactions and physical asset reservations takes precedence over raw browsing throughput.

### Operation Class Taxonomy
- **Class A (Core Transactional & Asset Locks)**: Monetary charges, stock reservations, physical bay reservations, vehicle holds. Requires strict ACID consistency; latency is bounded to protect transactional integrity.
- **Class B (High-Throughput Read & Discovery)**: Tire catalog search, vehicle listings, store proximity lookups. Optimized for read concurrency and low latency; can tolerate brief caching staleness.
- **Class C (Operational & Administrative)**: Work order updates, store hours configuration, technician scheduling. Moderate traffic, standard business hours.
- **Class D (Asynchronous Side Effects)**: Email, SMS, push notifications, audit logging. Decoupled from user HTTP threads; eventual consistency; tolerant of transient provider delay.

---

### Differentiated Target SLO Matrix

| Service | Operation Class | Availability Target | p95 Latency Target | p99 Latency Target | Target RTO | Target RPO | Consistency & Durability Standard |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **`automotive-operations`** | Class A (Checkout Saga & Payment)<br>Class B (Order History & Invoices) | **99.95%**<br>99.90% | < 250 ms<br>< 80 ms | < 600 ms<br>< 200 ms | < 15 min<br>< 30 min | Zero (Strict ACID)<br>< 1 min | Local PostgreSQL ACID + Stripe Idempotency + Transactional Outbox `[PLANNED]` |
| **`automotive-product`** | Class A (Stock Reservations)<br>Class B (Catalog Search & Fitment) | **99.95%**<br>99.90% | < 50 ms<br>< 30 ms | < 150 ms<br>< 80 ms | < 15 min<br>< 30 min | Zero for Ledger<br>< 5 min | Conditional SQL Updates / Row Locks; Composite B-Tree Indexes |
| **`store-management`** | Class A (Bay Reservations)<br>Class B (Store Locator Proximity) | **99.95%**<br>99.90% | < 50 ms<br>< 20 ms | < 120 ms<br>< 60 ms | < 15 min<br>< 30 min | Zero for Bay Holds<br>< 1 hour | PostgreSQL GiST Range Exclusion; PostGIS Spatial Indexes |
| **`appointment`** | Class A (Appointment Confirmation)<br>Class B (Availability Calendar) | **99.90%**<br>99.90% | < 100 ms<br>< 40 ms | < 250 ms<br>< 100 ms | < 30 min | < 5 min | Atomic coordination with `store-management` bay holds |
| **`vehicle-product`** | Class A (VIN Holds & Sold Status)<br>Class B (Used Vehicle Listings) | **99.95%**<br>99.90% | < 60 ms<br>< 40 ms | < 150 ms<br>< 100 ms | < 15 min<br>< 30 min | Zero for VINs<br>< 5 min | Globally Unique VIN Constraint; Conditional status updates |
| **`vehicle-sales`** | Class A (Holding Deposits & Contracts)<br>Class B (Sales Pipeline Leads) | **99.95%**<br>99.90% | < 250 ms<br>< 60 ms | < 500 ms<br>< 150 ms | < 15 min<br>< 30 min | Zero for Deposits<br>< 5 min | Local PostgreSQL ACID + Stripe Idempotency + Outbox `[PLANNED]` |
| **`identity-access`** | Class A (Store RBAC Evaluation)<br>Class B (Customer Profile & Garage) | **99.95%**<br>99.90% | < 20 ms<br>< 40 ms | < 50 ms<br>< 100 ms | < 15 min<br>< 30 min | Zero for Roles<br>< 1 min | In-memory JWT verification + Store ID security context |
| **`notification`** | Class D (Email, SMS, Push Dispatch) | **99.50%** | < 1000 ms (Queue)<br>Async delivery | < 3000 ms<br>Async delivery | < 2 hours | < 15 min | Durable RabbitMQ Queues `[PLANNED]` + Dead Letter Exchange (DLX) |

---

## 2. High Availability Architecture: Environment Distinction

> [!WARNING]
> **Environment Clarification**: The existing local development cluster (`tire-store-local` on kind) is a **single-node, single-replica environment**. It cannot demonstrate or guarantee production high availability. The configurations below represent the target production architecture.

### A. Local Development Environment (`[EXISTING]`)
- **Node Topology**: Single Docker container running kind control-plane (`tire-store-local-control-plane`).
- **Workload Replicas**: `replicas: 1` per microservice deployment.
- **Storage**: Ephemeral local volume storage; single-pod etcd for APISIX.
- **Failure Impact**: Stopping Docker Engine or rebooting the host terminates all services simultaneously.
- **Purpose**: Rapid local compilation, contract testing, and functional development.

### B. Production High Availability Target (`[PLANNED]`)
To achieve the 99.95% availability target for Tier 1 transactional workflows in production:
1. **Multi-Replica Pod Distribution**:
   - Minimum 2 to 3 replicas per Spring Boot service.
   - Spread across multiple Kubernetes Availability Zones using `topologySpreadConstraints` with `maxSkew: 1`.
2. **PodDisruptionBudgets (PDB)**:
   - Configured with `minAvailable: 1` to prevent complete service downtime during Kubernetes rolling node upgrades.
3. **Managed Database High Availability**:
   - Multi-AZ PostgreSQL (e.g. AWS RDS Multi-AZ or Cloud SQL High Availability).
   - Synchronous replication to standby replica with automated failover target < 60 seconds.
   - Automated Daily Snapshots + Continuous WAL archiving for Point-in-Time Recovery (PITR).
4. **Clustered Message Broker**:
   - RabbitMQ deployed as a 3-node Quorum Queue cluster across distinct AZs to prevent message loss during broker node replacement.

---

## 3. Resilience Scenarios & Recovery Strategies

The platform architecture addresses 6 critical failure scenarios through explicit architectural mechanisms rather than optimistic assumptions:

---

### Scenario 1: Microservice Pod Crash / OOMKilled
- **Failure Event**: JVM Out-Of-Memory or unexpected panic causes a container exit.
- **System Behavior**:
  - In production multi-replica deployments:
    - Kubernetes readiness probe fails.
    - Kube-proxy / APISIX immediately removes the terminated Pod IP from the active upstream pool.
    - In-flight requests on that Pod drop; client HTTP retries (via APISIX or frontend client) succeed against surviving replicas.
    - Kubelet initiates Pod restart according to `restartPolicy: Always`.
  - In local single-replica kind:
    - Traffic returns HTTP 502/503 until the Pod finishes container restart (~10–15 seconds).
- **Data Integrity**: Any uncommitted PostgreSQL transaction is rolled back automatically by the database engine. In-flight Saga instances are detected and resumed by the `SagaRecoveryScanner` on pod startup.

---

### Scenario 2: PostgreSQL Database Connection Loss or Failover
- **Failure Event**: Primary database fails over to standby replica, or transient network partition occurs.
- **System Behavior**:
  - HikariCP connection pool detects broken TCP sockets (`testWhileIdle` / connection validation query).
  - Active in-flight queries abort with `SQLException`.
  - Spring Boot Actuator readiness probe transitions to `DOWN` within 5 seconds.
  - APISIX stops routing traffic to instances reporting readiness failure.
  - Upon database recovery, HikariCP re-establishes connections automatically. The readiness probe transitions back to `UP`.
- **Target Recovery**: Reconnection and health recovery within 30 seconds of database availability.

---

### Scenario 3: RabbitMQ Broker Temporary Outage `[PLANNED]`
- **Failure Event**: RabbitMQ broker is unreachable during a user checkout or appointment booking.
- **System Behavior**:
  - Web request threads **never write directly to RabbitMQ**.
  - All domain events are committed to the local PostgreSQL `transactional_outbox` table within the same ACID transaction as the business entity.
  - User checkouts, payments, and appointments complete with **zero failure or latency degradation**.
  - A background `OutboxPublisher` detects the broken broker connection, enters an exponential backoff sleep, and resumes dispatching buffered events once the broker reconnects.
- **Data Integrity**: Zero event loss; guaranteed at-least-once delivery to message queues.

---

### Scenario 4: External Payment Provider (Stripe) Latency or Outage
- **Failure Event**: Stripe API experiences elevated latency (> 5,000 ms) or returns HTTP 500/503.
- **System Behavior**:
  - Spring HTTP client timeout trips at 5,000 ms.
  - The Saga orchestrator transitions the checkout instance to `PENDING_RECONCILIATION`.
  - The orchestrator queries Stripe's API by `idempotency_key` before taking destructive action.
  - If Stripe confirms payment succeeded: The Saga proceeds to confirm stock and bay holds.
  - If Stripe confirms payment failed: The Saga transitions to `COMPENSATING` and releases holds.
  - If Stripe remains unreachable after bounded retries: Holds are kept until the 15-minute TTL, after which the janitor safely releases them.
- **Data Integrity**: Zero double-charging; zero abandoned resource locks.

---

### Scenario 5: Duplicate Message Delivery
- **Failure Event**: Consumer processes an event, but the acknowledgment (`basicAck`) is lost due to a transient network blip, causing broker redelivery.
- **System Behavior**:
  - Consuming services implement consumer-side deduplication using an inbox table (`processed_event_log`).
  - The incoming event UUID is inserted within the consumer's local ACID transaction.
  - If PostgreSQL throws a unique constraint violation on `event_id`, the consumer recognizes the duplicate, skips execution, and immediately acknowledges the message.
- **Data Integrity**: Zero duplicate emails, zero duplicate financial movements.

---

### Scenario 6: High Concurrency Contention on the Last Available Item
- **Failure Event**: 100 users simultaneously attempt to reserve the last 4 tires or a single service bay.
- **System Behavior**:
  - Evaluated concurrency controls (conditional SQL update or GiST exclusion constraint) serialize the write attempts at the database engine.
  - The first transaction satisfies the availability predicate and succeeds.
  - Subsequent transactions fail the availability check (`quantity_available >= requested` or temporal overlap).
  - Failed transactions return an immediate, clean HTTP `409 Conflict` without allocating resources or creating orphaned payment intents.
- **Data Integrity**: Mathematical guarantee of zero negative inventory and zero double-booking.

---

## 4. Empirical Verification & Benchmarking Methodology

To ensure that latency targets and resilience mechanisms reflect reality rather than optimistic assumptions, the platform mandates the following test suite prior to production launch:

1. **k6 Step-Load & Saturation Testing**:
   - Ramp traffic across all services up to target peak load (Scenario B: 150 RPS; Scenario C: 750 RPS).
   - Measure actual p95 and p99 response times against the SLO targets.
2. **PostgreSQL Lock-Wait & Concurrency Stress Testing**:
   - Concurrently fire 100 conflicting stock reservation requests for the same SKU.
   - Measure `pg_stat_database` and `pg_locks` lock-wait latency. Verify that lock-wait queues do not exceed connection pool limits.
3. **Chaos Mesh Fault Injection**:
   - Inject network packet loss (10%) and latency (500ms) between `automotive-operations` and `automotive-product`.
   - Terminate active Spring Boot pods mid-Saga and verify automated recovery from PostgreSQL state.
4. **Payment Gateway Mock Latency Injection**:
   - Simulate 10-second delays on Stripe endpoints using WireMock.
   - Assert that timeout triggers at 5,000 ms, client receives clean 504 Gateway Timeout, and tentative holds release.
