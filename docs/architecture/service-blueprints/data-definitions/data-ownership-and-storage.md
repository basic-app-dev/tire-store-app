# Global Data Ownership Matrix & Datastore Technology Decisions

> **Status**: AUTHORITATIVE DATA GOVERNANCE SPECIFICATION (Phase 2F-C)
> **Applicability**: All 8 Standalone Microservices

---

## 1. Global Data Ownership Matrix

Every piece of mutable business state has exactly one authoritative owning service. Other services may hold read-only projections, temporary caches, or immutable point-in-time snapshots.

| Logical Business Entity | Authoritative Owner | Owning Module | Storage Engine | Scope & Identifier | Read Consumers | Consistency Model | Retention Policy |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Physical Product** | `automotive-product` | Catalog & Services | PostgreSQL | Global UUID (`physical_product.id`, `sku_code`) | Operations, Search, Web/Mobile | Strong Authoritative | Active (`ON DELETE RESTRICT`, no archival state machine) |
| **Typed Category Specs** | `automotive-product` | Catalog & Services | PostgreSQL | 1:1 on `(physical_product_id, category_code)` (`tire_spec`, `wiper_spec`, `wheel_spec`, `brake_spec`, extensible via additive `<cat>_spec` or schema-validated `extra_specs`) | Operations, Web/Mobile | Strong Authoritative | Permanent |
| **Service Variant** | `automotive-product` | Catalog & Services | PostgreSQL | Global UUID (`service.id`, `service_code`) | Operations, Appointment, Web | Strong Authoritative | Permanent |
| **Store Service Price** | `automotive-product` | Catalog & Services | PostgreSQL | `(store_id, service_id)` (`price_cents` USD) | Operations, Web/Mobile | Strong Authoritative | Current Active (no price history) |
| **Vehicle Configuration & Fitment** | `automotive-product` | Vehicle Fitment | PostgreSQL | `vehicle_configuration` + category evidence tables | Identity, Web/Mobile | Strong Authoritative | Permanent Reference |
| **Branch Inventory Balance** | `automotive-product` | Branch Inventory | PostgreSQL | `(store_id, physical_product_id)` | Operations, Web/Mobile | Strong Authoritative | Permanent Active |
| **Stock Reservation (Hold)** | `automotive-product` | Branch Inventory | PostgreSQL | UUID (`stock_reservation_group.id`, `stock_reservation_line.id`) | Operations (Checkout Entry) | Local ACID | 10m TTL (`P3-DEC-07`) / Janitor Purge |
| **Confirmed Allocation** | `automotive-product` | Branch Inventory | PostgreSQL | `(store_id, physical_product_id)` counter + line | Operations, Fulfillment | Local ACID | Until Partial/Full Handover |
| **Inventory Operation Audit** | `automotive-product` | Branch Inventory | PostgreSQL (Unpartitioned) | UUID (`inventory_operation.operation_id`) | Staff, Audit | Immutable Exactly-Once | Operational Audit (`stock_movements` / transfers / quarantine `DEFERRED_BY_OWNER_V1`) |
| **Active Shopping Cart** | `automotive-operations`| Cart & Checkout | Redis String JSON | `cart:account:{user_id}` (`cart_id`, `version`, `(store_id, item_type, item_id)`) | Web, Mobile, Operations | In-Memory / Lua Atomic | 7-day TTL (`P4-DEC-01`; no guest carts in V1) |
| **Commercial Order** | `automotive-operations`| Order & Fulfillment | PostgreSQL | UUID (`order_id`, parent across stores) | Customer, Staff, Accounting | Local ACID | 7 Years (Permanent) |
| **Order Fulfillment Group** | `automotive-operations`| Order & Fulfillment | PostgreSQL | `(order_id, store_id)` (`order_fulfillment_groups`) | Customer, Store Staff, Workshop | Local ACID | 7 Years (Permanent) |
| **Order Line Snapshot** | `automotive-operations`| Order & Fulfillment | PostgreSQL | UUID (`order_line_id`) | Customer, Workshop, Invoicing| Immutable Snapshot | 7 Years |
| **Checkout Saga State** | `automotive-operations`| Cart & Checkout | PostgreSQL | UUID (`saga_id`) | Recovery Daemon, Operations | Local ACID | 90 Days post-completion |
| **Work Order Ticket** | `automotive-operations`| Work Order Execution| PostgreSQL | UUID (`work_order_id`) | Technicians, Store Staff | Local ACID / Pessimistic | 7 Years (Permanent) |
| **Work Order Task Checklist** | `automotive-operations`| Work Order Execution| PostgreSQL | UUID (`task_id`) | Technicians, Shop Workers | Local ACID | 7 Years |
| **Supplemental Repair Quote** | `automotive-operations`| Work Order Execution| PostgreSQL | UUID (`quote_id`, `revision`) | Customer, Service Advisor | Local ACID / Cryptographic | 7 Years |
| **Service Entitlement** | `automotive-operations`| Order & Fulfillment | PostgreSQL | UUID (`entitlement_token`) | Appointment, Customer | Local ACID | 365 Days (Configurable) |
| **Physical Store Branch** | `store-management` | Store Facilities | PostgreSQL + PostGIS| UUID (`store_id`) | All Services, APISIX | Strong Authoritative | Permanent Active |
| **Store Operating Hours** | `store-management` | Store Facilities | PostgreSQL | `(store_id, day_of_week)` | Appointment, Operations, Web | Strong Authoritative | Permanent Active |
| **Service Bay Facility** | `store-management` | Bay Scheduling | PostgreSQL | UUID (`bay_id`) | Operations, Appointment | Strong Authoritative | Permanent Active |
| **Bay Schedule Entry** | `store-management` | Bay Scheduling | PostgreSQL (GiST) | UUID (`schedule_entry_id`) | Operations, Appointment | GiST Range Exclusion | Active Schedule + 90d Audit |
| **Customer Appointment** | `appointment` | Appointment Mgt | PostgreSQL | UUID (`appointment_id`) | Customer, Store Staff | Local ACID | 3 Years |
| **VIN Physical Vehicle** | `vehicle-product` | Vehicle Inventory | PostgreSQL | 17-char `vin` | Sales, Public Listings | Strong Authoritative | Permanent Vehicle Record |
| **150-Point Inspection** | `vehicle-product` | Vehicle Condition | PostgreSQL (JSONB) | UUID (`inspection_id`) | Sales, Customer, Workshop | Immutable Snapshot | Permanent |
| **Exclusive VIN Sales Hold**| `vehicle-product` | Vehicle Inventory | PostgreSQL | 17-char `vin` | Sales Saga | Local ACID | 72h TTL / Janitor Purge |
| **Vehicle Listing & Media** | `vehicle-product` | Merchandising | PostgreSQL + S3 | 17-char `vin` | Public Buyers, Web/Mobile | Eventual / CDN Cache | Until Vehicle SOLD |
| **Vehicle Sales Deal** | `vehicle-sales` | Deal Pipeline | PostgreSQL | UUID (`deal_id`) | Customer, Finance Staff | Local ACID | Permanent |
| **Vehicle Sales Contract** | `vehicle-sales` | Contracting | PostgreSQL + S3 | UUID (`contract_id`) | Customer, Legal, DMV | Immutable Digital Sign | 10 Years Legal Retention |
| **User Profile & Identity** | `identity-access` | IAM | PostgreSQL | Keycloak `sub` UUID | Customer, Auth Gate | Strong Authoritative | Account Active |
| **Store-Scoped Staff Role** | `identity-access` | IAM | PostgreSQL | `(user_id, store_id, role)` | APISIX, Spring Security | Strong Authoritative | Assignment Active |
| **Customer Virtual Garage** | `identity-access` | Customer Garage | PostgreSQL | UUID (`garage_vehicle_id`) | Customer, Fitment, Operations | Strong Authoritative | User Managed |
| **Notification Template** | `notification` | Governance | PostgreSQL | String Code + Version | Operations, Appointment, Sales | Versioned Read | Permanent |
| **Delivery Attempt & Log** | `notification` | Multi-Channel Delivery| PostgreSQL | UUID (`attempt_id`) | Audit, Staff | Immutable Log | 1 Year |
| **Transactional Outbox (`outbox_event`)** | Each Producing Service | Messaging Infrastructure | PostgreSQL (`<service_schema>`) | UUID (`id` / `event_id`) | Own `TransactionalOutboxRelay` | Local ACID (`PENDING`/`CLAIMED`/`PUBLISHED`/`BLOCKED`) | 7 Days post-publish (`PUBLISHED` only) |
| **Consumer Inbox (`consumer_inbox`)** | Each Consuming Service | Messaging Infrastructure | PostgreSQL (`<service_schema>`) | `(consumer_name, event_id)` | Own Event Handlers | Local ACID Deduplication | Operational Retention Window |

