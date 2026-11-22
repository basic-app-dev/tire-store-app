# 🛠️ Tire Store Platform — Service-Oriented Scripts

> **Primary Script Reference**: Master documentation for building, testing, starting, stopping, and monitoring the Automotive Platform's 8 independent Spring Boot microservices and the Next.js web application.

---

## 1. Directory Structure

```text
scripts/
├── README.md                           # This documentation guide
├── lib/
│   └── common.sh                       # Internal shared utilities (Java discovery, PID management, health check)
│
├── automotive-operations/              # Port 8091 (Orders, work orders, invoicing, Saga orchestration)
│   ├── build.sh                        # Compile, test, package executable JAR
│   ├── test.sh                         # Run JUnit 5 test suite
│   ├── run.sh                          # Start service (foreground or --background)
│   ├── stop.sh                         # Graceful shutdown (PID verification)
│   └── health.sh                       # Actuator health probe (/actuator/health)
│
├── automotive-product/                 # Port 8092 (Parts, tires, fitment, inventory)
│   ├── build.sh
│   ├── test.sh
│   ├── run.sh
│   ├── stop.sh
│   └── health.sh
│
├── vehicle-sales/                      # Port 8093 (Used car sales, customer deposits, transactions)
│   ├── build.sh
│   ├── test.sh
│   ├── run.sh
│   ├── stop.sh
│   └── health.sh
│
├── vehicle-product/                    # Port 8094 (VIN-specific vehicles, listings, conditions, locations)
│   ├── build.sh
│   ├── test.sh
│   ├── run.sh
│   ├── stop.sh
│   └── health.sh
│
├── notification/                       # Port 8095 (SMS, Email, Push delivery, templates)
│   ├── build.sh
│   ├── test.sh
│   ├── run.sh
│   ├── stop.sh
│   └── health.sh
│
├── identity-access/                    # Port 8096 (User management, store roles, Keycloak integration)
│   ├── build.sh
│   ├── test.sh
│   ├── run.sh
│   ├── stop.sh
│   └── health.sh
│
├── appointment/                        # Port 8097 (Appointment lifecycle, customer bookings)
│   ├── build.sh
│   ├── test.sh
│   ├── run.sh
│   ├── stop.sh
│   └── health.sh
│
├── store-management/                   # Port 8098 (Branches, bays, equipment, capacities)
│   ├── build.sh
│   ├── test.sh
│   ├── run.sh
│   ├── stop.sh
│   └── health.sh
│
├── web/                                # Port 3000 (Next.js 14 Web Frontend)
│   ├── dev.sh                          # Start Next.js dev server (foreground or --background)
│   ├── build.sh                        # Production Next.js build
│   ├── test.sh                         # Test runner (Playwright E2E via --e2e)
│   ├── lint.sh                         # Next.js ESLint runner
│   ├── typecheck.sh                    # TypeScript verification
│   └── stop.sh                         # Graceful shutdown of web server
│
├── docker/                             # Docker Container Tooling
│   ├── build.sh                        # Build single container image
│   ├── build-all.sh                    # Build all 9 platform container images
│   ├── run.sh                          # Run single container (foreground or --background)
│   ├── run-all.sh                      # Launch all 9 containers in background
│   ├── health.sh                       # Probe container health endpoints
│   ├── logs.sh                         # Inspect container logs
│   ├── stop.sh                         # Stop owned containers
│   └── clean.sh                        # Clean owned containers and images
│
├── kubernetes/                         # Kubernetes Local Tooling (kind + Kustomize)
│   ├── cluster-create.sh               # Provision 'tire-store-local' kind cluster
│   ├── cluster-status.sh               # Inspect kind cluster and node health
│   ├── images-load.sh                  # Tag and load dev images into kind node
│   ├── deploy.sh                       # Deploy manifests via Kustomize (local overlay)
│   ├── rollout.sh                      # Await rollout readiness of all 9 deployments
│   ├── status.sh                       # Display pods, services, deployments in tire-store
│   ├── health.sh                       # In-cluster probe of Actuator & web endpoints
│   ├── logs.sh                         # Follow / view service pod logs
│   ├── port-forward.sh                 # Port-forward single or all services to local host
│   ├── remove-apps.sh                  # Delete deployed workloads from cluster
│   └── cluster-delete.sh               # Delete kind cluster
│
├── gateway/                            # Apache APISIX & Gateway API Tooling
│   ├── install.sh                      # Install Gateway API CRDs & APISIX Helm chart
│   ├── deploy-routes.sh                # Apply GatewayClass, Gateway, and HTTPRoutes
│   ├── status.sh                       # Comprehensive status of gateway & routes
│   ├── test.sh                         # In-cluster routing & negative security test suite
│   ├── logs.sh                         # Stream APISIX data-plane or controller logs
│   ├── port-forward.sh                 # Port-forward APISIX gateway (127.0.0.1:9080)
│   └── uninstall.sh                    # Teardown gateway routes, release, and CRDs
│
└── all/                                # Aggregate Orchestration
    ├── build.sh                        # Build all 8 Spring Boot services + web frontend
    ├── test.sh                         # Test all 8 Spring Boot services + web frontend
    ├── start.sh                        # Launch all 8 services + web in background & await readiness
    ├── stop.sh                         # Gracefully stop all owned processes
    └── status.sh                       # Health and port inspection table
```

