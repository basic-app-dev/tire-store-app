# Architecture Decision Backlog (ADR Backlog)

> **Document Status**: `AUTHORITATIVE ARCHITECTURE LOG` (Phase 2E-R Revised)  
> **Decision Framework**:
> - **`APPROVED`**: Formally approved by platform owner.
> - **`PROPOSED (RECOMMENDED)`**: Formulated best-practice recommendation ready for implementation.
> - **`OPEN / NEEDS OWNER DECISION`**: Architectural trade-off requiring explicit owner sign-off.
> - **`DEFERRED`**: Intentionally postponed until operational scale warrants.

---

## 1. Summary of Architecture Decisions

| ADR ID | Decision Title | Status | Primary Impacted Services |
| :--- | :--- | :---: | :--- |
| **ADR-01** | Ownership of Generic Vehicle Reference Data (YMMT) | `OPEN / NEEDS OWNER DECISION` | `automotive-product`, `vehicle-product` |
| **ADR-02** | Product Pricing & Promotional Rules Ownership | `PROPOSED (RECOMMENDED)` | `automotive-product`, `automotive-operations` |
| **ADR-03** | Inventory Stock Reservation Concurrency Strategy | `PROPOSED (RECOMMENDED)` | `automotive-product` |
| **ADR-04** | Physical Service Bay Exclusion Constraint Strategy | `APPROVED` | `store-management` |
| **ADR-05** | Distributed Saga Orchestration & Ownership | `APPROVED` | `automotive-operations`, `vehicle-sales`, `appointment` |
| **ADR-06** | Apache APISIX Gateway-Only Role (Non-Orchestrator) | `APPROVED` | APISIX Gateway, All Services |
| **ADR-07** | Transactional Outbox Pattern for Domain Events | `APPROVED (PLANNED)` | All 8 Microservices |
| **ADR-08** | RabbitMQ Message Broker Topology | `PROPOSED (PLANNED)` | `notification`, All Producer Services |
| **ADR-09** | End-to-End Idempotency Strategy at All Boundaries | `APPROVED (PROPOSED)` | `automotive-operations`, `vehicle-sales` |
| **ADR-10** | Database Topology: Local kind vs. Production HA | `OPEN / NEEDS OWNER DECISION` | All 8 Microservices, Platform Infra |
| **ADR-11** | Read Models & Frontend BFF Composition Strategy | `APPROVED` | Next.js Web, Expo Mobile, All Services |
| **ADR-12** | Keycloak OIDC vs. `identity-access` Boundaries | `APPROVED (PLANNED)` | `identity-access`, Platform Security |
| **ADR-13** | Observability Baseline: Micrometer & OpenTelemetry | `PROPOSED (RECOMMENDED)` | All 8 Microservices, APISIX |
| **ADR-14** | Differentiated Service-Level Objectives as Targets | `PROPOSED (RECOMMENDED)` | Platform SRE & Operations |
| **ADR-15** | Database Connection Pooling & Budgeting (PgBouncer) | `PROPOSED (RECOMMENDED)` | Platform Database Layer |
| **ADR-16** | Business Policy Parameterization (Holds & Deposits) | `PROPOSED (RECOMMENDED)` | `vehicle-sales`, `automotive-operations` |
| **ADR-17** | Workflow Engine Timing (Temporal / Camunda Evaluation)| `APPROVED` | `automotive-operations`, `vehicle-sales` |
| **ADR-18** | ArchUnit Architectural Boundary Verification | `APPROVED` | All 8 Microservice CI Pipelines |

---

## 2. Detailed Architecture Decision Records

---

### ADR-01: Ownership of Generic Vehicle Reference Data (Year/Make/Model/Trim)
- **Status**: `OPEN / NEEDS OWNER DECISION` (Prerequisite for Milestone 2 Schema Design)
- **Context**: `automotive-product` requires vehicle Year/Make/Model/Trim (YMMT) reference data to compute tire fitment. `vehicle-product` manages VIN-specific physical used vehicles. We must decide which service authoritatively stores the generic vehicle reference taxonomy.
- **Alternatives Evaluated**:
  - *Option A (Recommended)*: Authoritative ownership in `automotive-product` (Fitment Module). It is the high-volume consumer (thousands of customer fitment lookups daily). `vehicle-product` queries YMMT via REST or references external VIN decoding APIs (NHTSA vPIC).
  - *Option B*: Authoritative ownership in `vehicle-product`. Forces `vehicle-product` to store millions of generic trims it may never stock, coupling tire search back to used car inventory.
  - *Option C*: Create a 9th microservice (`vehicle-reference-service`). **Rejected** by rule (strictly 8 microservices).
- **Recommendation**: Option A.
- **Owner Approval Required**: **Yes**.

---

### ADR-02: Product Pricing & Promotional Rules Ownership
- **Status**: `PROPOSED (RECOMMENDED)`
- **Context**: Base MSRP, promotional discounts, and store-specific price overrides must be resolved before checkout.
- **Decision**: Base MSRP, promotional rules, and store overrides are owned authoritatively by `automotive-product` (Pricing Module). When an order is created, `automotive-operations` captures an immutable historical price snapshot in the order line item to ensure billing records remain tamper-proof.
- **Consequences**: Catalog cards render prices locally in sub-5ms without cross-service fan-out; orders store immutable historical prices for accounting integrity.