---

## 2. Storage Technology Evaluation & Justification

### 2.1 Technology Evaluation Matrix
| Evaluation Criteria | PostgreSQL 16+ | Redis 7.2 (AOF everysec) | MongoDB / DynamoDB (Evaluated) | MinIO / AWS S3 (Object Store) |
| :--- | :--- | :--- | :--- | :--- |
| **Point Read Latency** | 1–3 ms (Indexed B-Tree) | < 1 ms (In-Memory) | 2–5 ms | 50–150 ms (via CDN) |
| **Transactional ACID** | Full ACID / Serializable | Single-command / Lua atomic | Document-level atomic | Eventual Consistency |
| **Complex Spatial / Range**| Native PostGIS & GiST `tsrange`| Not suitable for complex range | Limited 2D spatial; no range exclusion | Not applicable |
| **Write Amplification** | Moderate (WAL + Indexes) | Low (In-Memory + periodic AOF) | High (WiredTiger journal + docs) | Negligible (blob upload) |
| **Operational Burden** | Standardized relational DB | Extremely low; high velocity | Additional cluster/backup tooling | Fully managed / standard S3 API |
| **Selected Role** | **Core Database for All 8 Services** | **Active Shopping Carts & Caches** | **REJECTED (Unnecessary complexity)**| **Vehicle Photos, PDFs, Contracts** |

### 2.2 Rejection of Document Databases (MongoDB / DynamoDB)
- **Why Rejected**: Introducing MongoDB or DynamoDB alongside PostgreSQL for an 8-microservice regional retail chain with 15–50 stores creates substantial operational overhead (dual database backup regimes, separate monitoring, schema drift, cognitive friction).
- PostgreSQL 16+ provides robust `JSONB` support with GIN indexing for flexible attributes (such as 150-point inspection checklists or service configuration properties) while preserving full ACID constraints, transactional outbox integrity, and relational foreign keys within each service boundary.
