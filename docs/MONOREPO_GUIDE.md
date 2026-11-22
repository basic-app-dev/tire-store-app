# 🏎️ Automotive Platform — Monorepo Architecture & Development Guide

> **Primary Monorepo Reference**: Comprehensive architecture, workspace boundaries, command reference, and onboarding guide for the Automotive Platform.

---

## 1. Component Status Legend

Every directory, package, service, and command in this guide is categorized into one of two statuses:

- **`[EXISTING]`**: Verified codebase components, packages, and working developer commands currently active in the repository.
- **`[PLANNED]`**: Approved target domain features to be implemented in upcoming phases (e.g., domain entities/repositories for Spring Boot microservices, Apache APISIX gateway, Keycloak integration, RabbitMQ messaging).

---

## 2. Monorepo Architecture & Directory Layout

The repository utilizes a dual build architecture:
1. **pnpm + Turborepo**: Manages TypeScript client applications (`apps/web`, `apps/mobile`) and shared TypeScript packages (`packages/*`).
2. **Eight Standalone Gradle Projects**: Each Spring Boot microservice under `backend/services/*` maintains its own dedicated Gradle Wrapper, `settings.gradle.kts`, and `build.gradle.kts`. There is no centralized root Gradle build.

```text
tire-store-app/
├── backend/
│   └── services/                         # [EXISTING] Eight Standalone Spring Boot 4.2.x Microservices (Java 25 LTS)
│       ├── automotive-operations/        # Port 8091 (settings.gradle.kts, build.gradle.kts, gradlew)
│       ├── automotive-product/           # Port 8092 (settings.gradle.kts, build.gradle.kts, gradlew)
│       ├── vehicle-sales/                # Port 8093 (settings.gradle.kts, build.gradle.kts, gradlew)
│       ├── vehicle-product/              # Port 8094 (settings.gradle.kts, build.gradle.kts, gradlew)
│       ├── notification/                 # Port 8095 (settings.gradle.kts, build.gradle.kts, gradlew)
│       ├── identity-access/              # Port 8096 (settings.gradle.kts, build.gradle.kts, gradlew)
│       ├── appointment/                  # Port 8097 (settings.gradle.kts, build.gradle.kts, gradlew)
│       └── store-management/             # Port 8098 (settings.gradle.kts, build.gradle.kts, gradlew)
│
├── apps/
│   ├── web/                              # [EXISTING] Next.js 14+ App Router (Port 3000)
│   │   ├── src/app/                      # Web storefront, tire catalog, fitment selector, admin
│   │   └── package.json                  # @tire-store/web
│   │
│   └── mobile/                           # [EXISTING] Expo SDK 52+ / React Native (Metro Port 8081)
│       ├── src/app/                      # Mobile storefront, technician VIN scanner, GPS locator
│       └── package.json                  # @tire-store/mobile
│
├── packages/
│   ├── api-client/                       # [EXISTING] Client models, API fetch client, and React Query hooks
│   ├── ui/                               # [EXISTING] Cross-platform design system & Tailwind primitives
│   ├── tailwind-config/                  # [EXISTING] Shared automotive design tokens
│   ├── typescript-config/                # [EXISTING] Shared tsconfig presets
│   └── eslint-config/                    # [EXISTING] Monorepo boundary lint rules
│
├── scripts/                              # [EXISTING] Service-oriented shell automation scripts
│   ├── README.md                         # Script documentation & usage guide
│   ├── <service>/                        # Dedicated microservice scripts (build, test, run, stop, health)
│   ├── web/                              # Web frontend scripts (dev, build, test, lint, typecheck, stop)
│   ├── docker/                           # Container lifecycle scripts (build, run, health, logs, stop, clean)
│   ├── kubernetes/                       # Kubernetes kind cluster & deployment scripts
│   ├── gateway/                          # Apache APISIX & Gateway API lifecycle scripts
│   └── all/                              # Platform aggregate scripts (build, test, start, stop, status)
│
├── infra/                                # [EXISTING] Infrastructure & Deployment Configurations
│   ├── apisix/                           # [EXISTING] Apache APISIX Helm values & Gateway architecture
│   ├── containers/                       # Docker Compose and container reference documentation
│   │   ├── README.md                     # Container architecture guide & specifications
│   │   └── docker-compose.yml            # Local 9-service integration compose manifest
│   └── kubernetes/                       # [EXISTING] Kubernetes kind & Kustomize manifests
│       ├── base/                         # Base deployments and ClusterIP services
│       └── overlays/local/               # Local dev overlay & Gateway API manifests
│
├── docs/
│   ├── architecture/                     # [EXISTING] Evergreen architecture specs (01–06)
│   ├── agents/                           # [EXISTING] Multi-agent system documentation
│   └── archive/                          # [EXISTING] Preserved historical documentation and legacy snapshot
│
├── pnpm-workspace.yaml                   # [EXISTING] Monorepo package workspace definitions
├── turbo.json                            # [EXISTING] Turborepo task pipeline configuration
└── package.json                          # [EXISTING] Root scripts & workspace orchestration
```

