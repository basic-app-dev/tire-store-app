# Architecture Patterns & Technology Evaluation

> **Document Status**: `PROPOSED EVALUATION` / `APPROVED DECISIONS` (Phase 2E-R Revised)  
> **Key Architecture Decisions**:
> - Orchestrated Sagas owned by `automotive-operations` and `vehicle-sales` (Approved Decisions B & C).
> - APISIX is strictly the API gateway, not an orchestrator (Approved Decision A).
> - Independent databases per service; **no distributed 2PC/XA**.
> - Technology Status explicitly marked: `[EXISTING]`, `[PLANNED]`, `[PROPOSED]`, or `[AVOID]`.

---

## 1. Architectural Pattern Classification Matrix

Every candidate architecture pattern is evaluated against actual business criticality, operational cost, and team complexity for a medium-scale automotive retail platform (15–50 physical stores):

```
Pattern Classification Rubric:
  [ESSENTIAL NOW]   - Core architectural foundation for correctness, data integrity, and failure isolation.
  [CONDITIONAL]     - Valuable when justified by measured traffic, database contention, or operational scale.
  [AVOID SCALE]     - Excessive operational complexity, fragility, or premature optimization for medium scale.
```

---

### A. Essential Patterns (Adopt for Phase 3 Foundation)

| Pattern | Problem Solved | Applicable Services | Engineering Justification & Trade-offs | Complexity | Alternative Considered | Status |
| :--- | :--- | :--- | :--- | :---: | :--- | :---: |
| **Domain-Driven Design (Bounded Contexts)** | Prevents cross-service coupling and domain blurring. | All 8 microservices. | Explicit boundaries around business models; independent domain lifecycles. | Low-Med | Shared monolith (rejected). | **ESSENTIAL NOW** |
| **Modular Architecture (Package-by-Feature)** | Prevents spaghetti dependencies within microservices. | All 8 Spring Boot services. | Cohesive domain packages; clean visibility (`package-private`); high maintainability. | Low | Package-by-layer (controllers/repos) exposing internals. | **ESSENTIAL NOW** |
| **Local ACID Transactions** | Guarantees transactional consistency within service boundaries. | All 8 microservices. | Complete atomicity within a single database schema; standard Spring `@Transactional`. | Low | Non-transactional updates (data corruption). | **ESSENTIAL NOW** |
| **Database Uniqueness & Exclusion Constraints** | Prevents duplicate VINs, duplicate reservations, and overlapping bay bookings. | `store-management`, `vehicle-product`, `automotive-operations`. | Hard mathematical guarantees enforced by the PostgreSQL engine (`EXCLUDE USING GIST`, `UNIQUE`). | Low-Med | Application-only validation checks (race-condition prone). | **ESSENTIAL NOW** |
| **Idempotency Keys at All Boundaries** | Protects payments, holds, and mutations from duplicate submission under network retries. | `automotive-operations`, `vehicle-sales`, Downstream APIs. | Safe client and network retries; eliminates double-charging and duplicate reservations. | Med | User patience / client-side button disabling (fragile). | **ESSENTIAL NOW** |
| **Orchestrated Saga Pattern** | Coordinates distributed business workflows across independent microservices. | `automotive-operations` (Checkout), `vehicle-sales` (Used Car Sales). | Centralized visibility, durable state machine, explicit compensations, deterministic recovery. | Med | Choreography (scattered state) or 2PC (blocking locks). | **ESSENTIAL NOW** |
| **Transactional Outbox Pattern** `[PLANNED]` | Guarantees reliable domain event publishing without distributed 2PC. | All services publishing domain events. | Eliminates dual-write failure (DB committed but message broker down); zero message loss. | Med | Publishing directly in HTTP thread (lossy during outages). | **ESSENTIAL NOW** |
| **Timeouts & Bounded Retries** | Prevents cascading service thread pool exhaustion. | Inter-service REST calls, Stripe calls. | Fails fast on unresponsive dependencies; exponential backoff prevents stampeding thundering herds. | Low | Indefinite HTTP timeouts (crashes upstream services). | **ESSENTIAL NOW** |
| **Reconciliation & Manual Review States** | Resolves uncertain distributed outcomes (e.g. payment gateway timeouts). | `automotive-operations`, `vehicle-sales`. | Prevents data drift when automated compensation cannot resolve safely; clear operational audit. | Med | Silent failure or un-audited retry loops. | **ESSENTIAL NOW** |
| **Testcontainers Integration Testing** | Validates real database constraints and migrations during CI. | All 8 microservices. | Tests run against real PostgreSQL and PostGIS instances, catching constraint and SQL syntax bugs. | Low | H2 in-memory DB (misses PostGIS, GiST, and locking). | **ESSENTIAL NOW** |

