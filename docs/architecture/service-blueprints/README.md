# Tire-Store-App Architecture Specifications & System Blueprints

> **Status**: CANONICAL CONSOLIDATED BLUEPRINT SUITE (Phase 2F-B-R Master Index)
> **Git Baseline**: `d6fa083cc00122b5ce32db9d16507fa54f09bca4` (Branch: `main`)
> **Scope**: Exactly 8 Standalone Spring Boot 4.2.x Microservices, Next.js 14+ Web Portal, Expo Mobile App, Apache APISIX Gateway
> **Consolidated Architecture**: **18 Substantive Domain Modules** across **14 Canonical Specifications**
> **Total Cataloged Operations**: **109 Business Activities** | **92 Unique API Endpoint Contracts**

---

## 1. Architectural Blueprint Directory & Navigation Index

This navigation directory directs developers and architects to the single canonical source of truth for every architectural dimension:

### System-Wide Architecture Specifications

| Canonical Document | Primary Architectural Role & Contents |
| :--- | :--- |
| **[`system-architecture.md`](./system-architecture.md)** | **System Architecture & Boundaries**: Capability hierarchy, microservice portfolio (ports 8091–8098), 18 substantive modules, strict isolation rules, and package-by-layer structure. |
| **[`approved-decisions.md`](./approved-decisions.md)** | **Architecture Decisions & Policies**: Authoritative ADR catalog (ADR-01 through ADR-18) and formal classification of numerical parameters (holds, TTLs, deposit amounts). |
| **[`logical-strategies.md`](./logical-strategies.md)** | **Logical Strategies & Concurrency**: Evaluated trade-offs and algorithms for inventory conditional updates, Redis active carts, cart revalidation, unified service modeling, and GiST bay scheduling. |
| **[`cross-service-workflows.md`](./cross-service-workflows.md)** | **Cross-Service Workflows & Sagas**: Complete end-to-end distributed business journeys (WF-01 through WF-12) with Mermaid sequence diagrams, state machines, and compensation paths. |
| **[`slo-and-capacity.md`](./slo-and-capacity.md)** | **SLOs, Capacity & API Standards**: Sizing models (15 to 50 stores), activity latency targets (Tier 1–4), RFC 7807 error schema, idempotency headers, and background daemons. |

---

## 2. Microservice Blueprint Portfolio (`services/`)

Each standalone microservice is fully specified in its single canonical reference file, containing bounded contexts, substantive modules, activity catalogs, API endpoint contracts, background daemons, and concurrency controls:

| Microservice Document | Port | Primary Responsibility | Modules | Activities | API Endpoints |
| :--- | :---: | :--- | :---: | :---: | :---: |
| **[`services/automotive-operations.md`](./services/automotive-operations.md)** | 8091 | Active Carts, Checkout Sagas, Orders, Work Orders, Quotes | 3 | 22 | 18 |
| **[`services/automotive-product.md`](./services/automotive-product.md)** | 8092 | Tire/Parts Catalog, Services, Fitment, Inventory Ledger | 3 | 31 | 24 |
| **[`services/vehicle-sales.md`](./services/vehicle-sales.md)** | 8093 | Used Car Deals, Test Drives, Deposits & Sales Sagas | 2 | 7 | 6 |
| **[`services/vehicle-product.md`](./services/vehicle-product.md)** | 8094 | VIN-Specific Inventory, 150-Pt Inspections, Listings | 2 | 10 | 8 |
| **[`services/notification.md`](./services/notification.md)** | 8095 | Multi-Channel Delivery (SMS, Email, Push) & Templates | 2 | 9 | 6 |
| **[`services/identity-access.md`](./services/identity-access.md)** | 8096 | User Profiles, Keycloak Sync, Store RBAC & Garage | 2 | 7 | 6 |
| **[`services/appointment.md`](./services/appointment.md)** | 8097 | Service Appointments, Rescheduling & Entitlements | 2 | 10 | 8 |
| **[`services/store-management.md`](./services/store-management.md)** | 8098 | Stores, Facilities, Hours, Capabilities & GiST Bay Holds | 2 | 13 | 10 |
| **TOTAL** | — | **8 Standalone Microservices** | **18** | **109** | **92** |

---

## 3. Physical Data Architecture & Schemas (`data-definitions/`)

Phase 2F-C provides the complete physical database models, PostgreSQL DDL schemas, Redis cart/cache structures, RabbitMQ event contracts, and data lifecycle rules:

- **[`data-definitions/README.md`](./data-definitions/README.md)**: Master data architecture index and storage directory.
- **[`data-definitions/data-ownership-and-storage.md`](./data-definitions/data-ownership-and-storage.md)**: Global authoritative entity matrix and SQL vs NoSQL technology evaluation.
- **[`data-definitions/events-and-projections.md`](./data-definitions/events-and-projections.md)**: RabbitMQ event contracts, transactional outbox design, and read projections.
- **[`data-definitions/data-lifecycle-and-capacity.md`](./data-definitions/data-lifecycle-and-capacity.md)**: Data retention, TTLs, sizing growth (15–50 stores), and disaster recovery targets.
- **[`data-definitions/services/`](./data-definitions/services/)**: Dedicated PostgreSQL DDL schemas, constraints, and indexes for all 8 microservices.

---

## 4. Implementation Road Ahead (Phase 3 Backend Engineering)

Following owner acceptance of this Phase 2F-C data architecture baseline:
- Spring Boot Flyway database migrations (`V1__initial_schema.sql`) will be implemented for each microservice.
- Redis key serialization templates and Redis Lua scripts will be coded in `automotive-operations`.
- Spring Security OIDC and APISIX JWT routing policies will be verified against the RBAC definitions.
