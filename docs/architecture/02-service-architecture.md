# Approved Microservice Boundaries

There are **exactly eight approved business microservices**, all independent Spring Boot applications. The API gateway and frontend servers are **infrastructure/application edges**, not additional business services. Keep these boundaries unless the owner explicitly changes them.

## Domain A — Automotive Services
1. **Automotive Operations & Billing** (`automotive-operations`): Payment Module, Work Order Module, Order Module, Billing Module. Owns automotive orders, service jobs, invoicing and automotive payment coordination. Does not mutate product inventory tables.
2. **Automotive Product** (`automotive-product`): Inventory Module, Product Catalog Module. Owns tires/parts, specifications/fitment, branch-level stock, reservations, adjustments and transfers.

## Domain B — Used-Car Sales
3. **Vehicle Sales** (`vehicle-sales`): Payment Module, Sales Management Module. Owns used-vehicle sales process, deposits, transactions and status coordination with vehicle inventory.
4. **Vehicle Product** (`vehicle-product`): Vehicle Inventory Module, Vehicle Catalog Module. Owns VIN-specific vehicles, listings, specifications, photos, conditions, locations, availability and reservations.

## Domain C — Shared Platform
5. **Notification** (`notification`): Received Notification Module, Delivery Template Module. Owns notification records/templates, delivery dispatch, preferences, status and retries.
6. **Identity & Access** (`identity-access`): Authentication Integration Module, User Profile Module, Access Control Module. Owns application users, store-scoped assignments and policies; integrates with Keycloak, which issues identity tokens.
7. **Appointment** (`appointment`): Appointment Management Module. Owns appointment lifecycle, cancellations/rescheduling and coordination with store resource reservations.
8. **Store Management** (`store-management`): Resource Reservation Module, Store Information Module. Owns branches, operating hours, service capabilities, bays/equipment/resource capacities, and exclusive resource holds.

## Ownership and interaction invariants
- Every service independently builds, deploys, stores data, evolves migrations and exposes documented interfaces.
- Every business entity has an authoritative owner; no cross-service SQL access, foreign keys, repository use or shared JPA entities.
- Payments remain **domain modules** in Automotive Operations and Vehicle Sales as agreed; shared payment-provider adapter code is permissible if it does not merge domain ownership.
- Synchronous read/command operations use REST and Spring HTTP Service Clients; asynchronous domain events use RabbitMQ.
- Inventory and resource reservations must be atomic in their owner services; use expiration, concurrency control and idempotency.
- Cross-service business workflows have explicit coordination and failure compensation (Saga where appropriate). A tire checkout workflow is orchestrated by Automotive Operations.
- Each service enforces authorization for its own operations; the gateway is not sufficient for authorization.
- Internal packages/modules are **not** independent deployments by default.

## Representative flow
`Browser → Next.js SSR/BFF → APISIX or authorized internal endpoint → Spring Boot REST API`.
`Expo app → APISIX → Spring Boot REST API`.
`Service → internal Kubernetes Service DNS → service REST API`; events through RabbitMQ.

A service must not call another service's database to assemble a screen. The Next.js BFF can compose API results without taking over business logic.
