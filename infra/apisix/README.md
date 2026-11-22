# Apache APISIX API Gateway & Kubernetes Gateway API

This directory contains the Apache APISIX API Gateway configuration, Helm values, and architectural specifications for the Tire Store Platform.

---

## 1. Architecture Overview

Apache APISIX serves as the single, centralized, configuration-driven API Gateway for the Tire Store Platform:

```
                            Local Workstation (Developer / Client)
                                              │
                                              │ localhost:9080 (port-forward)
                                              ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ Namespace: ingress-apisix                                                              │
│                                                                                        │
│   ┌────────────────────────────────────────┐   Admin API (9180)   ┌─────────────────┐  │
│   │        APISIX Ingress Controller       │ ───────────────────> │  Apache APISIX  │  │
│   │ (Watches Gateway API & ADC sidecar)    │                      │  (Data Plane)   │  │
│   └────────────────────────────────────────┘                      └────────┬────────┘  │
└────────────────────────────────────────────────────────────────────────────┼───────────┘
                                                                             │
                                   Cross-Namespace ClusterIP Routing         │
                                   (Direct TCP via Service DNS)              │
                                                                             ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ Namespace: tire-store                                                                  │
│                                                                                        │
│   HTTPRoute: tire-store-backend-routes                                                 │
│     ├── /api/v1/automotive/operations/ ──> automotive-operations.tire-store:8091       │
│     ├── /api/v1/automotive/products/   ──> automotive-product.tire-store:8092          │
│     ├── /api/v1/vehicles/sales/        ──> vehicle-sales.tire-store:8093               │
│     ├── /api/v1/vehicles/products/     ──> vehicle-product.tire-store:8094             │
│     ├── /api/v1/notifications/         ──> notification.tire-store:8095                │
│     ├── /api/v1/identity/              ──> identity-access.tire-store:8096             │
│     ├── /api/v1/appointments/          ──> appointment.tire-store:8097                 │
│     └── /api/v1/stores/                ──> store-management.tire-store:8098            │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Responsibilities: APISIX Data Plane vs Ingress Controller

- **Apache APISIX Data Plane (`apisix`)**:
  - High-performance reverse proxy based on OpenResty/Nginx.
  - Receives client traffic on internal port `9080` (exposed via ClusterIP Service `apisix-gateway:80`).
  - Evaluates routing rules, match criteria, headers, and upstream proxies.
  - Enforces traffic policies (rate limiting, auth validation, timeout, CORS).
- **APISIX Ingress Controller (`apisix-ingress-controller`)**:
  - Reconciles declarative Kubernetes resources: `GatewayClass`, `Gateway`, and `HTTPRoute`.
  - Leverages the bundled ADC (API Declarative CLI / server) sidecar to translate Kubernetes Gateway API definitions into APISIX configuration snapshots.
  - Pushes snapshots dynamically into APISIX memory via the local Admin API (`/apisix/admin/configs`).

---

## 3. Kubernetes Gateway API Concepts

- **GatewayClass (`tire-store-apisix`)**:
  - Cluster-scoped resource identifying the controller implementation (`controllerName: apisix.apache.org/apisix-ingress-controller`).
- **Gateway (`tire-store-api-gateway`)**:
  - Deployed in `ingress-apisix`. Defines the entrypoint listener (`HTTP`, port `80`).
  - Configured with `allowedRoutes.namespaces.from: Selector` pointing to namespaces matching `app.kubernetes.io/part-of: tire-store`, permitting cross-namespace route attachment while maintaining security isolation.
- **HTTPRoute (`tire-store-backend-routes`)**:
  - Deployed in application namespace `tire-store`.
  - Attaches to `parentRefs: tire-store-api-gateway` in namespace `ingress-apisix`.
  - Maps path prefixes to internal Spring Boot microservice ClusterIP Services.

---

## 4. Component Versions & Compatibility Matrix

| Component | Pinned Version | Notes |
| :--- | :--- | :--- |
| **Kubernetes** | `1.32.2` | Single-node kind cluster (`tire-store-local`) |
| **Gateway API CRDs** | `v1.2.1` | Official standard channel release from SIG-Network |
| **APISIX Helm Chart** | `3.1.0` | Official chart from `https://charts.apiseven.com` |
| **Apache APISIX** | `3.21.0` | APISIX Data Plane container |
| **APISIX Ingress Controller** | `2.2.0` | Chart sub-version `1.5.0` |
| **ADC Sidecar** | `0.27.1` | `ghcr.io/api7/adc:0.27.1` |

---

## 5. Deployment Mode & etcd Architecture Rationale

- **Attempted Mode**: Standalone API-driven mode (`config_provider: yaml`, `etcd.enabled: false`).
- **Material Limitations Discovered**:
  1. **ADC Sidecar Query Requirement**: APISIX Ingress Controller v2.2.0 utilizes the ADC sidecar (`ghcr.io/api7/adc:0.27.1`). ADC queries `GET /apisix/admin/routes` to calculate declarative state diffs.
  2. **Standalone Mode 404 Restriction**: In Apache APISIX 3.21.0, enabling `config_provider: yaml` disables individual resource endpoints on the Admin API, returning HTTP 404 for `GET /apisix/admin/routes`. This causes ADC reconciliation to fail with `AxiosError: Request failed with status code 404`.
  3. **Readiness Probe Deadlock**: In standalone mode, APISIX's `/status/ready` endpoint returns HTTP 503 until configuration is applied, which in turn causes the `apisix-admin` ClusterIP service to have no endpoints, preventing external controllers from reaching APISIX.
