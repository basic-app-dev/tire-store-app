# Service Boundaries & Data Ownership Matrix

> **Document Status**: `AUTHORITATIVE ARCHITECTURE MATRIX` (Phase 2E-R Revised)  
> **Key Architecture Decisions**:
> - Single authoritative writable owner per entity.
> - Zero direct cross-database queries or shared foreign keys.
> - Tentative holds and final allocations are local ACID transactions; **no distributed 2PC**.
> - Financial transaction state is decoupled from order state.

---

## 1. Domain Ownership Principles

In accordance with strict Domain-Driven Design (DDD) bounded context boundaries:
1. **Single Authoritative Writable Owner**: Every business entity is owned exclusively by exactly one microservice. Only the owning service is permitted to perform SQL inserts, updates, or deletes on that entity.
2. **Zero Direct Cross-Service Database Access**: No service may query another service's database directly, create cross-database foreign keys, or share JPA entity definitions.
3. **Synchronous REST Contracts for Commands**: Orchestrated actions requiring immediate confirmation (e.g. reserving physical stock) execute via versioned REST APIs.
4. **Asynchronous Event Propagation for Facts**: When domain state changes (e.g., `operations.order.paid`), the owning service emits an immutable integration event via the Transactional Outbox to RabbitMQ. Downstream consumers maintain their own read projections where appropriate.
5. **Tentative Reservations vs. Final Allocations**: Downstream resource owners (`automotive-product`, `store-management`, `vehicle-product`) support two-stage lifecycle operations:
   - Tentative Hold (`POST /reservations`): Time-bounded reservation with a TTL.
   - Final Confirmation (`POST /reservations/{id}/confirm`): Commits allocation upon payment.
   - Idempotent Release (`DELETE /reservations/{id}`): Compensating call releasing resources upon saga failure.

---

## 2. Authoritative Entity Ownership Matrix