---

### B. Conditional Patterns (Adopt When Justified by Measured Metrics)

| Pattern | Problem Solved | Applicable Workloads | Conditions That Justify Adoption | Complexity | Current Alternative | Status |
| :--- | :--- | :--- | :--- | :---: | :--- | :---: |
| **Conditional Atomic SQL Updates** | Non-negative inventory reservation without explicit row locking. | `automotive-product` (Stock Reservations). | High concurrent checkouts on the same SKU where `SELECT ... FOR UPDATE` causes lock wait queues. | Low | `SELECT ... FOR UPDATE` (Pessimistic Locking). | **CONDITIONAL** |
| **Caffeine In-Memory L1 Cache** | Offloads high-frequency static reads within a single JVM. | `automotive-product` (Fitment), `store-management` (Hours). | Fitment lookups or store directories exceed 50 RPS per replica; static data with low change frequency. | Low | Direct PostgreSQL query hitting B-Tree indexes. | **CONDITIONAL** |
| **Redis Cache-Aside (L2)** | Distributed cache across multiple service replicas. | Catalog search, fitment reference data. | Cache hit rate must be shared across > 3 replicas, or PostgreSQL buffer cache memory is constrained. | Med | Single-pod Caffeine L1 cache + PostgreSQL query cache. | **CONDITIONAL (Phase 4)** |
| **PgBouncer Connection Pooling** | Manages PostgreSQL connection explosion from multiple replicas. | Platform-wide database access. | Total application connections $\sum (\text{replicas} \times \text{pool\_size})$ exceeds PostgreSQL `max_connections`. | Med | In-app HikariCP pooling within tuned PostgreSQL limits. | **CONDITIONAL** |
| **Read Replicas** | Separates read-heavy traffic from transactional writes. | `automotive-product`, `vehicle-product`. | Catalog search read volume exceeds primary database I/O capacity (> 500 read queries/sec). | Med | Primary database with composite B-Tree indexes. | **CONDITIONAL** |
| **Spring Modulith** | Formally validates module boundaries within a service. | `automotive-product`, `automotive-operations`. | Service internal modules grow complex, requiring automated ArchUnit boundary tests. | Low-Med | Clean package structure and manual code reviews. | **CONDITIONAL** |
| **Dedicated Workflow Engine (Temporal / Camunda)** | Manages long-running multi-day business workflows. | `vehicle-sales` (Vehicle Deals). | Workflows span days or weeks with complex human-in-the-loop steps (e.g. 7-day DMV title processing). | High | Custom Spring Boot state machine in PostgreSQL. | **CONDITIONAL (Phase 5+)** |

---

### C. Anti-Patterns to Avoid at Medium Scale

