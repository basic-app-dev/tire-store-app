# Antigravity Orchestration & Project Development Rulebase — Automotive Platform

> **Primary Purpose**: Master rulebase and execution guidelines for Antigravity CLI, IDE, and Desktop App developing the Automotive Platform across Web, iOS, Android, and 8 Standalone Spring Boot Microservices.

---

## 1. Sub-Agent System Summary

Invoke specialized agents in Antigravity using `@<agent-name>`:

| Agent Handle       | Assigned Model      | Primary Responsibility & Assigned Skills                                                                                                                                                                        |
| :----------------- | :------------------ | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`@manager`**     | **Claude Opus 4.6** | **Central Orchestrator & Task Master**: High-level task breakdown, dependency DAG mapping, cross-agent delegation, blocker management, and approval-gate enforcement.<br>_Skills_: `superpowers`, `ponytail`, `fast-search`, `jira-linker` |
| **`@architect`**   | **Claude Opus 4.6** | **Database & Systems**: Independent PostgreSQL databases per service, PostGIS spatial queries, Flyway migrations, Spring Data JPA/JdbcClient schemas, RabbitMQ event contracts.<br>_Skills_: `superpowers`, `sql-optimizer`, `postgis-spatial` |
| **`@builder`**     | **Gemini 4 Hydrogen** | **Full-Stack & Backend Execution**: Java 25 / Spring Boot 4.2.x microservices (`backend/services/*`), Next.js 14+ (`apps/web`), Expo (`apps/mobile`), payment provider integrations, REST controllers.<br>_Skills_: `superpowers`, `ponytail`, `refactor-wizard`, `stripe-payments`, `expo-native` |
| **`@ui-designer`** | **Gemini 4 Hydrogen** | **UI/UX & Design System**: Cross-platform components (`packages/ui`), Tailwind CSS, mobile interactions.<br>_Skills_: `impeccable`, `tailwind-master`, `accessibility-audit`, `expo-native`                     |
| **`@qa-tester`**   | **GPT OSS 120B**      | **Automation & CI/CD**: JUnit 5 & Testcontainers (Spring Boot), ArchUnit architecture verification, Vitest unit tests, Playwright E2E tests, store role isolation assertions, GitHub Actions workflows.<br>_Skills_: `playwright`, `vitest-runner`, `ci-validator` |
| **`@scout`**       | **Gemini 4 Hydrogen** | **Fast Repo Operations**: Workspace inspection, boundary enforcement (zero cross-database access, independent Gradle builds), ESLint/formatting fixes, docs sync, Jira commits (`TIRE-xxx`).<br>_Skills_: `ponytail`, `fast-search`, `jira-linker` |

> Detailed agent guides are available in [docs/agents/](./docs/agents/README.md). Native Antigravity sub-agent definitions are located in [`.agents/agents/`](./.agents/agents/). Live tasks and issues are tracked directly in Jira.

---

## 2. Project Architecture & Workspace Boundaries

### Monorepo Structure (`pnpm` + `Turborepo` + Standalone Gradle Projects)

- **`backend/services/*`**: Eight standalone Spring Boot 4.2.x microservices running on Java 25 LTS, each with its own independent Gradle Kotlin DSL build (`settings.gradle.kts`, `build.gradle.kts`, and Gradle Wrapper):
  - `backend/services/automotive-operations` (Port 8091) — Owns automotive orders, service jobs, invoicing, and checkout orchestration.
  - `backend/services/automotive-product` (Port 8092) — Owns tires/parts, specifications/fitment, branch-level stock, reservations, adjustments, and transfers.
  - `backend/services/vehicle-sales` (Port 8093) — Owns used-vehicle sales process, deposits, transactions, and status coordination with vehicle inventory.
  - `backend/services/vehicle-product` (Port 8094) — Owns VIN-specific vehicles, listings, specifications, photos, conditions, locations, availability, and reservations.
  - `backend/services/notification` (Port 8095) — Owns notification records/templates, delivery dispatch, preferences, status, and retries.
  - `backend/services/identity-access` (Port 8096) — Owns application users, store-scoped assignments, and policies; integrates with Keycloak.
  - `backend/services/appointment` (Port 8097) — Owns appointment lifecycle, cancellations/rescheduling, booking records, and coordination with store resource reservations.
  - `backend/services/store-management` (Port 8098) — Owns branches, operating hours, service capabilities, bays/equipment capacities, resource availability, and exclusive bay reservations.
- **`apps/web`**: Next.js 14+ (App Router) — Customer web portal, product landing pages, and Admin dashboard (Port 3000).
- **`apps/mobile`**: Expo (React Native) — Unified iOS and Android mobile app (Metro Bundler Port 8081).
- **`packages/api-client`**: Client models, API fetch client, and React Query hooks.
- **`packages/ui`**: Cross-platform design tokens, colors, typography, and reusable primitives.

### Strict Architectural Boundaries