| Domain Entity | Authoritative Owner Service | Permitted Writers | Direct Consumers (Sync REST) | Event Subscribers (Async via MQ) | Stale Data Tolerance | Business Description |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Product Brand & Family** | `automotive-product` | `super_admin` | Web, Mobile, Operations | Search Indexer | High (hours) | Commercial manufacturer taxonomy and model lines. |
| **Product SKU & Dimensions** | `automotive-product` | `super_admin` | Web, Mobile, Operations | Search Indexer | High (hours) | Physical tire/part specs, width, ratio, diameter, load/speed ratings. |
| **Vehicle Fitment Rule** | `automotive-product` | `super_admin`, Data Feed | Web, Mobile | None | High (days) | OEM and optional sizing rules mapped to Year/Make/Model/Trim. |
| **Store Stock Balance** | `automotive-product` | `store_manager`, Operations | Operations (ATP check) | Low-Stock Alerts | Zero during reservation | Ledger of on-hand, allocated, and reserved physical inventory per store. |
| **Stock Reservation** | `automotive-product` | `automotive-operations` | Operations | None | Zero (strict ACID) | Time-bounded hold on physical SKU quantity during checkout. |
| **Retail Store & Location** | `store-management` | `super_admin`, `store_manager` | Web, Mobile, Appt, Ops | Operations, Identity | High (days) | Store address, phone, PostGIS coordinates, active status. |
| **Operating Hours & Closures** | `store-management` | `store_manager` | Web, Mobile, Appt | None | Medium (hours) | Weekly recurring schedules and holiday blackout dates. |
| **Service Bay & Equipment** | `store-management` | `store_manager` | Appt, Operations | None | Medium (hours) | Physical lift specifications, bay types, capacity limits. |
| **Bay Reservation** | `store-management` | `appointment`, Operations | Appointment, Operations | None | Zero (strict ACID) | Exclusive time-range hold preventing physical bay double-booking. |
| **Customer Appointment** | `appointment` | Customer, `store_manager` | Web, Mobile, Operations | Notification `[PLANNED]` | Low (seconds) | Customer booking record, scheduled arrival time, service type. |
| **Customer Order & Line Items**| `automotive-operations` | Customer, Operations | Web, Mobile | Notification `[PLANNED]` | Zero (strict ACID) | Commercial purchase contract for goods and installation services. |
| **Checkout Session / Saga Instance**| `automotive-operations`| Customer, Saga Worker | Web, Mobile | None | Zero (strict ACID) | Distributed checkout state machine coordinating downstream holds. |
| **Payment Transaction** | `automotive-operations` | Operations, Stripe Webhook | Web, Mobile | Notification `[PLANNED]` | Zero (strict ACID) | PaymentIntent ID, captured funds, failure logs, refund records. |
| **Invoice & Credit Note** | `automotive-operations` | Operations | Customer, Store Staff | Accounting Sync | High (immutable) | Legal accounting document generated upon payment capture. |
| **Work Order (Service Job)** | `automotive-operations` | `shop_worker`, `store_manager` | Store Tech Portal | None | Low (seconds) | Workshop ticket tracking technician labor, parts, completion. |
| **Used Vehicle Unit (VIN)** | `vehicle-product` | `store_manager`, Inspector | Web, Mobile, Sales | None | Low (seconds) | Physical vehicle instance, VIN checksum, condition, odometer. |
| **Vehicle Listing** | `vehicle-product` | Sales Manager | Web, Mobile | Search Indexer | Medium (minutes) | Public listing price, photos, options, publication state. |
| **Vehicle Inspection Report** | `vehicle-product` | Certified Inspector | Web, Mobile, Sales | None | High (immutable) | 150-point inspection results, tire/brake wear measurements. |
| **Vehicle Hold** | `vehicle-product` | `vehicle-sales` | Vehicle Sales | None | Zero (strict ACID) | Exclusive hold on specific VIN preventing double-selling. |
| **Vehicle Sales Deal & Lead** | `vehicle-sales` | Customer, Sales Rep | Web, Mobile, Store | None | Low (seconds) | Negotiation pipeline, trade-in valuation, customer offers. |
| **Vehicle Deposit** | `vehicle-sales` | Customer, Finance Mgr | Web, Mobile | Notification, Product | Zero (strict ACID) | Monetary deposit securing vehicle hold (proposed default: $500). |
| **Vehicle Purchase Contract** | `vehicle-sales` | Finance Mgr, Customer | Web, Store Staff | Notification, Product | Zero (strict ACID) | Legally binding vehicle purchase agreement and disclosures. |
| **Application User Profile** | `identity-access` | Customer, Staff, Keycloak | Web, Mobile, Staff | Notification `[PLANNED]` | Medium (minutes) | User name, phone, preferences, linked Keycloak subject ID. |
| **Store Role Assignment** | `identity-access` | `store_manager`, Admin | Spring Security Context | Gateway Claims | Zero (immediate) | Role (`shop_worker`, `store_manager`) scoped to specific `store_id`. |
| **Customer Garage Vehicle** | `identity-access` | Customer | Web, Mobile | None | High (hours) | Customer saved vehicles for 1-click fitment matching. |
| **Notification Template** | `notification` | `super_admin`, Marketing | Notification Engine | None | High (hours) | Localized message templates for Email, SMS, Push. |
| **Notification Job & Log** | `notification` | System (Event Consumer) | Admin Audit Dashboard | None | Eventual | Outbound dispatch status, provider responses, retry counts. |

---

## 3. Read Projections vs. Synchronous Fan-Out

To avoid cascading latency from synchronous call chains, the platform enforces a **Read-Model Projection Strategy**:

### Pattern A: Next.js Backend-for-Frontend (BFF) Composition
- *Use Case*: Product Detail Page with Local Store Stock.
- *Mechanism*: Next.js App Router parallelly calls `automotive-product` (for tire specs) and `store-management` (for store hours), aggregating the response on the server side. No microservice calls another microservice merely to format a display screen.

### Pattern B: Immutable Event Snapshots (Local Projections)
- *Use Case*: Displaying store name on an order receipt inside `automotive-operations`.
- *Mechanism*: When an order is created, `automotive-operations` stores an immutable snapshot of `store_name` and `store_address` in its order record, rather than synchronously querying `store-management` every time an invoice is viewed.