> **Note on Mobile Applications**: Mobile application scripts (`apps/mobile`, Expo) are intentionally deferred until mobile build profiles and native device testing workflows are finalized.

---

## 2. Port Allocation Reference

| Service Name | Port | Health Endpoint |
| :--- | :---: | :--- |
| **`automotive-operations`** | `8091` | `http://localhost:8091/actuator/health` |
| **`automotive-product`** | `8092` | `http://localhost:8092/actuator/health` |
| **`vehicle-sales`** | `8093` | `http://localhost:8093/actuator/health` |
| **`vehicle-product`** | `8094` | `http://localhost:8094/actuator/health` |
| **`notification`** | `8095` | `http://localhost:8095/actuator/health` |
| **`identity-access`** | `8096` | `http://localhost:8096/actuator/health` |
| **`appointment`** | `8097` | `http://localhost:8097/actuator/health` |
| **`store-management`** | `8098` | `http://localhost:8098/actuator/health` |
| **`web` (Next.js)** | `3000` | `http://localhost:3000` |

---

## 3. Developer Workflows

Every script is executable from any working directory and automatically resolves paths relative to its own script location.

### A. Working with a Single Microservice (e.g. `automotive-product`)

```bash
# Compile, run JUnit 5 tests, and package executable JAR
./scripts/automotive-product/build.sh

# Run unit and integration tests (forwards optional Gradle flags, e.g. --info)
./scripts/automotive-product/test.sh

# Start service in foreground (standard development)
./scripts/automotive-product/run.sh

# Start service in background (for multi-service testing)
./scripts/automotive-product/run.sh --background

# Check Spring Boot Actuator health status (returns 0 if UP, 1 if down/unhealthy)
./scripts/automotive-product/health.sh

# Stop service gracefully
./scripts/automotive-product/stop.sh
```

### B. Working with the Next.js Web Frontend

```bash
# Start Next.js development server on http://localhost:3000 (foreground)
./scripts/web/dev.sh

# Start Next.js in background
./scripts/web/dev.sh --background

# Run TypeScript type check
./scripts/web/typecheck.sh

# Run ESLint validation
./scripts/web/lint.sh

# Compile production build
./scripts/web/build.sh

# Stop background web process
./scripts/web/stop.sh
```

### C. Full Platform Orchestration (`scripts/all/`)

```bash
# Build all 8 Spring Boot services and the web frontend
./scripts/all/build.sh

# Execute test suites across all services
./scripts/all/test.sh

# Launch all 8 microservices and web frontend in background, waiting for health checks
./scripts/all/start.sh

# Inspect live status of all services (distinguishes HEALTHY, UNHEALTHY, OCCUPIED, STOPPED)
./scripts/all/status.sh

# Gracefully stop all background services
./scripts/all/stop.sh
```

---

## 4. Background Process & PID Management

- **Runtime Directory**: Process ID files and service logs are stored in the git-ignored `.logs/` directory at the repository root:
  - PID files: `.logs/<service-name>.pid` (e.g., `.logs/automotive-operations.pid`, `.logs/web.pid`)
  - Log outputs: `.logs/<service-name>.log` (e.g., `.logs/automotive-operations.log`, `.logs/web.log`)
- **Process Ownership Verification**:
  - `stop.sh` scripts inspect the process command line before sending signals to ensure an unrelated process has not recycled the PID.
  - Stale PID files from terminated processes are detected and cleaned up safely.
- **Port Conflict Prevention**:
  - `run.sh` verifies whether the designated port is already occupied.
  - If occupied by an unknown process, it refuses to start and does not kill or hijack the port.
- **Graceful Shutdown**:
  - `stop.sh` sends `SIGTERM` (`kill -15`) to the process and its child processes (e.g., Gradle worker JVMs).
  - Waits up to 15 seconds for a graceful shutdown before issuing `SIGKILL` (`kill -9`).

---

## 5. Health Check Standards

- `health.sh` probes `http://localhost:<port>/actuator/health` using bounded timeouts (`--connect-timeout 2 --max-time 5`).
- It requires an HTTP 200 response AND explicit JSON confirmation: `"status":"UP"`.
- Merely having an open TCP port does not count as healthy.
- Exits with return code `0` on success and `1` on failure, making it ideal for CI and orchestration readiness probes.

---

## 6. Runtime Prerequisites & Troubleshooting

### Prerequisites:
- **Java 25 LTS**: Temurin 25 managed via `mise` or available in `PATH`/`JAVA_HOME`. The script system automatically discovers mise-installed Java if not set globally.
- **Node.js & pnpm**: Node.js 20+ and pnpm 9.15+ for web frontend scripts.
- **Tools**: Standard Linux utilities (`curl`, `lsof` or `ss`, `ps`, `pgrep`).

### Troubleshooting:

| Issue | Cause | Resolution |
| :--- | :--- | :--- |
| `Port <port> is occupied by PID <pid>` | Another process is already running on this port. | Check with `./scripts/all/status.sh` or `lsof -i :<port>`. If owned, use `./scripts/<service>/stop.sh`. |
| `Could not find a valid Java installation` | Java 25 is not detected in PATH or mise directory. | Run `mise install java` or set `JAVA_HOME` pointing to JDK 25. |
| `Service failed to start. Check logs` | JVM initialization failure or port conflict. | Inspect the log file: `tail -n 50 .logs/<service-name>.log`. |
| Stale PID message | Service terminated unexpectedly (e.g. system reboot). | The script automatically clears stale PID files on next invocation. |