---

### ADR-03: Inventory Stock Reservation Concurrency Strategy
- **Status**: `PROPOSED (RECOMMENDED)`
- **Context**: Multiple users checking out the last set of tires can cause race conditions resulting in negative inventory.
- **Alternatives Evaluated**:
  - *Option A (Conditional Atomic SQL Update — Recommended)*:
    `UPDATE store_inventory SET quantity_reserved = quantity_reserved + ? WHERE store_id = ? AND sku_id = ? AND (quantity_on_hand - quantity_reserved - quantity_allocated) >= ?;`
    Executed as a single SQL statement; evaluates affected rows count (`rowsUpdated == 1`). Minimizes lock hold duration to sub-millisecond execution.
  - *Option B (Pessimistic Row Locking)*: `SELECT ... FOR UPDATE`. Guarantees serialization but holds locks across multiple statements, increasing lock-wait latency under extreme contention.
  - *Option C (Optimistic Locking `@Version`)*: Causes high abort rate under heavy promotional traffic on popular SKUs.
- **Recommendation**: Option A for inventory reservations; Option B for multi-row complex validations.

---

### ADR-04: Physical Service Bay Scheduling & Exclusion Constraint Strategy
- **Status**: `APPROVED`
- **Context**: Physical service bays cannot accommodate two vehicles simultaneously. Double-booking must be mathematically impossible.
- **Decision**: Enforce physical bay exclusion using PostgreSQL GiST Range Exclusion Constraints (`EXCLUDE USING GIST (bay_id WITH =, time_range WITH &&) WHERE (status IN ('HELD', 'CONFIRMED'))`).
- **Consequences**: Database engine rejects overlapping temporal reservations natively. Eliminates double-booking race conditions without distributed locks.

---

### ADR-05: Distributed Saga Orchestration & Domain Ownership
- **Status**: `APPROVED` (Approved Decisions B, C, & D)
- **Context**: Multi-service business workflows across independent microservice databases require transaction coordination without distributed 2PC/XA.
- **Decision**:
  1. `automotive-operations` owns the Tire Checkout Saga (orchestrates stock hold, bay hold, appointment booking, payment authorization, and compensation).
  2. `vehicle-sales` owns the Used-Vehicle Sales Saga (orchestrates VIN hold, customer deposit, sales contracts, and handover).
  3. `appointment` coordinates standalone service appointments directly with `store-management`. In checkout workflows, `appointment` acts as a participant under `automotive-operations`.
- **Consequences**: Centralized workflow visibility within each domain; durable state machines in PostgreSQL; zero circular orchestration.

---

### ADR-06: Apache APISIX Gateway-Only Role (Non-Orchestrator)
- **Status**: `APPROVED` (Approved Decision A)
- **Context**: Defining the architectural boundary between ingress traffic management and business workflow coordination.
- **Decision**: Apache APISIX is strictly the platform's API Gateway and reverse proxy. It handles route matching, TLS termination, client JWT validation, rate limiting, and request filtering. It **must never** act as a distributed transaction coordinator, manage checkout state, or execute business workflow compensations.
- **Consequences**: High-performance, stateless ingress data plane; clean domain separation.

---

### ADR-07: Transactional Outbox Pattern for Domain Events
- **Status**: `APPROVED (PLANNED)`
- **Context**: Publishing domain events to RabbitMQ must not suffer from the dual-write problem (database commit succeeds, but broker is unreachable).
- **Decision**: Producer microservices commit domain events to a local PostgreSQL `transactional_outbox` table within the same ACID transaction as the business entity. A background worker polls the table and publishes events to RabbitMQ with publisher confirms.
- **Consequences**: Guaranteed at-least-once event delivery; zero event loss during broker downtime.

---

### ADR-08: RabbitMQ Message Broker Topology
- **Status**: `PROPOSED (PLANNED)`
- **Context**: Organizing asynchronous event communication across microservices.
- **Decision**: Deploy RabbitMQ with AMQP 0-9-1 Topic Exchanges segmented by domain (`operations.events`, `product.events`, `store.events`, `sales.events`, `appointment.events`). Downstream consumers bind durable queues with Dead-Letter Exchanges (DLX) for unprocessable messages.
- **Consequences**: Predictable, lightweight message routing; decoupled async notification delivery.

---

### ADR-09: End-to-End Idempotency Strategy at All Boundaries
- **Status**: `APPROVED (PROPOSED)`
- **Context**: Preventing duplicate credit card charges, duplicate deposits, and duplicate reservations under network retries.
- **Decision**:
  1. Client sends `Idempotency-Key: <UUID>` header with checkout/deposit requests.
  2. Orchestrator passes deterministic command tokens (`X-Saga-Id`, `X-Saga-Step-Id`) to participants.
  3. External payment gateway calls include idempotency keys.
  4. Asynchronous event consumers record processed event UUIDs in an inbox table (`processed_event_log`).