1. **Runtime & Build Independence**: Each of the eight Spring Boot services is an independent Gradle project. No shared Gradle root project or local cross-project dependencies (`project(":")`) may exist between services. Each service must build cleanly in complete filesystem isolation.
2. **Service Ownership & Data Isolation**:
   - Each service owns its dedicated PostgreSQL schema/database and Flyway migrations.
   - Direct cross-database queries, foreign keys, or shared tables are strictly forbidden; all cross-service communication occurs via REST (OpenAPI) or RabbitMQ domain events.
   - Automotive Operations owns order and checkout orchestration.
   - Automotive Product owns tire/part inventory and reservations.
   - Appointment owns appointment booking records and lifecycle.
   - Store Management owns physical resources, resource availability, and bay reservations.
3. **No Direct DB Access in Clients**: Client apps (`apps/web`, `apps/mobile`) **MUST NEVER** access databases directly. All data access must pass through Apache APISIX or backend REST APIs via generated clients.
4. **End-to-End Type Safety**: Client forms and requests validate against TypeScript models and Zod schemas in `@tire-store/api-client`. Service APIs expose OpenAPI contracts. Loose `any` types are strictly prohibited.
5. **Authoritative Domain Logic**: Vehicle fitment calculations and tire sizing math reside in authoritative domain services (`automotive-product`, `vehicle-product`), not duplicated ad-hoc across Web and Mobile.

---

## 3. Database & Security Rules (PostgreSQL + PostGIS + Keycloak OIDC)

1. **Service Database Ownership & Migrations**:
   - Each microservice owns its PostgreSQL database and Flyway migrations (`db/migration/V*.sql`).
   - DDL schema mutations in production are automated strictly through versioned migrations; automatic ORM schema generation (`ddl-auto=update`) is prohibited.
2. **Role Isolation Rules**:
   - Keycloak issues OIDC tokens; Spring Security resource servers validate JWT signatures, scopes, and store access.
   - `customer`: Access public catalog and stores; access ONLY their own profile, orders, and garage vehicles.
   - `shop_worker`: Access appointments, bay schedules, and inventory ONLY for their assigned `store_id`.
   - `store_manager`: Manage inventory, technician schedules, and settings for their assigned `store_id`.
   - `super_admin`: Unrestricted global system access.
   - Client-provided `store_id` is never trusted without backend token and role verification.
3. **Spatial & Search Optimization**:
   - Store location queries in `store-management` MUST use PostGIS spatial indexing (`ST_DWithin`, `ST_Distance`).
   - Vehicle fitment lookup (`Year` ➔ `Make` ➔ `Model` ➔ `Trim` ➔ `Tire Specs`) in `automotive-product` / `vehicle-product` must hit indexed composite columns (`year`, `make_id`, `model_id`, `trim_id`).

---

## 4. Frontend & Mobile Development Rules

### Next.js Web Rules (`apps/web`)

- Use App Router structure (`app/` directory).
- Tire catalog pages must use **Incremental Static Regeneration (ISR)** for optimal SEO performance.
- Forms must use `react-hook-form` paired with Zod schemas.

### Expo Mobile Rules (`apps/mobile`)

- Use Expo Router for file-based navigation.
- Ensure native UX compliance for both iOS and Android.
- Access hardware features (technician barcode scanner, store locator GPS) strictly through official Expo SDK modules.

### UI & Accessibility Rules (`packages/ui`)

- Adhere to WCAG 2.1 AA accessibility standards.
- Dark mode and responsive layout adaptivity are required for all UI components.

---

## 5. Checkout & Booking Workflow Rules (Saga Orchestration)

1. **Distributed Saga Transactions**:
   - Tire purchases bundled with store installation use an orchestrated Saga managed by Automotive Operations across microservices: payment authorization (via payment module adapter), inventory reservation (`automotive-product`), bay reservation (`store-management`), appointment booking (`appointment`), and customer confirmation (`notification`).
   - If any downstream step fails, compensating transactions release reserved bays and inventory. No distributed SQL transactions.
2. **Bay Scheduling & Resource Holds**:
   - Exclusive bay reservations in `store-management` must be bound to specific `store_id`, `bay_id`, and `time_slot` with concurrency controls/locking to prevent double booking.

---

## 6. Testing, CI/CD & Antigravity Execution

1. **Automated Verification**:
   - Spring Boot services must maintain JUnit 5 tests, MockMvc API tests, and Testcontainers integration tests for PostgreSQL and RabbitMQ.
   - Architecture rules must be enforced using ArchUnit (e.g. forbidding cross-service package access).
   - Frontend packages must maintain Vitest test coverage.
   - Critical user journeys (Vehicle Fitment Search, Cart Checkout Saga, Store Bay Booking) must have Playwright E2E automated test specs.
2. **Commit & Jira Traceability**:
   - Antigravity commit messages and PR descriptions must prefix the Jira ticket identifier: `TIRE-xxx: <description>`.
3. **Manual Approval Gates**:
   - All file modifications, project initializations, commits, pushes, merges, and deployments require explicit manual user approval before execution. Autonomous execution of these actions is strictly forbidden.
