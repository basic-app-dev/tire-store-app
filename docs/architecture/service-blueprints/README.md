# Tire-Store-App Architecture Blueprints & Capability Modeling

> **Status**: Comprehensive Architecture Specification (Phase 2E-R Revised Baseline)  
> **Git Baseline**: `90084eb21496c07116b3c626bd0f7ea18c834d45` (Branch: `main`)  
> **System Scope**: Exactly 8 Standalone Spring Boot 4.2.x Microservices, Next.js 14+ Web Portal, Expo Mobile App, Apache APISIX Gateway  
> **Target Scale**: Medium-Scale Regional Automotive Retail & Service Chain (15–50 physical stores, 10–25 bays/store, 100k+ tire/part SKUs)

---

## 1. Architectural Blueprint Directory

This blueprint suite defines the functional capability models, domain boundaries, transactional invariants, distributed cross-service sagas, nonfunctional constraints, technology evaluations, and implementation roadmaps for the entire platform.

### System-Wide Architecture Blueprints

| Document | Title | Primary Focus & Deliverables |
| :--- | :--- | :--- |
| **[`00-system-capability-map.md`](./00-system-capability-map.md)** | System Capability Map | Capability hierarchy (Level 1–3), external actor directory, Mermaid cross-service boundary map, system-wide invariants, and high-level activity index (99 activities). |
| **[`01-service-boundaries.md`](./01-service-boundaries.md)** | Service Boundaries & Entity Ownership | Authoritative entity ownership matrix across 27 domain entities, read projections vs synchronous fan-out analysis, two-stage tentative hold patterns. |
| **[`02-cross-service-workflows.md`](./02-cross-service-workflows.md)** | Cross-Service Workflows | Detailed end-to-end specifications for 12 critical business workflows, orchestrator vs choreographer patterns, distributed saga step lifecycles, and failure compensations. |
| **[`03-nonfunctional-requirements.md`](./03-nonfunctional-requirements.md)** | Nonfunctional Requirements & SLOs | Differentiated operation classes, target SLO matrix (Tier 1: 99.95%, Tier 2: 99.90%, Tier 3: 99.50%), RTO/RPO targets, and 6 resilience recovery scenarios. |
| **[`04-patterns-and-technology-evaluation.md`](./04-patterns-and-technology-evaluation.md)** | Patterns & Technology Evaluation | Pattern evaluation across Essential Now, Conditional, and Avoid categories; deep concurrency comparison (conditional updates vs pessimistic locks vs GiST exclusion). |
| **[`05-capacity-and-reliability-model.md`](./05-capacity-and-reliability-model.md)** | Capacity & Reliability Sizing Model | Concrete mathematical derivations for 15, 50, and Peak Rush loads; Little's Law RPS calculations, traffic amplification matrix, and PostgreSQL connection pool budgeting. |
| **[`06-architecture-decision-backlog.md`](./06-architecture-decision-backlog.md)** | Architecture Decision Backlog (ADRs) | 18 formal Architecture Decision Records (ADR-01 through ADR-18) covering generic vehicle data, pricing, locking, sagas, gateway boundaries, outbox, and connection budgeting. |
| **[`07-implementation-roadmap.md`](./07-implementation-roadmap.md)** | Phased Implementation Roadmap | Phased implementation DAG from Milestone 0 to Milestone 6, critical path analysis, contract/database/testing exit gates, and MVP vs Medium-Scale scoping breakdown. |
| **[`08-saga-orchestration.md`](./08-saga-orchestration.md)** | Distributed Saga Orchestration | Dedicated master blueprint covering 20 core saga dimensions: orchestration vs choreography, APISIX gateway separation, durable PostgreSQL state machine, idempotency, compensations, and crash recovery. |

---

## 2. Microservice Blueprint Directory

Each standalone microservice maintains an authoritative blueprint detailing its internal modules, complete activity catalog, domain entities, transaction locking semantics, candidate REST APIs, candidate RabbitMQ events, and technology stack.

