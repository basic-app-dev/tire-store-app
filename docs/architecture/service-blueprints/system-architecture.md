# System-Wide Architecture, Boundaries, and Capability Map

> **Status**: CANONICAL ARCHITECTURE BASELINE (Phase 2F-B-R)
> **Baseline Git HEAD**: `d6fa083cc00122b5ce32db9d16507fa54f09bca4`
> **System Boundaries**: 7 Target Standalone Spring Boot Microservices (`appointment` merged into `store-management` per `P5-DEC-01`, port 8097 retired), Next.js 14+ Web Portal, Expo Mobile App, Apache APISIX Gateway
> **Consolidated Domain Modules**: 17 Substantive Domain Modules (Store Administration, Bay Scheduling, Appointment Management consolidated in `store-management`)
> **Operational Activities**: Exactly 109 Cataloged Business Operations (Preserving 99 original activities + 10 reconciled additions)

---

## 1. System Context & Architectural Hierarchy

The Tire Store Platform operates across three primary domain groups comprising seven target standalone Spring Boot 4.2.x microservices (`P5-DEC-01`):

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        Automotive Platform Capability Hierarchy                        │
└────────────────────────────────────────────────────────────────────────────────────────┘
                                            │
    ┌───────────────────────────────────────┼───────────────────────────────────────┐
    ▼                                       ▼                                       ▼
Domain A: Automotive Services           Domain B: Used-Car Sales            Domain C: Shared Platform
  ├── automotive-operations (8091)        ├── vehicle-sales (8093)            ├── store-management (8098)
  │     ├── Cart & Checkout Module        │     ├── Sales Pipeline & Deal Mgt │     ├── Store Administration Module
  │     ├── Order & Fulfillment Module    │     └── Vehicle Sales Saga &      │     ├── Bay Scheduling Module
  │     └── Work Order & Workshop Module  │         Contracting Module        │     └── Appointment Management Module
  │                                       │                                   │         (merged from retired 8097)
  └── automotive-product (8092)           └── vehicle-product (8094)          ├── identity-access (8096)
        ├── Catalog & Services Module           ├── Vehicle Inventory &       │     ├── Identity & Access Mgt (IAM)
        ├── Vehicle Fitment Module              │   Condition Module          │     └── Customer Garage Module
        └── Branch Inventory & Stock            └── Vehicle Merchandising &   └── notification (8095) [PLANNED]
            Allocation Module                       Listing Module                  ├── Messaging & Multi-Channel
                                                                                    │   Delivery Module
                                                                                    └── Notification Governance &
                                                                                        Preferences Module
```

---

## 2. Standalone Microservice Portfolio & Port Allocations

| Service Name | Port | Primary Bounded Context | Approved Substantive Modules | Total Activities | Database / Storage Technology |
| :--- | :---: | :--- | :--- | :---: | :--- |
| **`automotive-operations`** | 8091 | Active Carts, Checkout Sagas, Orders, Fulfillment & Work Orders | Cart & Checkout, Order & Commercial Fulfillment, Work Order & Workshop Execution | 22 | PostgreSQL (orders, sagas, work orders) + Redis (active carts) |
| **`automotive-product`** | 8092 | Catalog, Automotive Services, Fitment & Branch Inventory | Catalog & Services, Vehicle Fitment, Branch Inventory & Stock Allocation | 31 | PostgreSQL (catalog, specifications, branch inventory ledger) |
| **`vehicle-sales`** | 8093 | Used-Vehicle Sales Deals, Deposits & Sales Sagas | Sales Pipeline & Deal Management, Vehicle Sales Saga & Contracting | 7 | PostgreSQL (deals, sales contracts, trade-ins) |
| **`vehicle-product`** | 8094 | VIN-Specific Vehicle Inventory, Condition & Public Listings | Vehicle Inventory & Condition, Vehicle Merchandising & Listing | 10 | PostgreSQL (VIN vehicles, inspections, photo metadata) |
| **`notification`** | 8095 | Multi-Channel Message Delivery, Templates & Preferences | Messaging & Multi-Channel Delivery, Notification Governance & Preferences | 9 | PostgreSQL (templates, delivery logs) + RabbitMQ Consumer |
| **`identity-access`** | 8096 | User Profiles, Store-Scoped RBAC & Customer Virtual Garage | Identity & Access Management (IAM), Customer Garage | 7 | PostgreSQL (profiles, store role assignments, garage vehicles) |
| **`store-management`** | 8098 | Store Administration, GiST Bay Scheduling & Customer Appointments *(absorbs retired `appointment` :8097)* | Store Administration, Bay Scheduling, Appointment Management | 23 | PostgreSQL + PostGIS (stores, hours, closures, bays, GiST holds, appointments) |
| **TOTAL** | — | **7 Target Standalone Services** | **17 Substantive Modules** | **109** | **Strict single database ownership; zero cross-database queries** |

---

## 3. Strict Architectural Invariants

1. **Independent Build & Runtime**: Each of the 7 target services (`appointment` merged into `store-management` per `P5-DEC-01`) is an independent Gradle Kotlin DSL project (`backend/services/*`) with its own wrapper and dependencies. No shared root Gradle project or cross-service `project(":")` dependencies exist.
2. **Strict Entity Ownership & Zero Cross-Database SQL**: Each microservice owns its dedicated PostgreSQL database schema and Flyway migrations (`db/migration/V*.sql`). Direct cross-database joins, shared tables, foreign keys, or cross-service JPA entities are strictly forbidden. Inter-service interaction occurs exclusively via REST (OpenAPI) or RabbitMQ domain events.
3. **No Direct Client Database Access**: Next.js (`apps/web`) and Expo (`apps/mobile`) communicate exclusively via Apache APISIX Gateway (`http://api.tirestore.local:8090`) or backend REST endpoints.
4. **Apache APISIX Role Boundary**: APISIX acts strictly as a reverse proxy, TLS termination layer, client JWT validator, and rate limiter. **APISIX is never a Saga orchestrator.**
5. **Physical Inventory vs. Allocation Invariant**:
   - Reserving stock on checkout initiation increments `quantity_reserved`.
   - Payment authorization/capture transitions `quantity_reserved` $\to$ `quantity_allocated`. **`quantity_on_hand` remains unchanged!**
   - `quantity_on_hand` and `quantity_allocated` decrement **strictly upon physical fulfillment handover** (customer pickup PIN verification or work order installation completion via `ACT-PRD-031`).
6. **Single-Store Selection & Cart Invariant (`P5-DEC-02`, supersedes multi-store checkout)**: Customers must select one store before browsing or adding items; every cart (`cart:account:{user_id}`) and checkout is scoped to one `store_id`. Changing stores requires explicit customer confirmation and an atomic version-checked cart reset.
7. **Service Package-by-Layer Code Convention**: Spring Boot services organize internal code under `com.tirestore.{service}.{module}.{layer}` (`controller`, `service`, `repository`, `model`, `dto`, `event`), preventing architectural erosion.