---

## 3. Microservice Architecture & Port Allocation

Each backend service is an independent Gradle project with its own filesystem boundaries, JVM runtime, application configuration, and dedicated Flyway database migrations.

| Service Name | Port | Build Status | Service Domain & Primary Responsibilities |
| :--- | :---: | :---: | :--- |
| **`automotive-operations`** | `8091` | `[EXISTING]` | **Orders & Billing**: Automotive orders, work orders, invoicing, and checkout Saga orchestration. |
| **`automotive-product`** | `8092` | `[EXISTING]` | **Parts & Fitment**: Tires/parts catalog, fitment specifications, branch stock, reservations, and adjustments. |
| **`vehicle-sales`** | `8093` | `[EXISTING]` | **Used Car Sales**: Vehicle sales workflows, customer deposits, transactions, and status coordination. |
| **`vehicle-product`** | `8094` | `[EXISTING]` | **Vehicle Inventory**: VIN-specific vehicles, listings, conditions, vehicle locations, and availability holds. |
| **`notification`** | `8095` | `[EXISTING]` | **Messaging**: Notification templates, delivery dispatch (SMS/Email/Push), preferences, and retry tracking. |
| **`identity-access`** | `8096` | `[EXISTING]` | **Users & RBAC**: Application user profiles, store-scoped access assignments; Keycloak OIDC integration. |
| **`appointment`** | `8097` | `[EXISTING]` | **Booking Lifecycle**: Customer appointment scheduling, rescheduling, cancellations, and booking records. |
| **`store-management`** | `8098` | `[EXISTING]` | **Physical Resources**: Stores, operating hours, service capabilities, equipment capacities, and exclusive bay reservations. |
| *`apps/web`* | `3000` | `[EXISTING]` | Next.js 14+ customer storefront, tire fitment search, and store admin portal. |
| *`apps/mobile`* | `8081` | `[EXISTING]` | Expo Metro bundler for iOS and Android mobile app. |

---

## 4. Architectural Boundaries & Data Isolation

1. **Build & Runtime Independence `[EXISTING]`**:
   - Each Spring Boot service builds strictly from its own directory (`backend/services/<service>/`).
   - No shared Gradle root project or local cross-project dependencies (`project(":")`) exist.
   - Each service passes the **Copied-Directory Acceptance Test** (builds cleanly when copied to an isolated directory).
2. **Service Ownership & Database Isolation `[PLANNED]`**:
   - Each microservice owns its dedicated PostgreSQL database schema and Flyway migrations (`db/migration/V*.sql`).
   - Direct cross-database SQL queries, foreign keys, or shared JPA entities are strictly forbidden. Cross-service communication occurs via REST (OpenAPI) or RabbitMQ domain events.
   - `appointment` owns appointment records and lifecycle; `store-management` owns physical bays and bay reservations; `automotive-operations` owns checkout orchestration; `automotive-product` owns tire stock and reservations.
3. **No Direct Database Access in Clients `[EXISTING]`**:
   - Client applications (`apps/web`, `apps/mobile`) **MUST NEVER** access databases directly.
   - All backend data access passes through REST APIs / Apache APISIX reverse proxy via `@tire-store/api-client`.
4. **End-to-End Type Safety `[EXISTING]`**:
   - Client models and API contracts reside in `@tire-store/api-client`. Backend endpoints expose OpenAPI contracts.

---

