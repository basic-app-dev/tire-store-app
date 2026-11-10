# 🏎️ Tire Store App — Monorepo Architecture & Command Reference

> **Architectural Blueprint**: Scalable Monorepo powered by **Turborepo**, **pnpm**, **Next.js 14+ (App Router)**, **Expo (React Native)**, and **Supabase (PostgreSQL + PostGIS + Drizzle ORM)**.

---

## 1. Directory Tree & Architecture Overview

```
tire-store-app/
├── apps/
│   ├── web/                     # 🌐 Next.js 14+ App Router (Web Customer Portal & Admin)
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── layout.tsx   # Root layout with header, navigation & providers
│   │   │   │   ├── page.tsx     # Landing page (Hero search, fitment selector, featured tires)
│   │   │   │   ├── catalog/     # Tire catalog (filter by size, season, brand, warranty)
│   │   │   │   ├── stores/      # PostGIS Store Locator (radius search & service bays)
│   │   │   │   ├── checkout/    # Dynamic bay scheduling & atomic checkout
│   │   │   │   └── admin/       # Live Store Portal & Technician Bay Management
│   │   │   └── globals.css      # Automotive design tokens & Tailwind styles
│   │   ├── next.config.mjs      # Transpilation for shared monorepo packages
│   │   ├── tailwind.config.ts   # Uses @tire-store/tailwind-config preset
│   │   ├── tsconfig.json        # Extends @tire-store/typescript-config/nextjs.json
│   │   └── package.json         # @tire-store/web
│   │
│   ├── mobile/                  # 📱 Expo SDK 52+ / React Native (iOS & Android)
│   │   ├── src/
│   │   │   └── app/
│   │   │       ├── _layout.tsx           # Root navigation stack & QueryClientProvider
│   │   │       ├── (tabs)/
│   │   │       │   ├── _layout.tsx       # Bottom tab bar (Fitment, Tires, Stores, My Bays)
│   │   │       │   ├── index.tsx         # Mobile home with fitment search & door jamb scanner
│   │   │       │   ├── catalog.tsx       # Mobile tire catalog list
│   │   │       │   ├── stores.tsx        # GPS nearby store locator
│   │   │       │   └── appointments.tsx  # Confirmed bay booking passes
│   │   │       ├── scan-vin.tsx          # Camera scanner modal (VIN barcode / tire spec)
│   │   │       └── checkout.tsx          # Mobile bay booking & checkout screen
│   │   ├── app.json             # Expo configuration (permissions: GPS, Camera)
│   │   ├── metro.config.js      # Monorepo workspace resolver
│   │   ├── babel.config.js      # Expo Babel preset
│   │   └── package.json         # @tire-store/mobile
│   │
│   └── api/                     # ⚙️ Dedicated Node.js Backend API Server (Port 4000)
│       ├── src/
│       │   └── index.ts         # REST API server (Fitments, Tires, PostGIS Stores, Bay Calc)
│       ├── tsconfig.json        # Extends @tire-store/typescript-config/base.json
│       └── package.json         # @tire-store/api
│
├── scripts/                     # 🚀 Executable Shell Automation Scripts
│   ├── start-all.sh             # Launches both backend & frontend in background
│   ├── stop-all.sh              # Gracefully stops all active services
│   ├── start-backend.sh         # Starts apps/api on port 4000 (background or -f)
│   ├── stop-backend.sh          # Stops apps/api and frees port 4000
│   ├── start-frontend.sh        # Starts apps/web on port 3000 (background or -f)
│   ├── stop-frontend.sh         # Stops apps/web and frees port 3000
│   ├── status.sh                # Inspects live health of all ports (4000, 3000, 8081)
│   └── db.sh                    # CLI for deploy, seed, verify & drizzle studio
│
├── packages/
│   ├── db/                      # 🗄️ Database Layer (Supabase Migrations, Drizzle Schemas, PostGIS)
│   │   ├── src/
│   │   │   ├── schema/          # Drizzle ORM schemas (tires, fitments, stores, bays, orders)
│   │   │   ├── apply-migrations.ts # Automated SQL migration deployer
│   │   │   ├── seed.ts          # Idempotent database seeder (Top 6 makes, tires, stores, bays)
│   │   │   └── verify-supabase.ts # Live connectivity, table & RPC status verification
│   │   └── package.json         # @tire-store/db
│   │
│   ├── types/                   # 📐 Shared Zod Schemas & Domain Logic
│   │   ├── src/
│   │   │   ├── calculator.ts    # Pure dynamic bay duration calculation engine
│   │   │   ├── tires.ts         # Tire dimension & spec Zod schemas
│   │   │   ├── vehicles.ts      # Year/Make/Model/Trim fitment schemas
│   │   │   ├── stores.ts        # PostGIS store & bay schemas
│   │   │   ├── appointments.ts  # Bay slot scheduling input/output contracts
│   │   │   └── orders.ts        # Atomic checkout payloads
│   │   └── package.json         # @tire-store/types
│   │
│   ├── api-client/              # 🔌 Client Data Access Layer (React Query & Supabase Client)
│   │   ├── src/
│   │   │   ├── query-keys.ts    # TanStack Query key factory
│   │   │   └── supabase.ts      # Supabase JS SDK client factory
│   │   └── package.json         # @tire-store/api-client
│   │
│   ├── ui/                      # 🎨 Cross-Platform UI Design System & Primitives
│   │   ├── src/
│   │   │   └── components/      # Button, Badge, Card, TireCard
│   │   └── package.json         # @tire-store/ui
│   │
│   ├── tailwind-config/         # 🎨 Shared Automotive Tailwind Design Tokens
│   │   ├── tokens.js            # asphalt, alloy, raceRed, pitAmber, nitroBlue, certifiedGreen
│   │   └── tailwind.config.js   # Shared base Tailwind preset
│   │
│   ├── typescript-config/       # ⚙️ Shared TypeScript Configs
│   │   ├── base.json
│   │   ├── nextjs.json
│   │   └── react-library.json
│   │
│   └── eslint-config/           # 🛡️ Shared ESLint & Boundary Rule Enforcement
│       └── apps.js              # Forbids @tire-store/db in frontend apps
│
├── supabase/
│   └── migrations/              # 📜 PostgreSQL DDL & RPC SQL Migrations
│       ├── 20261108000000_init_postgis_and_rls.sql
│       ├── 20261108000001_core_tables.sql
│       ├── 20261108000002_postgis_locator_rpc.sql
│       ├── 20261108000003_atomic_checkout_rpc.sql
│       └── 20261108000004_rls_policies.sql
│
├── .env                         # Confidential local/cloud environment credentials
├── pnpm-workspace.yaml          # Monorepo package glob definition
├── turbo.json                   # Turborepo task pipeline DAG & caching config
└── package.json                 # Monorepo root scripts & orchestration
```