- **Selected Resolution**:
  - Apache APISIX is deployed in `traditional` mode with an ephemeral, single-replica local etcd instance.
  - **Local Optimization**: `replicaCount: 1`, `persistence.enabled: false` (in-memory `emptyDir`), memory request `64Mi`, limit `128Mi`.
  - This provides zero-overhead local development stability, immediate container readiness, and full Gateway API reconciliation compatibility.

> [!NOTE]
> **Known Issue & Technical Debt Reference**:
> The standalone mode investigation and underlying etcd dependency are documented in detail in [`docs/architecture/known-issues/APISIX_ETCD.md`](../../docs/architecture/known-issues/APISIX_ETCD.md).
> - The current traditional/etcd deployment is fully operational, verified, and remains the active baseline.
> - Further investigation into etcd-free standalone operation is **deferred**.
> - No immediate migration to standalone mode has been approved; any future changes will require satisfying the formal resolution criteria documented in the known issue report.

---

## 6. Directory Structure

```text
infra/
├── apisix/
│   ├── README.md                      # This documentation
│   ├── chart-versions.yaml            # Pinned component versions & repository links
│   └── values-local.yaml              # Local development Helm overrides
│
└── kubernetes/
    └── overlays/
        └── local/
            └── gateway/
                ├── gatewayclass.yaml  # GatewayClass definition
                ├── gateway.yaml       # Gateway listener (port 80)
                ├── httproutes.yaml    # 8 Spring Boot HTTPRoute mappings
                └── kustomization.yaml # Gateway Kustomization bundle

scripts/
└── gateway/
    ├── install.sh                     # Idempotent CRD + Helm installation
    ├── deploy-routes.sh               # Kustomize Gateway & Route deployer
    ├── status.sh                      # Cluster, gateway, route, and pod inspector
    ├── test.sh                        # Automated routing & negative security test suite
    ├── logs.sh                        # APISIX and Ingress Controller log viewer
    ├── port-forward.sh                # Local-only 127.0.0.1 port forwarding
    └── uninstall.sh                   # Graceful teardown preserving shared CRDs
```

---

## 7. Operational Workflows

### A. Initial Installation
```bash
./scripts/gateway/install.sh
```
1. Verifies the cluster context is `kind-tire-store-local`.
2. Installs Gateway API v1.2.1 CRDs if absent.
3. Installs the APISIX Helm release in `ingress-apisix`.
4. Waits for rollouts of `deployment/apisix` and `deployment/apisix-ingress-controller`.

### B. Deploy Routes
```bash
./scripts/gateway/deploy-routes.sh
```
Applies `infra/kubernetes/overlays/local/gateway/` manifests and verifies attachment conditions.

### C. Inspect Status
```bash
./scripts/gateway/status.sh
```
Displays pod states, gateway listener conditions, and HTTPRoute parent statuses.

### D. Execute Test Suite
```bash
./scripts/gateway/test.sh
```
Deploys an ephemeral in-cluster test backend, creates a diagnostic HTTPRoute, sends test requests through the APISIX gateway, asserts 200 OK and expected payloads, validates negative security checks (404 on unmapped paths, 404 on Actuator/Admin API), and tears down diagnostic resources.

### E. Port Forward Locally
```bash
./scripts/gateway/port-forward.sh 9080
```
Binds `127.0.0.1:9080` to `apisix-gateway:80` for host testing.

### F. Follow Logs
```bash
./scripts/gateway/logs.sh gateway -f      # Data plane logs
./scripts/gateway/logs.sh controller -f   # Ingress controller logs
./scripts/gateway/logs.sh adc -f          # ADC translator logs
```

### G. Teardown
```bash
./scripts/gateway/uninstall.sh
```
Removes routes, uninstalls the Helm release, and removes the `ingress-apisix` namespace. Shared Gateway API CRDs and `tire-store` applications are untouched.

---

## 8. Security & Boundaries

- **Admin API**: Bound strictly to internal cluster IP (`apisix-admin:9180`), inaccessible from the external gateway listener.
- **Random Credentials**: Helm generates unique alphanumeric credentials on deployment, stored inside `apisix-admin-credentials` secret. No default keys are committed.
- **Actuator Endpoints**: Spring Boot Actuator endpoints (`/actuator/**`) remain strictly internal and are never mapped into public Gateway routes.
- **Service Isolation**: All 8 microservices remain internal ClusterIP services; no public NodePorts or LoadBalancers exist.

---

## 9. Future Keycloak & Production Roadmap

- **Keycloak OIDC Integration**: Future phases will configure the `openid-connect` plugin on APISIX to validate JWT tokens and user claims before proxying requests to downstream microservices.
- **Rate Limiting & CORS**: Traffic policies (`limit-req`, `cors`, `proxy-rewrite`) will be introduced once customer and admin frontend contracts are defined.
- **TLS Termination**: In production, cert-manager will manage Let's Encrypt certificates mounted onto HTTPS listeners on the Gateway.