## 5. Master Command Reference

> **Important**: `pnpm` and `Turborepo` commands manage TypeScript packages and client applications only. They do **NOT** build, test, or run Spring Boot microservices. Each Spring Boot microservice uses its own Gradle Wrapper (`./gradlew`).

### A. Frontend Web Application (`apps/web`) `[EXISTING]`

| Action | Command | URL / Notes |
| :--- | :--- | :--- |
| **Start Web Dev Server** | `pnpm dev:web` | Starts Next.js 14 App Router on `http://localhost:3000` |
| **Build Web App** | `pnpm --filter @tire-store/web build` | Production ISR & static bundle build |
| **Start Web Production** | `pnpm --filter @tire-store/web start` | Serves production build |
| **Typecheck Web** | `pnpm --filter @tire-store/web typecheck` | TypeScript verification |

---

### B. Mobile Application (`apps/mobile`) `[EXISTING]`

| Action | Command | Notes |
| :--- | :--- | :--- |
| **Start Expo Dev Server** | `pnpm dev:mobile` | Starts Expo Metro server on port `8081` |
| **Launch on iOS Simulator** | `pnpm --filter @tire-store/mobile run ios` | Boots iOS Simulator |
| **Launch on Android Emulator**| `pnpm --filter @tire-store/mobile run android`| Boots Android Emulator |
| **Launch Mobile Web Preview** | `pnpm --filter @tire-store/mobile run web` | Opens mobile browser preview |
| **Typecheck Mobile** | `pnpm --filter @tire-store/mobile typecheck` | TypeScript verification |

---

### C. Spring Boot Microservices (`backend/services/*`) `[EXISTING]`

*Note: Each command runs within the specific service directory.*

| Action | Command | Target / Notes |
| :--- | :--- | :--- |
| **Build Single Service** | `./gradlew build` | Run inside `backend/services/<service>/` |
| **Run Unit Tests** | `./gradlew test` | Executes JUnit 5 & MockMvc tests |
| **Start Single Service** | `./gradlew bootRun` | Starts service on its assigned port (`8091`–`8098`) |
| **Check Health Endpoint** | `curl http://localhost:<PORT>/actuator/health` | Verifies Actuator health |

---

### D. Service-Oriented Shell Scripts (`scripts/`) `[EXISTING]`

| Script / Directory | Purpose | Example Usage |
| :--- | :--- | :--- |
| **`./scripts/all/start.sh`** | Launches all 8 microservices and Next.js frontend in background & verifies health | `./scripts/all/start.sh` |
| **`./scripts/all/stop.sh`** | Gracefully stops all platform background processes | `./scripts/all/stop.sh` |
| **`./scripts/all/status.sh`** | Inspects health & process status across all 8 microservices and web frontend | `./scripts/all/status.sh` |
| **`./scripts/all/build.sh`** | Compiles, tests, and packages all 8 microservices and web frontend | `./scripts/all/build.sh` |
| **`./scripts/all/test.sh`** | Executes test suites across all 8 microservices and web frontend | `./scripts/all/test.sh` |
| **`./scripts/<service>/run.sh`** | Starts an individual service (foreground by default, `--background` supported) | `./scripts/automotive-product/run.sh --background` |
| **`./scripts/<service>/health.sh`** | Checks Spring Boot Actuator `/actuator/health` endpoint | `./scripts/automotive-product/health.sh` |
| **`./scripts/<service>/stop.sh`** | Stops an individual service gracefully via verified PID | `./scripts/automotive-product/stop.sh` |
| **`./scripts/web/dev.sh`** | Starts Next.js web application (foreground or `--background`) | `./scripts/web/dev.sh` |
| **`./scripts/web/stop.sh`** | Stops background Next.js web application | `./scripts/web/stop.sh` |

---

### E. Kubernetes Local Development (`scripts/kubernetes/` & `infra/kubernetes/`) `[EXISTING]`