---

## 2. Strict Architectural Boundaries

1. **No Direct DB Access in Clients**:
   - `apps/web` and `apps/mobile` **MUST NEVER** import `@tire-store/db` or run raw SQL queries.
   - All data fetching must go through `@tire-store/api-client` or the Supabase JS SDK.
2. **End-to-End Type Safety**:
   - All forms, search filters, and checkout payloads validate against Zod schemas in `@tire-store/types`.
3. **Shared Business Logic**:
   - Vehicle fitment math and dynamic bay duration algorithms (`calculateBayDuration`) reside exclusively in `@tire-store/types`, guaranteeing 100% logic parity across Web, Mobile, and Backend.

---

## 3. Master Command Reference

### A. Frontend Web App (`apps/web`)

| Action | Command | URL / Notes |
| :--- | :--- | :--- |
| **Start Web Dev Server** | `pnpm dev:web` | Starts Next.js 14 App Router on `http://localhost:3000` |
| **Build Web App** | `pnpm --filter @tire-store/web build` | Production ISR & static build |
| **Start Web Production** | `pnpm --filter @tire-store/web start` | Serves production build |
| **Typecheck Web** | `pnpm --filter @tire-store/web typecheck` | TypeScript verification |

---

### B. Mobile App (`apps/mobile`)

