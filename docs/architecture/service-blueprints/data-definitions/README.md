# Tire-Store-App Data Architecture & Database Engineering Specifications

> **Status**: AUTHORITATIVE DATA ARCHITECTURE SPECIFICATION (Phase 2F-C + Part 1 Foundations)
> **Scope**: 8 Microservices, Dedicated Logical PostgreSQL Databases & Matching Schemas, Redis Cart/Cache Data Models, RabbitMQ Contracts (`tirestore.events`) & Outbox/Inbox Architecture
> **Key Architectural Mandates**:
> - Strictly 8 standalone microservice databases, each with **one logical PostgreSQL database and one matching named schema** (e.g., `automotive_operations`); zero shared tables or cross-database joins.
> - Separate Flyway migration role (DDL on own schema only, explicit `schemas`/`defaultSchema`) and least-privilege runtime role (DML only, zero cross-service grants).
> - Every producing/consuming service owns `<service_schema>.outbox_event` and `<service_schema>.consumer_inbox` inside its own schema.
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
| **[`services/automotive-product.md`](./services/automotive-product.md)** | 8092 | PostgreSQL | `product_category`, `brand`, `physical_product`, `tire_spec`, `wiper_spec`, `wheel_spec`, `brake_spec`, `service`, `store_service_price`, `vehicle_configuration`, fitment evidence, `store_inventory`, `stock_reservations`, `stock_movements` |
| **[`services/vehicle-sales.md`](./services/vehicle-sales.md)** | 8093 | PostgreSQL + S3 | `sales_deals`, `holding_deposits`, `sales_contracts`, `trade_in_appraisals`, `vehicle_sales_sagas` |
| **[`services/vehicle-product.md`](./services/vehicle-product.md)** | 8094 | PostgreSQL + S3 | `vin_vehicles`, `mechanical_inspections`, `vin_sales_holds`, `vehicle_listings`, `vehicle_photos` |
| **[`services/notification.md`](./services/notification.md)** | 8095 | PostgreSQL | `notification_templates`, `customer_preferences`, `notification_requests`, `delivery_attempts` |
| **[`identity-access.md`](./services/identity-access.md)** | 8096 | PostgreSQL | `user_profiles`, `store_role_assignments`, `customer_garage_vehicles` |
| **[`appointment.md`](./services/appointment.md)** | 8097 | PostgreSQL | `service_appointments`, `appointment_reschedule_logs`, `service_entitlements` |
| **[`store-management.md`](./services/store-management.md)** | 8098 | PostgreSQL + PostGIS | `store_branches`, `store_operating_hours`, `service_bays`, `bay_schedule_entries` (GiST range) |

---

## 3. PostgreSQL Schema & Role Isolation Verification Recipe (`OPS-01` — `NOT RUN` in Part 1)

When Phase 3 Flyway migrations are implemented, execute this repeatable verification against a fresh empty PostgreSQL instance:

1. **Migration Role Execution**: Run Flyway for each service with `spring.flyway.schemas=<service_schema>` and `spring.flyway.default-schema=<service_schema>` using the dedicated `<service>_migrator` role (granted `CREATE` on `<service_schema>` only).
2. **Object & Schema Inspection**:
   ```sql
   SELECT table_schema, table_name
   FROM information_schema.tables
   WHERE table_schema = '<service_schema>'
   ORDER BY table_name;
   ```
   Confirm all domain tables, `outbox_event`, `consumer_inbox`, and `flyway_schema_history` reside strictly in `<service_schema>` (zero objects leaked into `public` or other schemas).
3. **Runtime Least-Privilege & Cross-Service Denial**:
   ```sql
   -- Verify runtime role has DML only (no CREATE/DDL) and zero cross-service access:
   SELECT has_schema_privilege('<service>_app', '<service_schema>', 'USAGE'),
          has_schema_privilege('<service>_app', '<service_schema>', 'CREATE'),
          has_schema_privilege('<service>_app', '<other_service_schema>', 'USAGE');
   -- Expected: (true, false, false); cross-database/schema SELECT must fail with permission denied.
   ```