| Script / Action | Purpose | Command |
| :--- | :--- | :--- |
| **Create Local Cluster** | Provisions single-node kind cluster `tire-store-local` | `./scripts/kubernetes/cluster-create.sh` |
| **Load Local Images** | Tags and loads all 9 dev images into kind node | `./scripts/kubernetes/images-load.sh dev-local` |
| **Deploy Workloads** | Deploys Kustomize local overlay to `tire-store` namespace | `./scripts/kubernetes/deploy.sh` |
| **Await Rollouts** | Waits for all 9 deployments to reach Ready status | `./scripts/kubernetes/rollout.sh` |
| **Cluster & App Status** | Inspects kind node, deployments, pods, and ClusterIP services | `./scripts/kubernetes/status.sh` |
| **Health Probes** | Executes in-cluster curl probe across all 9 workloads | `./scripts/kubernetes/health.sh` |
| **Follow Pod Logs** | Streams logs for any service or web container | `./scripts/kubernetes/logs.sh <service> -f` |
| **Port Forwarding** | Exposes service ports (`8091`-`8098`, `3000`) on localhost | `./scripts/kubernetes/port-forward.sh all` |
| **Tear Down Apps** | Removes all deployments and services from cluster | `./scripts/kubernetes/remove-apps.sh` |
| **Delete Cluster** | Destroys the kind cluster `tire-store-local` | `./scripts/kubernetes/cluster-delete.sh` |

---

### F. Apache APISIX & Gateway API Local Development (`scripts/gateway/` & `infra/apisix/`) `[EXISTING]`

| Script / Action | Purpose | Command |
| :--- | :--- | :--- |
| **Install APISIX & CRDs** | Installs Gateway API v1.2.1 CRDs and APISIX Helm chart in `ingress-apisix` | `./scripts/gateway/install.sh` |
| **Deploy Routes** | Applies GatewayClass, Gateway, and HTTPRoutes via Kustomize | `./scripts/gateway/deploy-routes.sh` |
| **Gateway Status** | Inspects gateway pods, services, GatewayClass, Gateway, and HTTPRoute status | `./scripts/gateway/status.sh` |
| **Integration & Security Test** | Runs in-cluster routing test suite and negative security checks | `./scripts/gateway/test.sh` |
| **Gateway Pod Logs** | Streams logs for data-plane `apisix` or controller | `./scripts/gateway/logs.sh apisix -f` |
| **Gateway Port Forward** | Forwards gateway port 80 to `http://127.0.0.1:9080` for host testing | `./scripts/gateway/port-forward.sh` |
| **Uninstall Gateway** | Deletes gateway routes, Helm release, and Gateway API CRDs | `./scripts/gateway/uninstall.sh` |

---

### G. Monorepo Orchestration (`Turborepo` + `pnpm`) `[EXISTING]`

*Note: Applies strictly to TypeScript packages and client applications (`apps/*`, `packages/*`).*

| Action | Command | Notes |
| :--- | :--- | :--- |
| **Run Dev Servers** | `pnpm dev` | Turborepo parallel dev server runner (`apps/web`) |
| **Build Web/Packages** | `pnpm build` | Turbo builds shared packages and web apps |
| **Run Frontend Unit Tests**| `pnpm test` | Runs Vitest suites across packages |
| **Typecheck All Packages** | `pnpm typecheck` | Validates TypeScript across all workspace packages |
| **Lint All Packages** | `pnpm lint` | Enforces ESLint and monorepo boundary rules |
| **Clean All Caches** | `pnpm clean` | Cleans `.turbo`, `.next`, and build caches |

---

## 6. Developer Onboarding: Independent Spring Boot Workflow `[EXISTING]`

To ensure complete build and runtime independence, backend engineers work within individual service directories without requiring the monorepo root or sibling services.

### Step-by-Step: Working on a Single Service (e.g. `automotive-product`)

```bash
# 1. Start from repository root
cd /home/phu/dev/tire-store-app

# 2. Navigate directly to the service directory
cd backend/services/automotive-product

# 3. Build the application independently
./gradlew build

# 4. Execute the service test suite
./gradlew test

# 5. Run the service locally (Port 8092)
./gradlew bootRun

# 6. Verify service health in a separate terminal
curl -s http://localhost:8092/actuator/health
# Expected output: {"status":"UP"}
```

---

## 7. Layered Git Ignore Architecture `[EXISTING]`

The repository uses a multi-layered, decentralized `.gitignore` structure where ignore rules are co-located with the specific applications and infrastructure they govern.

### A. Responsibility Breakdown

