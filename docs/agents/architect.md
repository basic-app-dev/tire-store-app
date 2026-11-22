# @architect — Database & Systems Architect

[← Back to Agent Overview](README.md)

- **Role**: Database & Systems Architect
- **Assigned Model**: Claude Opus 4.6
- **Assigned Skills**: `superpowers`, `sql-optimizer`, `postgis-spatial`
- **Native Definition**: [`.agents/agents/architect.md`](../../.agents/agents/architect.md)

---

## 1. Domain & Scope

The `@architect` is responsible for all core system designs, relational schemas, spatial search models, and security layers across the platform.

### Key Focus Areas

1. **Microservice Persistence & Migrations**:
   - Service database schema modeling and Flyway migration scripts.
   - PostGIS spatial calculations for store locator queries (`ST_DWithin`, `ST_Distance`) in `store-management`.
   - Composite indexing for vehicle fitment (`year`, `make_id`, `model_id`, `trim_id`) in product services.
2. **Service Boundaries & Domain Data Ownership**:
   - Strict service ownership: `appointment` owns appointment records and lifecycle; `store-management` owns physical bays, resource availability, and bay reservations; `automotive-operations` owns orders and checkout orchestration; `automotive-product` owns tire stock and reservations.
   - Versioned RabbitMQ event contracts, transactional outbox models, and dead-letter queue routing.
3. **API Contracts & Security Modeling**:
   - OpenAPI specifications and Keycloak OIDC role-based access rules (`customer`, `shop_worker`, `store_manager`, `super_admin`).
4. **Zod Validation Schemas (`packages/types`)**:
   - Aligning client validation schemas with backend OpenAPI specifications.

---

## 2. Typical Prompts & Tasks (Illustrative)

- _"@architect design the Flyway schema migration for the appointment service booking records and lifecycle."_
- _"@architect design the resource reservation and bay hold schema in store-management with concurrency control."_
- _"@architect optimize the PostGIS query in store-management for finding installation centers within a 25-mile radius."_
- _"@architect define the OpenAPI contract and RabbitMQ event schema for order checkout Saga events in automotive-operations."_
