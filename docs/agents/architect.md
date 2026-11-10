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

1. **Supabase PostgreSQL & PostGIS**:
   - Schema modeling in `packages/db`.
   - PostGIS geographic calculations for the nearest store locator (`ST_DWithin`, `ST_Distance`).
   - Composite indexing for vehicle fitment (`year`, `make_id`, `model_id`, `trim_id`).
2. **Row Level Security (RLS)**:
   - Defining and auditing RLS policies using Supabase custom JWT claims (`auth.jwt() ->> 'user_role'`, `auth.jwt() ->> 'store_id'`).
   - Role isolation for `customer`, `shop_worker`, `store_manager`, and `super_admin`.
3. **Zod Validation Schemas (`packages/types`)**:
   - Authoring strict Zod schemas for all domain entities.
   - Deriving TypeScript types to maintain end-to-end type safety without loose `any`.
4. **PostgreSQL RPCs**:
   - Writing atomic stored procedures for checkout and service bay reservations.

---

## 2. Typical Prompts & Tasks

- _"@architect create the database schema migration for service bay scheduling with double-booking prevention."_
- _"@architect optimize the PostGIS query for finding tire installation centers within a 25-mile radius."_
- _"@architect define the Zod schema for vehicle fitment lookup in packages/types."_
