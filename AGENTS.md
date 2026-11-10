# Antigravity Orchestration & Project Development Rulebase — Tire Store App

> **Primary Purpose**: Master rulebase and execution guidelines for Antigravity CLI, IDE, and Desktop App developing the Tire Store App across Web, iOS, and Android.

---

## 1. Sub-Agent System Summary

Invoke specialized agents in Antigravity using `@<agent-name>`:

| Agent Handle       | Assigned Model      | Primary Responsibility & Assigned Skills                                                                                                                                                                        |
| :----------------- | :------------------ | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`@manager`**     | **Claude Opus 4.6** | **Central Orchestrator & Task Master**: High-level task breakdown, dependency DAG mapping, cross-agent delegation, and blocker management.<br>_Skills_: `superpowers`, `ponytail`, `fast-search`, `jira-linker` |
| **`@architect`**   | **Claude Opus 4.6** | **Database & Systems**: Supabase PostgreSQL, PostGIS queries, RLS policies, Zod schemas (`packages/types`).<br>_Skills_: `superpowers`, `sql-optimizer`, `postgis-spatial`                                      |
| **`@builder`**     | **Flash 3.8**       | **Full-Stack Core Execution**: Next.js (`apps/web`), Expo (`apps/mobile`), Stripe payments, API handlers.<br>_Skills_: `superpowers`, `ponytail`, `refactor-wizard`, `stripe-payments`, `expo-native`           |
| **`@ui-designer`** | **Flash 3.8**       | **UI/UX & Design System**: Cross-platform components (`packages/ui`), Tailwind CSS, mobile interactions.<br>_Skills_: `impeccable`, `tailwind-master`, `accessibility-audit`, `expo-native`                     |
| **`@qa-tester`**   | **GPT OSS 120B**    | **Automation & CI/CD**: Vitest unit tests, Playwright E2E tests, RLS assertions, GitHub Actions workflows.<br>_Skills_: `playwright`, `vitest-runner`, `ci-validator`                                           |
| **`@scout`**       | **Flash 3.8**       | **Fast Repo Operations**: Workspace inspection, ESLint/formatting fixes, docs sync, Jira commits (`TIRE-xxx`).<br>_Skills_: `ponytail`, `fast-search`, `jira-linker`                                            |

> Detailed agent guides are available in [docs/agents/](./docs/agents/README.md). Native Antigravity sub-agent definitions are located in [`.agents/agents/`](./.agents/agents/). Live swarm tasks and dependencies are tracked on the [Swarm Task Board](./docs/TASK_BOARD.md).

---

## 2. Project Architecture & Workspace Boundaries

### Monorepo Structure (`pnpm` + `Turborepo`)

- **`apps/web`**: Next.js 14+ (App Router) — Customer web portal, product landing pages, and Admin dashboard.
- **`apps/mobile`**: Expo (React Native) — Unified iOS and Android mobile app.
- **`packages/db`**: Supabase migration scripts, Drizzle ORM schemas, SQL functions, and seed data.
- **`packages/types`**: Shared Zod validation schemas and TypeScript type definitions.
- **`packages/api-client`**: Shared React Query API hooks and Supabase client abstractions.
- **`packages/ui`**: Cross-platform design tokens, colors, typography, and reusable primitives.

### Strict Architectural Boundaries

1. **No Direct DB Access in Clients**: Client apps (`apps/web`, `apps/mobile`) **MUST NEVER** import `@tire-store/db` or write raw SQL. All data access must pass through the Supabase JS SDK or `@tire-store/api-client`.
2. **End-to-End Type Safety**: All API requests, forms, and database payloads must validate against Zod schemas in `packages/types`. Loose `any` types are strictly prohibited.
3. **Shared Business Logic**: Vehicle fitment calculations, tire sizing math, cart totals, and appointment bay logic must reside in shared packages (`packages/types` / `packages/api-client`), not duplicated across Web and Mobile.

---

## 3. Database & Security Rules (Supabase + PostGIS + RLS)

1. **Mandatory Row Level Security (RLS)**:
   - EVERY newly created table must execute `ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;`.
   - Security policies must strictly enforce user roles (`customer`, `shop_worker`, `store_manager`, `super_admin`) via Supabase JWT custom claims.
2. **Role Isolation Rules**:
   - `customer`: Can read public catalog/stores; can read/write ONLY their own profile, orders, and saved vehicles.
   - `shop_worker`: Can access appointments, bay schedules, and inventory ONLY for their assigned `store_id`.
   - `store_manager`: Full management of inventory, technician schedules, and settings for their assigned `store_id`.
   - `super_admin`: Unrestricted global system access.
3. **Spatial & Search Optimization**:
   - Store location queries MUST use PostGIS spatial indexing (`ST_DWithin`, `ST_Distance`).
   - Vehicle fitment lookup (`Year` ➔ `Make` ➔ `Model` ➔ `Trim` ➔ `Tire Specs`) must hit indexed composite columns (`year`, `make_id`, `model_id`, `trim_id`).

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

## 5. Stripe & Booking Workflow Rules

1. **Atomic Checkout Transactions**:
   - Tire purchases bundled with store installation MUST create a Stripe PaymentIntent and write an `appointments` record in a single atomic database RPC call.
2. **Bay Scheduling Rules**:
   - Appointments must be bound to specific `store_id`, `bay_id`, and `time_slot` to enforce slot availability and prevent double booking.

---

## 6. Testing, CI/CD & Antigravity Execution

1. **Automated Verification**:
   - Any schema modification requires corresponding unit test coverage in `packages/db`.
   - Critical user journeys (Vehicle Fitment Search, Cart Checkout, Store Bay Booking) must have Playwright E2E automated test specs.
2. **Commit & Jira Traceability**:
   - Antigravity commit messages and PR descriptions must prefix the Jira ticket identifier: `TIRE-xxx: <description>`.