```
docs/architecture/service-blueprints/services/
├── automotive-operations.md  # Port 8091 — Checkout Saga Orchestration & Work Orders
├── automotive-product.md     # Port 8092 — Tire/Part Catalog, Fitment & Stock Reservations
├── vehicle-sales.md          # Port 8093 — Vehicle Sales Saga & Purchase Contracts
├── vehicle-product.md        # Port 8094 — VIN Inventory, Vehicle Listings & Vehicle Holds
├── notification.md           # Port 8095 — Multi-Channel Delivery & Async Dispatch [PLANNED]
├── identity-access.md        # Port 8096 — Customer Profiles, Store-Scoped RBAC & Garage
├── appointment.md            # Port 8097 — Appointment Lifecycle & Booking Coordination
└── store-management.md       # Port 8098 — Store Directory, PostGIS & Physical Bay Holds
```

### Domain Group A: Core Commerce & Shop Execution

* **[`automotive-product.md`](./services/automotive-product.md)** (`automotive-product`, Port 8092)  
  *Modules*: Catalog, Fitment, Inventory, Stock Reservation, Pricing, Search.  
  *Core Capabilities*: Tier-1 tire & parts catalog, Year/Make/Model/Trim (YMMT) vehicle fitment lookup, branch-level stock tracking, conditional atomic updates / row locks, pricing overrides. Cataloged **28 functional activities**.
* **[`automotive-operations.md`](./services/automotive-operations.md)** (`automotive-operations`, Port 8091)  
  *Modules*: Orders, Checkout Saga Orchestrator, Payments & Billing, Work Orders, Fulfillment.  
  *Core Capabilities*: Master checkout orchestrator, multi-phase distributed saga execution, Stripe webhook idempotency, repair work orders, invoice generation, customer refund coordination. Cataloged **16 functional activities**.
* **[`store-management.md`](./services/store-management.md)** (`store-management`, Port 8098)  
  *Modules*: Store Directory, Operating Hours, Capabilities, Bay Registry, Exclusive Bay Reservations.  
  *Core Capabilities*: PostGIS spatial radius queries (`ST_DWithin`), bay schedule registry, PostgreSQL GiST range exclusion constraints (`EXCLUDE USING GIST`) preventing physical double-booking. Cataloged **13 functional activities**.
* **[`appointment.md`](./services/appointment.md)** (`appointment`, Port 8097)  
  *Modules*: Appointment Lifecycle, Customer Scheduling, Booking Coordination, Calendar Passes.  
  *Core Capabilities*: Customer appointment records, standalone appointment coordination with physical store bay holds, technician check-in, dynamic reschedule workflows, Apple Wallet/Google Wallet calendar (.ics) generation. Cataloged **9 functional activities**.

### Domain Group B: Dealership & Used Vehicle Operations

* **[`vehicle-product.md`](./services/vehicle-product.md)** (`vehicle-product`, Port 8094)  
  *Modules*: VIN Inventory, Vehicle Listings, Condition & Inspection, Vehicle Holds, Photo Assets.  
  *Core Capabilities*: VIN 17-character validation and uniqueness, vehicle specification sheets, digital inspection reports, exclusive customer holds with automatic TTL expiry, CDN photo asset management. Cataloged **10 functional activities**.
* **[`vehicle-sales.md`](./services/vehicle-sales.md)** (`vehicle-sales`, Port 8093)  
  *Modules*: Sales Pipeline, Vehicle Sales Saga Orchestrator, Deposits, Contracts & Disclosures, Delivery Handover.  
  *Core Capabilities*: Lead-to-deal CRM pipeline, vehicle reservation deposit charging and refunds, state-mandated digital purchase contracts and truth-in-lending disclosures, delivery scheduling. Cataloged **7 functional activities**.

### Domain Group C: Platform & Customer Foundation

* **[`identity-access.md`](./services/identity-access.md)** (`identity-access`, Port 8096)  
  *Modules*: User Profiles, Store-Scoped RBAC, Customer Garage, Keycloak Sync.  
  *Core Capabilities*: Synchronization of Keycloak OIDC users, store-scoped role policies (`shop_worker`, `store_manager` pinned to `store_id`), customer digital garage (persisted vehicle profiles with mileage tracking). Cataloged **7 functional activities**.