- **Consequences**: Safe retries; zero duplicate charges or duplicate stock allocations.

---

### ADR-10: Database Topology: Local kind vs. Production HA
- **Status**: `OPEN / NEEDS OWNER DECISION` (Prerequisite for Milestone 0)
- **Context**: Each microservice requires dedicated schema isolation. We must decide the physical database hosting strategy.
- **Alternatives Evaluated**:
  - *Option A (Recommended for Local kind)*: Single PostgreSQL 16 container hosting 8 separate logical databases (`db_operations`, `db_product`, etc.) with distinct credentials to strictly forbid cross-database queries.
  - *Option B (Recommended for Production)*: Dedicated managed PostgreSQL instances per domain (AWS RDS / Cloud SQL) for complete physical failure isolation and independent point-in-time recovery.
- **Recommendation**: Option A for local development; Option B for cloud staging and production.
- **Owner Approval Required**: **Yes**.

---

### ADR-11: Read Models & Frontend BFF Composition Strategy
- **Status**: `APPROVED`
- **Context**: Assembling screens that display data across multiple services (e.g. Order History with tire photos and store addresses).
- **Decision**: Next.js App Router (BFF Layer) composes parallel REST calls for real-time customer screens. Orders store immutable snapshots (e.g. store name, tire brand) at the time of purchase.
- **Consequences**: Eliminates chatty microservice-to-microservice synchronous read chaining.

---

### ADR-12: Keycloak OIDC vs. `identity-access` Boundaries
- **Status**: `APPROVED (PLANNED)`
- **Context**: Dividing authentication and authorization responsibilities.
- **Decision**: Keycloak owns user credentials, password hashing, MFA, and OIDC token issuance. `identity-access` owns application profiles, store-scoped role assignments (`shop_worker`, `store_manager`), and customer garage vehicles.
- **Consequences**: Zero password storage in application databases; enterprise-grade security.

---

### ADR-13: Observability Baseline: Micrometer & OpenTelemetry
- **Status**: `PROPOSED (RECOMMENDED)`
- **Context**: Distributed tracing and metrics across 8 services and APISIX.
- **Decision**: Standardize on W3C Trace Context propagation (`traceparent` HTTP header) via Spring Boot Micrometer Tracing and OpenTelemetry. APISIX generates or forwards the trace context.
- **Consequences**: Complete cross-service request visibility and end-to-end auditability.

---

### ADR-14: Differentiated Service-Level Objectives as Targets
- **Status**: `PROPOSED (RECOMMENDED)`
- **Context**: Establishing operational uptime and latency targets.
- **Decision**: Formalize SLOs as targets: Tier 1 transactional workflows target 99.95% availability (p95 < 250ms); Tier 2 operational workflows target 99.90% (p95 < 100ms); Tier 3 notifications target 99.50% (async).
- **Consequences**: Explicit error budgets; clarity that figures represent targets rather than guarantees.

---

### ADR-15: Database Connection Pooling & Budgeting (PgBouncer)
- **Status**: `PROPOSED (RECOMMENDED)`
- **Context**: Preventing database connection exhaustion against PostgreSQL's default `max_connections = 100`.
- **Decision**: In local kind, budget 10 connections per service ($8 \times 10 = 80$ conns, within 100 limit). In production multi-replica deployments, evaluate **PgBouncer** in transaction pooling mode or tune PostgreSQL server configuration to support > 250 connections.
- **Consequences**: Prevents database connection starvation and CPU context-switching overhead.

---

### ADR-16: Business Policy Parameterization (Holds & Deposits)
- **Status**: `PROPOSED (RECOMMENDED)`
- **Context**: Establishing holding deposits, reservation durations, and hold TTLs.
- **Decision**: Parameterize holding deposit amounts ($500 default) and hold durations (48-hour vehicle hold default, 15-minute checkout bay hold default) as configurable application properties rather than hardcoded domain constants.
- **Consequences**: Allows business leadership to tune commercial policies without code refactoring.

---

### ADR-17: Dedicated Workflow Engine Timing (Temporal / Camunda Evaluation)
- **Status**: `APPROVED`
- **Context**: Evaluating whether to adopt an external workflow engine (Temporal or Camunda) immediately.
- **Decision**: Defer external workflow engines. Custom Spring Boot state machines persisting in PostgreSQL are fully sufficient for our medium-scale baseline. Re-evaluate if workflows introduce multi-day human-in-the-loop steps or transaction volume exceeds 1,000 sagas/sec.
- **Consequences**: Avoids introducing heavy external infrastructure early in development.

---

### ADR-18: ArchUnit Architectural Boundary Verification
- **Status**: `APPROVED`
- **Context**: Enforcing service boundary rules (zero cross-database access, independent packages).
- **Decision**: Enforce architectural rules in CI using **ArchUnit** tests in every Spring Boot service, asserting that no internal classes or foreign database packages are imported across boundaries.
- **Consequences**: Automated build-time enforcement of monorepo architectural rules.