| Anti-Pattern | Description & Why It Is Rejected | Negative Consequences for Medium Scale | Approved Alternative |
| :--- | :--- | :--- | :--- |
| **Global Saga Orchestrator** | A single central microservice orchestrating unrelated business processes across the entire enterprise. | Creates a massive operational bottleneck, couples unrelated domain releases, and violates team autonomy. | Domain-specific orchestrators: `automotive-operations` for orders; `vehicle-sales` for used cars. |
| **Distributed 2PC / XA Transactions** | Two-phase commit holding database locks across network boundaries. | High latency, coordinator deadlock vulnerability, poor cloud database support, incompatible with external APIs (Stripe). | Orchestrated Sagas with compensating transactions. |
| **Full Event Sourcing** | Persisting all aggregate state solely as an append-only stream of events. | Extreme cognitive overhead, event schema versioning complexity, difficult query capability; unwarranted for medium scale. | Relational state + Append-only Audit Ledger (`stock_movement`, `saga_instance`). |
| **Premature Database Sharding** | Partitioning database tables across multiple physical database clusters. | Unnecessary operational overhead for medium scale (< 200 GB annual data growth); breaks transactional consistency. | PostgreSQL with proper indexing, partitioning if needed, and managed vertical scaling. |
| **Service Mesh (Istio / Linkerd)** | Injecting sidecar proxies into every Kubernetes Pod for mTLS and routing. | Excessive CPU and RAM overhead, debugging complexity, and configuration friction. | Apache APISIX Ingress Controller + Kubernetes NetworkPolicies. |
| **Microservice-per-Module** | Splitting every business module (e.g. Fitment, Pricing, Reservations) into its own deployed container. | Network latency explosion, operational overhead, cross-service chatty queries, loss of local ACID boundaries. | Keep related modules in a single modular microservice (`automotive-product`). |

---

## 2. In-Depth Concurrency Strategy Evaluation

Managing concurrent access to scarce resources (physical tire inventory, physical service bays, unique vehicles) requires choosing the appropriate concurrency mechanism for each specific workload.

### Concurrency Mechanism Comparison

| Architectural Dimension | 1. Pessimistic Row Locking (`SELECT ... FOR UPDATE`) | 2. Conditional Atomic SQL Update | 3. Optimistic Version Checking (`@Version`) | 4. GiST Exclusion Constraints (`EXCLUDE USING GIST`) |
| :--- | :--- | :--- | :--- | :--- |
| **Core Mechanism** | PostgreSQL acquires exclusive row lock; subsequent transactions block until commit/rollback. | Single `UPDATE ... WHERE condition` decrements available quantity atomically. | Hibernate checks version field on update; fails if modified by another transaction. | PostgreSQL checks generalized index for overlapping ranges or identical attributes. |
| **Correctness Guarantee** | **100% ACID**: Guaranteed single-thread execution on locked row; zero overselling. | **100% ACID**: Atomic predicate evaluation at row level; zero overselling. | **100% ACID**: Lost updates impossible; detects concurrent modification. | **100% Mathematical Guarantee**: Overlapping ranges physically rejected by engine. |
| **Contention Behavior** | Blocked threads wait in lock queue; lock-wait timeout trips if queue is too deep. | Transactions execute single row update in milliseconds; minimal lock holding time. | Fails immediately with `OptimisticLockException`; requires client retry loop. | Fails immediately with constraint violation `23P01`; transaction aborts cleanly. |
| **Deadlock Risk** | **Moderate**: If multiple rows are locked in non-deterministic order. | **Low**: Single row update per SKU. | **Zero**: No row locks held. | **Zero**: Constraint check is evaluated during index insertion. |
| **Transaction Duration** | Extended if remote HTTP calls or complex validation occur while holding the lock. | Minimal (< 5 ms): Lock is held only for the duration of the single SQL statement. | Minimal (< 5 ms): Lock is held only during the final SQL update. | Minimal (< 5 ms): Evaluated during index insertion. |
| **Throughput Under Load** | Moderate (100–500 writes/sec per row before lock contention escalates). | **High** (> 1,000 writes/sec per row); database engine handles atomic updates efficiently. | Low under high contention (massive client abort rate on popular items). | High for scheduling inserts; relies on GiST index lookups. |
| **Complexity** | Low: Standard JPA or Spring `JdbcClient` query. | Low: Single SQL update statement with affected row count check (`rowsUpdated == 1`). | Low: Standard JPA `@Version` annotation. | Low-Med: Requires PostgreSQL `btree_gist` extension and `tsrange` types. |
| **Optimal Use Case** | Complex multi-row validations where multiple related tables must be checked before reserving. | **Tire/Parts Inventory Reservation**: Decrementing available stock while verifying `available >= requested`. | **Work Order Updates**, **Customer Profile Edits**, entity mutations with low write conflict. | **Service Bay Reservations**: Preventing temporal overlap on physical service bays. |