* **[`notification.md`](./services/notification.md)** (`notification`, Port 8095) `[PLANNED]`  
  *Modules*: Templates, Dispatcher, Preferences, Reliability/DLQ.  
  *Core Capabilities*: Decoupled async message consumer, multi-channel delivery (Email via AWS SES, SMS via Twilio, Push via Firebase FCM), customer channel preferences, automated retries with Dead Letter Queue (DLQ). Cataloged **9 functional activities**.

---

## 3. Status Legend

To maintain engineering accuracy and distinguish verified implementation from architectural designs, all statements adhere to one of six status codes:

| Status Code | Definition & Engineering Authority |
| :--- | :--- |
| **`[EXISTING]`** | **Verified Implementation**: Confirmed in the working tree (Java 25, Gradle builds, Dockerfiles, kind cluster, Helm charts, APISIX routing). |
| **`[APPROVED]`** | **Owner-Approved Decision**: Codified in repository rules or explicitly decided by platform leadership (e.g. strict 8 microservices, no direct DB queries from client, Saga domain ownership). |
| **`[PROPOSED]`** | **Architectural Recommendation**: Technically verified best-practice design formulated during capability modeling; awaiting milestone scheduling. |
| **`[TARGET]`** | **Desired Measurable Outcome**: Future performance or operational objective (e.g. 99.95% availability SLO target, p95 < 250ms latency target). |
| **`[ASSUMPTION]`** | **Planning Parameter**: Hypothetical modeling baseline used for capacity and connection budgeting (e.g. 50 stores, 150 peak RPS). |
| **`[OPEN]`** | **Requires Owner Decision**: Explicit design fork requiring stakeholder consensus prior to schema implementation (ADR-01, ADR-10). |

---

## 4. Reading Paths by Role

### Software Engineers & Implementers
1. Start with [`00-system-capability-map.md`](./00-system-capability-map.md) to understand overall system boundaries and critical transactional invariants.
2. Review [`08-saga-orchestration.md`](./08-saga-orchestration.md) for distributed transaction rules, idempotency tokens, and compensation mechanisms.
3. Review your assigned microservice blueprint in [`services/`](./services/).
4. Consult [`02-cross-service-workflows.md`](./02-cross-service-workflows.md) to verify API request/response contracts and event payloads for your service's interactions.

### Database & Systems Architects
1. Examine [`01-service-boundaries.md`](./01-service-boundaries.md) for strict entity ownership, foreign key boundaries, and read projections.
2. Review concurrency mechanisms in [`04-patterns-and-technology-evaluation.md`](./04-patterns-and-technology-evaluation.md) and connection budgeting in [`05-capacity-and-reliability-model.md`](./05-capacity-and-reliability-model.md).
3. Review database topology trade-offs in ADR-10 and connection pool budgeting in ADR-15.

### QA, Test Automation & DevOps Engineers
1. Study the 6 disaster scenarios and recovery procedures in [`03-nonfunctional-requirements.md`](./03-nonfunctional-requirements.md).
2. Examine the mathematical load profiles (Initial, Medium-Scale, Peak Rush) and k6 verification plan in [`05-capacity-and-reliability-model.md`](./05-capacity-and-reliability-model.md).
3. Review the test automation gates (JUnit 5, Testcontainers, ArchUnit, Playwright, Vitest) in [`07-implementation-roadmap.md`](./07-implementation-roadmap.md).

### Engineering Leadership & Product Management
1. Review the executive summary in [`00-system-capability-map.md`](./00-system-capability-map.md).
2. Review the 18 Architecture Decision Records in [`06-architecture-decision-backlog.md`](./06-architecture-decision-backlog.md) to approve open architectural decisions (ADR-01, ADR-10).
3. Review the Milestone DAG (M0 to M6) and MVP vs Medium-Scale scoping in [`07-implementation-roadmap.md`](./07-implementation-roadmap.md).
