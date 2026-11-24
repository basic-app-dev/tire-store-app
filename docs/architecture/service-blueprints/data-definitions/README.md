# Tire-Store-App Data Architecture & Database Engineering Specifications

> **Status**: AUTHORITATIVE DATA ARCHITECTURE SPECIFICATION (Phase 2F-C)
> **Scope**: 8 Microservices, Dedicated PostgreSQL Schemas, Redis Cart/Cache Data Models, RabbitMQ Contracts & Outbox Architecture
> **Key Architectural Mandates**:
> - Strictly 8 standalone microservice databases; zero shared tables or cross-database joins.
> - Database-per-service ownership, not database-per-physical-store.
> - PostgreSQL is the authoritative system of record for all financial, commercial, and operational state.
> - Redis is the primary store for active shopping carts and ephemeral performance caches.
> - Cross-service references use logical UUIDs / strings, never cross-database foreign keys.

---

## 1. Directory Structure & Navigation

The data definitions suite is organized into global system-wide specifications and service-specific schema files:

### System-Wide Data Specifications
| Document | Primary Focus & Deliverables |
| :--- | :--- |
| **[`data-ownership-and-storage.md`](./data-ownership-and-storage.md)** | **Global Data Ownership Matrix**: Complete authoritative entity inventory, writer services, read consumers, persistence engines, consistency models, and SQL vs NoSQL technology decisions. |
| **[`events-and-projections.md`](./events-and-projections.md)** | **RabbitMQ Event Contracts & Read Projections**: Event schemas, transactional outbox design, event ordering, consumer deduplication, and read-only projections. |
| **[`data-lifecycle-and-capacity.md`](./data-lifecycle-and-capacity.md)** | **Data Lifecycles, Sizing & Disaster Recovery**: TTLs, retention, partition archival, 15-to-50 store capacity modeling, connection pooling, and backup/restore RPO/RTO targets. |

---

## 2. Microservice Physical Data Specifications (`services/`)

Each standalone microservice owns an implementation-ready data specification detailing tables, column types, primary/foreign keys, check constraints, indexes, Redis keys, and transaction boundaries:

| Service Specification | Port | Primary Storage | Key Tables / Redis Namespaces |
| :--- | :---: | :--- | :--- |
| **[`services/automotive-operations.md`](./services/automotive-operations.md)** | 8091 | PostgreSQL + Redis | `orders`, `order_items`, `checkout_saga_instance`, `work_orders`, `work_order_tasks`, `supplemental_quotes`; Redis `cart:{id}` |
| **[`services/automotive-product.md`](./services/automotive-product.md)** | 8092 | PostgreSQL | `product_skus`, `tire_specifications`, `service_definitions`, `pricing_rules`, `store_inventory`, `stock_reservations`, `stock_movements` |
| **[`services/vehicle-sales.md`](./services/vehicle-sales.md)** | 8093 | PostgreSQL + S3 | `sales_deals`, `holding_deposits`, `sales_contracts`, `trade_in_appraisals`, `vehicle_sales_sagas` |
| **[`services/vehicle-product.md`](./services/vehicle-product.md)** | 8094 | PostgreSQL + S3 | `vin_vehicles`, `mechanical_inspections`, `vin_sales_holds`, `vehicle_listings`, `vehicle_photos` |
| **[`services/notification.md`](./services/notification.md)** | 8095 | PostgreSQL | `notification_templates`, `customer_preferences`, `notification_requests`, `delivery_attempts` |
| **[`identity-access.md`](./services/identity-access.md)** | 8096 | PostgreSQL | `user_profiles`, `store_role_assignments`, `customer_garage_vehicles` |
| **[`appointment.md`](./services/appointment.md)** | 8097 | PostgreSQL | `service_appointments`, `appointment_reschedule_logs`, `service_entitlements` |
| **[`store-management.md`](./services/store-management.md)** | 8098 | PostgreSQL + PostGIS | `store_branches`, `store_operating_hours`, `service_bays`, `bay_schedule_entries` (GiST range) |