### Concrete Concurrency Recommendation for the Platform

1. **For Tire/Parts Stock Reservations (`automotive-product`)**:
   - **Recommended Approach**: **Conditional Atomic SQL Update**:
     ```sql
     UPDATE store_inventory 
     SET quantity_reserved = quantity_reserved + :requestedQuantity,
         updated_at = NOW()
     WHERE store_id = :storeId 
       AND sku_id = :skuId 
       AND (quantity_on_hand - quantity_reserved - quantity_allocated) >= :requestedQuantity;
     ```
   - *Justification*: Minimizes lock hold duration to sub-millisecond statement execution. If `rowsUpdated == 1`, reservation succeeded; if `rowsUpdated == 0`, stock is insufficient, returning an immediate HTTP 409 Conflict.
2. **For Physical Service Bay Scheduling (`store-management`)**:
   - **Recommended Approach**: **PostgreSQL GiST Range Exclusion Constraint**:
     ```sql
     ALTER TABLE bay_reservation 
     ADD CONSTRAINT exclude_overlapping_bays 
     EXCLUDE USING GIST (bay_id WITH =, time_range WITH &&) 
     WHERE (status IN ('HELD', 'CONFIRMED'));
     ```
   - *Justification*: Mathematically eliminates double-booking at the database engine level with zero reliance on application-layer timing.
3. **For VIN-Specific Vehicle Holds (`vehicle-product`)**:
   - **Recommended Approach**: **Conditional Atomic State Transition**:
     ```sql
     UPDATE vehicle_unit 
     SET status = 'HELD', updated_at = NOW() 
     WHERE id = :vehicleId AND status = 'AVAILABLE';
     ```
   - *Justification*: Enforces single-winner semantics on the VIN without holding extended row locks.

---

## 3. Technology Stack Status & Roadmap

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              Technology Adoption Status Summary                        │
├──────────────────────────┬─────────────────────────────┬───────────────────────────────┤
│    [EXISTING / VERIFIED] │          [PLANNED]          │      [AVOID CURRENT SCALE]    │
│  - Java 25 LTS           │  - Spring Data JPA / Hib    │  - Full Event Sourcing        │
│  - Spring Boot 4.2.0     │  - Flyway 10.x Migrations   │  - OpenSearch / Elasticsearch │
│  - Gradle Wrapper 9.9.2  │  - PostgreSQL 16+ / PostGIS │  - Apache Kafka (RabbitMQ OK) │
│  - Docker Engine 29.9.2  │  - RabbitMQ 3.13+ Broker    │  - Istio Service Mesh         │
│  - kind v0.33.0          │  - Keycloak 24+ OIDC        │  - Distributed 2PC (XA)       │
│  - Kubernetes v1.32.2    │  - Transactional Outbox     │  - Global Orchestration Svc   │
│  - Apache APISIX 3.21.0  │  - Resilience4j Circuit Brk │  - Premature DB Sharding      │
│  - Gateway API v1.2.1    │  - Testcontainers 1.20+     │                               │
│  - pnpm & Turborepo      │  - OpenTelemetry Tracing    │                               │
└──────────────────────────┴─────────────────────────────┴───────────────────────────────┘
```