| Action | Command | Notes |
| :--- | :--- | :--- |
| **Start Expo Dev Server** | `pnpm dev:mobile` | Starts Expo dev server with QR code for Expo Go |
| **Launch on iOS Simulator** | `pnpm --filter @tire-store/mobile run ios` | Boots iOS Simulator |
| **Launch on Android Emulator**| `pnpm --filter @tire-store/mobile run android` | Boots Android Emulator |
| **Launch Mobile Web Preview**| `pnpm --filter @tire-store/mobile run web` | Opens mobile web interface on `http://localhost:8081` |
| **Typecheck Mobile** | `pnpm --filter @tire-store/mobile typecheck`| TypeScript verification |

---

### C. Backend API Server (`apps/api`)

| Action | Command | URL / Notes |
| :--- | :--- | :--- |
| **Start Backend API Dev Server** | `pnpm dev:api` | Starts Node.js REST API on `http://localhost:4000` |
| **Build Backend API** | `pnpm --filter @tire-store/api build` | Compiles TypeScript to `dist/` |
| **Start Backend Production** | `pnpm --filter @tire-store/api start` | Serves compiled API server |
| **Typecheck Backend API** | `pnpm --filter @tire-store/api typecheck` | TypeScript verification |

---

### D. Database & Migrations (`packages/db`)

| Action | Command | Notes |
| :--- | :--- | :--- |
| **Deploy All Migrations** | `pnpm db:deploy` | Applies PostGIS, 11 core tables, triggers, RPCs & enforces 100% RLS |
| **Seed Database** | `pnpm db:seed` | Seeds Top 6 makes, tire catalog, retail stores & service bays |
| **Verify Supabase Live** | `pnpm db:verify` | Connects to cloud Supabase and reports live status of tables & RPCs |
| **Open Drizzle Studio** | `pnpm db:studio` | Launches visual DB browser GUI at `https://local.drizzle.team` |

---

### E. Shell Automation Scripts (`scripts/`)

| Script | Purpose | Example Usage |
| :--- | :--- | :--- |
| **`./scripts/start-all.sh`** | Launches both Backend API and Frontend Web | `./scripts/start-all.sh` |
| **`./scripts/stop-all.sh`** | Stops all active frontend & backend processes | `./scripts/stop-all.sh` |
| **`./scripts/status.sh`** | Checks live ports & process status | `./scripts/status.sh` |
| **`./scripts/start-backend.sh`**| Starts Backend API (port 4000) in background | `./scripts/start-backend.sh` (or `-f` for foreground) |
| **`./scripts/stop-backend.sh`** | Stops Backend API and frees port 4000 | `./scripts/stop-backend.sh` |
| **`./scripts/start-frontend.sh`**| Starts Frontend Web (port 3000) in background | `./scripts/start-frontend.sh` (or `-f` for foreground) |
| **`./scripts/stop-frontend.sh`**| Stops Frontend Web and frees port 3000 | `./scripts/stop-frontend.sh` |
| **`./scripts/db.sh`** | Database helper (deploy, seed, verify, studio) | `./scripts/db.sh deploy` or `./scripts/db.sh verify` |

---

### F. Full Monorepo Orchestration (Turborepo)

| Action | Command | Notes |
| :--- | :--- | :--- |
| **Run All Dev Servers** | `pnpm dev` | Turborepo parallel dev server runner |
| **Build Entire Monorepo** | `pnpm build` | Turbo builds all packages according to DAG dependencies |
| **Run All Unit Tests** | `pnpm test` | Runs tests across all packages |
| **Typecheck Everything** | `pnpm typecheck` | Validates TypeScript across all 10 packages |
| **Lint Everything** | `pnpm lint` | Enforces ESLint and monorepo boundary rules |
| **Clean All Caches** | `pnpm clean` | Cleans `.turbo`, `.next`, and build artifacts |