| File Location | Scope & Primary Responsibilities |
| :--- | :--- |
| **`/.gitignore`** | **Monorepo Root**: Global OS artifacts (`.DS_Store`, `Thumbs.db`), common editor files (`.vscode/`, `.idea/`), monorepo tooling (`node_modules/`, `.pnpm-store/`, `.turbo/`), shared build outputs (`dist/`, `build/`, `out/`), shared logs (`.logs/`, `*.log`, `*.pid`), coverage reports, and base `.env` rules. |
| **`apps/web/.gitignore`** | **Next.js Web Frontend**: `.next/` cache and build artifacts, static exports (`out/`), auto-generated TypeScript headers (`next-env.d.ts`), `.cache/`, `.swc/`, `.eslintcache`, Playwright test reports, and Next.js `.env*.local` overrides. |
| **`apps/mobile/.gitignore`** | **Expo Mobile App**: `.expo/` runtime caches, `web-build/`, `metro-cache/`, and mobile signing keys/keystores (`*.jks`, `*.p8`, `*.p12`, `*.keystore`, `*.mobileprovision`). |
| **`backend/services/<service>/.gitignore`** | **Spring Boot Microservices (x8)**: Local Gradle cache (`.gradle/`), build outputs (`build/`), compiled classes (`*.class`), JVM crash logs (`hs_err_pid*`, `replay_pid*`), and package archives (`*.jar`, `*.war`), while explicitly preserving wrapper JARs. |
| **`infra/.gitignore`** | **Infrastructure & Gateway**: Local kubeconfig files (`*kubeconfig*`), Helm render outputs (`*.tgz`, `.helm/`), diagnostic state dumps (`*-dump.json`, `diagnostic-*.yaml`), local SSL/TLS test certificates, and secret override manifests (`*-secret.yaml`). |
| **`scripts/.gitignore`** | **Automation Tooling**: Local PID metadata (`*.pid`), temporary execution logs (`*.log`), and `.logs/`, while explicitly preserving all shell scripts (`!*.sh`) and documentation. |

### B. `.gitignore` vs `.dockerignore`

- **`.gitignore`**: Defines what files Git excludes from version control. Prevents checking in build outputs, sensitive keys, and machine-specific cache files.
- **`.dockerignore`**: Defines what files the Docker CLI excludes from the Docker build context when sending files to the Docker daemon. Optimizes build speed and avoids invalidating Docker layer caches.
- *Key Distinction*: `Dockerfile` and `.dockerignore` must **always remain tracked in Git**. In `apps/web` and `backend/services/*`, `.dockerignore` is tracked alongside the service's `.gitignore`.

### C. Gradle Wrapper Preservation Standard

Spring Boot microservices require zero-install portability. The Gradle Wrapper allows developers and CI/CD pipelines to build services without pre-installing Gradle. Therefore:
- `gradlew` and `gradlew.bat` are tracked.
- `gradle/wrapper/gradle-wrapper.properties` is tracked.
- `gradle/wrapper/gradle-wrapper.jar` is **explicitly un-ignored** using `!gradle/wrapper/gradle-wrapper.jar` across all 8 microservices, overriding the generic `*.jar` package rule.

### D. Diagnosing Ignored & Tracked Files

To inspect why a file is ignored or which rule applies:

```bash
# Check which .gitignore rule matches a specific path
git check-ignore -v <path/to/file>

# Check status of ignored files
git status --ignored -s

# List all tracked files matching current ignore patterns
git ls-files -c -i --exclude-standard
```

### E. Secret-Bearing Files & Sanitized Templates

- **Never Track Real Secrets**: `.env`, `.env.local`, `*.key`, `*.keystore`, and `*-secret.yaml` are strictly ignored.
- **Track Sanitized Samples**: Explicit negation rules (`!.env.example`, `!.env.sample`, `!values-local.yaml`) ensure sanitized configuration templates are tracked for new developer onboarding.

### F. Generated OpenAPI Clients

In future development phases, OpenAPI client code generated in `@tire-store/api-client` (e.g. models, queries, fetchers) will be **intentionally tracked in Git** to guarantee strict end-to-end compile-time type safety across Web and Mobile applications without requiring an active backend during local frontend builds.
