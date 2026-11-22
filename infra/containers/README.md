# 🐳 Tire Store Platform — Container Architecture & Infrastructure

> **Primary Container Reference**: Multi-stage Dockerfile inventory, build contexts, security standards, and local container orchestration for the Automotive Platform.

---

## 1. Container Inventory & Port Allocation

| Component | Service Domain | Port | Dockerfile Location | Build Context | Image Name |
| :--- | :--- | :---: | :--- | :--- | :--- |
| **`automotive-operations`** | Orders, Saga orchestration | `8091` | `backend/services/automotive-operations/Dockerfile` | `backend/services/automotive-operations` | `tire-store/automotive-operations:latest` |
| **`automotive-product`** | Tires, parts, fitment | `8092` | `backend/services/automotive-product/Dockerfile` | `backend/services/automotive-product` | `tire-store/automotive-product:latest` |
| **`vehicle-sales`** | Used vehicle sales, deposits | `8093` | `backend/services/vehicle-sales/Dockerfile` | `backend/services/vehicle-sales` | `tire-store/vehicle-sales:latest` |
| **`vehicle-product`** | VIN-specific inventory | `8094` | `backend/services/vehicle-product/Dockerfile` | `backend/services/vehicle-product` | `tire-store/vehicle-product:latest` |
| **`notification`** | SMS, Email, Push dispatch | `8095` | `backend/services/notification/Dockerfile` | `backend/services/notification` | `tire-store/notification:latest` |
| **`identity-access`** | Users, roles, Keycloak OIDC | `8096` | `backend/services/identity-access/Dockerfile` | `backend/services/identity-access` | `tire-store/identity-access:latest` |
| **`appointment`** | Scheduling, booking lifecycle | `8097` | `backend/services/appointment/Dockerfile` | `backend/services/appointment` | `tire-store/appointment:latest` |
| **`store-management`** | Branches, service bays | `8098` | `backend/services/store-management/Dockerfile` | `backend/services/store-management` | `tire-store/store-management:latest` |
| **`web`** | Next.js 14 Web storefront | `3000` | `apps/web/Dockerfile` | `.` *(Monorepo Root)* | `tire-store/web:latest` |

---

## 2. Multi-Stage Build Architecture

### A. Spring Boot Microservices
- **Builder Stage**: `eclipse-temurin:25-jdk`
  - Uses the service's own standalone Gradle Wrapper (`./gradlew`).
  - Layer caching: copies `gradle/`, `gradlew`, `settings.gradle.kts`, `build.gradle.kts` before application source.
  - Compiles classes, executes JUnit 5 test suite, and packages the executable Spring Boot JAR (`./gradlew bootJar --no-daemon`).
- **Runtime Stage**: `eclipse-temurin:25-jre`
  - Minimal JRE container image (size ~540MB, 144MB compressed).
  - Copies solely the packaged JAR (`/app/app.jar`).
  - Configures container-aware JVM memory cgroups (`-XX:MaxRAMPercentage=75.0 -XX:+UseContainerSupport`).
  - Uses `exec` signal forwarding to guarantee sub-second graceful `SIGTERM` shutdowns.

### B. Next.js Web Application
- **Builder Stage**: `node:20-alpine` + `pnpm@9.15.0`
  - **Build Context**: Monorepo root (`.`), necessitated by internal workspace package dependencies (`@tire-store/ui`, `@tire-store/api-client`, `@tire-store/tailwind-config`, `@tire-store/typescript-config`, `@tire-store/eslint-config`).
  - Frozen lockfile validation (`pnpm install --frozen-lockfile`).
  - Next.js standalone server compilation (`output: 'standalone'`).
- **Runtime Stage**: `node:20-alpine`
  - Lightweight runner image (size 222MB, 53MB compressed).
  - Copies only `.next/standalone`, public static assets, and `.next/static`.

---

## 3. Security Standards

1. **Non-Root Execution**:
   - Spring Boot services execute under unprivileged system user `appuser:appgroup` (`UID:GID 1001`).
   - Web frontend executes under unprivileged system user `nextjs:nodejs` (`UID:GID 1001`).
2. **Zero Embedded Secrets**:
   - Images contain no credentials, private keys, or environment secrets. Configuration is injected at runtime via environment variables or Kubernetes ConfigMaps/Secrets.
3. **No Host Filesystem Dependencies**:
   - Containers are completely self-contained and run without requiring host source code mounts.

---

## 4. Developer Container Tooling (`scripts/docker/`)

| Script | Purpose | Example Usage |
| :--- | :--- | :--- |
| **`build.sh`** | Builds a single container image | `./scripts/docker/build.sh automotive-product` |
| **`build-all.sh`** | Builds all 9 platform container images | `./scripts/docker/build-all.sh` |
| **`run.sh`** | Runs a single container (foreground or background) | `./scripts/docker/run.sh web --background` |
| **`run-all.sh`** | Starts all 9 containers in background | `./scripts/docker/run-all.sh` |
| **`health.sh`** | Probes container health status | `./scripts/docker/health.sh all` |
| **`logs.sh`** | Inspects live logs from a running container | `./scripts/docker/logs.sh store-management -f` |
| **`stop.sh`** | Stops and removes owned containers | `./scripts/docker/stop.sh all` |
| **`clean.sh`** | Cleans owned containers and images | `./scripts/docker/clean.sh --images` |

---

## 5. Local Docker Compose Integration

A convenience Docker Compose manifest is provided at `infra/containers/docker-compose.yml` to spin up the entire application layer on a dedicated bridge network:

```bash
# Start all 9 services in background
docker compose -f infra/containers/docker-compose.yml up -d

# Check health and service status
docker compose -f infra/containers/docker-compose.yml ps

# View aggregate logs
docker compose -f infra/containers/docker-compose.yml logs -f

# Gracefully stop all services
docker compose -f infra/containers/docker-compose.yml down
```
