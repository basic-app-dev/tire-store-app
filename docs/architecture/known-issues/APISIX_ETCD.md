# Apache APISIX — etcd Dependency and Standalone Mode Investigation

---

## 1. Title and Status

- **Title**: Apache APISIX — etcd Dependency and Standalone Mode Investigation
- **Status**: OPEN — Deferred
- **Environment**: Local kind Kubernetes development cluster (`tire-store-local`, Kubernetes v1.32.2)

---

## 2. Intended Architecture

The target API Gateway architecture for the Automotive Platform monorepo comprises:
- **Data-Plane**: Apache APISIX (v3.21.0) acting as a high-performance reverse proxy and API Gateway.
- **Control-Plane**: APISIX Ingress Controller (v2.2.0) translating declarative Kubernetes resources into gateway routing rules.
- **Declarative Source**: Kubernetes Gateway API standard channel (`GatewayClass`, `Gateway`, `HTTPRoute`).
- **Desired Storage Model**: Preferably an **etcd-free standalone API-driven mode** for local development to minimize resource consumption and avoid running a stateful consensus cluster on developer machines.

---

## 3. Observed Problem

During the Phase 2C gateway implementation, the initial attempt to deploy APISIX in standalone mode (`config_provider: yaml` / standalone deployment role) failed with the following concrete symptoms:

1. **Admin API Endpoint Rejection**:
   - The APISIX Ingress Controller (v2.2.0) bundles the APISIX Declarative CLI (ADC, `ghcr.io/api7/adc:0.27.1`) as a sidecar.
   - ADC calculates resource diffs by issuing individual CRUD HTTP requests (`GET`, `PUT`, `DELETE`) against the APISIX Admin API (e.g., `GET /apisix/admin/routes`, `GET /apisix/admin/services`).
   - In APISIX 3.21.0 standalone mode, individual CRUD endpoints are disabled and returned `HTTP 404 Not Found` (`AxiosError: Request failed with status code 404`).
2. **Readiness Probe Deadlock**:
   - In standalone mode, APISIX's readiness probe (`/status/ready`) returned `503 Service Unavailable` until a valid configuration was pushed.
   - Because readiness failed, the Kubernetes `apisix-admin` ClusterIP service had zero ready endpoints, preventing the Ingress Controller and ADC from connecting to push configuration.
3. **Synchronization Stoppage**:
   - Routing rules could not be synchronized to the gateway data-plane.

### Distinction: Observation vs. Hypothesis
- *Observed*: In the tested standalone Helm configuration, the Admin API rejected ADC's CRUD calls with HTTP 404, causing controller reconciliation failure and service deadlock.
- *Hypotheses*:
  1. The selected version combination (APISIX Helm chart 3.1.0, Ingress Controller 2.2.0, ADC 0.27.1, APISIX 3.21.0) may require etcd for declarative synchronization via ADC.
  2. Standalone API-driven mode may require specific configuration flags or a full-dump synchronization mode (`/apisix/admin/dump`) that ADC did not utilize under default chart settings.
  3. Standalone mode in APISIX is primarily file-driven (`apisix.yaml`), whereas the Ingress Controller expects an active CRUD-capable Admin API.

*Conclusion*: Standalone mode failed under this specific configuration, but etcd-free operation is not proven impossible for future architectures.

---

## 4. Current Workaround

To achieve 100% verified routing and unblock development without introducing architectural drift, APISIX was deployed using traditional mode with a minimal local etcd:

- **Deployment Mode**: Traditional mode (`role: traditional`, `deployment.role_traditional.config_provider: etcd`).
- **Minimal Local etcd**: Single replica (`replicaCount: 1`), ephemeral storage (`persistence.enabled: false`), minimal resource bounds (requests: 50m CPU, 64Mi memory; limits: 200m CPU, 128Mi memory).
- **Control-Plane**: APISIX Ingress Controller v2.2.0 with ADC v0.27.1 sidecar.
- **Lifecycle Bootstrap**:
  - `apisix init_etcd` is executed during `./scripts/gateway/install.sh` to initialize directory structures for empty prefixes (`/apisix/consumers`, `/apisix/routes`).
  - The APISIX deployment is reloaded (`kubectl rollout restart deployment/apisix`) to immediately establish active etcd watch streams.
- **Port Matching Configuration**: `listenerPortMatchMode: "off"` is configured to match incoming traffic purely on URI path and host, avoiding OpenResty containerPort (`9080`) mismatch against Gateway listener port (`80`).

### Verification Outcome
This workaround successfully passed all verification checks:
- 100% pass on diagnostic routing (`HTTP 200 OK`, content matched).
- 100% pass on negative security (unmapped routes, Actuator, and Admin API return `404`).
- End-to-end routing verified from Gateway listener to Spring Boot microservice backends (`/api/v1/automotive/operations/test`).

---

## 5. Risks and Limitations

1. **Infrastructure Overhead**: Running etcd adds another stateful container to developer machines (~64–128Mi RAM).
2. **Ephemeral State**: Because persistence is disabled for local convenience, destroying the kind cluster or deleting the etcd pod wipes APISIX route state until the Ingress Controller reconciles.
3. **Controller Re-Sync Dependency**: Route availability depends on ADC quickly re-synchronizing after etcd restarts.
4. **Admin API Network Policy**: `ingressControllerExtraIpList` currently includes `0.0.0.0/0` in local values to allow in-cluster pod communication; this must be tightened in production environments.
5. **Local vs. Production Discrepancy**: While local kind runs single-replica ephemeral etcd, production deployment will require either a multi-node managed etcd cluster or a validated stateless ingress pattern.

---

## 6. Future Investigation

The following technical questions should be investigated in a future milestone:

1. **Standalone API Support**: Does the APISIX Ingress Controller / ADC architecture officially support standalone mode, or does ADC inherently mandate the CRUD Admin API provided only by etcd?
2. **Full-Dump Sync API**: Can the controller or ADC be configured to push whole-state configurations (`PUT /apisix/admin/routes` full document or file reload) rather than individual resource mutations?
3. **Version Compatibility**: Does a newer release of the APISIX Ingress Controller (v2.3+ or v3.x) provide native etcd-free Gateway API translation?
4. **Resilience Testing**: Does the controller automatically re-populate all 8 microservice routes if the `apisix-etcd-0` pod is killed and recreated?
5. **Admin Access Hardening**: Can Admin API access be restricted to a specific ServiceAccount or internal CIDR without breaking ADC communication?

### Reference Documentation
- [Apache APISIX Deployment Modes (Standalone vs Traditional)](https://apisix.apache.org/docs/apisix/deployment-modes/)
- [Apache APISIX Ingress Controller Architecture](https://apisix.apache.org/docs/ingress-controller/)
- [Apache APISIX Admin API Reference](https://apisix.apache.org/docs/apisix/admin-api/)
- [APISIX Declarative CLI (ADC) Documentation](https://github.com/api7/adc)

---

## 7. Resolution Criteria

The deferred etcd dependency may be eliminated only when the following criteria are satisfied:

1. **Compatibility Verified**: An etcd-free configuration mode is validated against the pinned APISIX and Ingress Controller versions.
2. **Gateway API Reconciliation**: The controller reconciles `GatewayClass`, `Gateway`, and `HTTPRoute` resources without errors.
3. **Full Route Programming**: All 8 backend microservice path prefixes (`/api/v1/*`) are accepted and programmed.
4. **Integration Test Suite**: `./scripts/gateway/test.sh` passes 100% of diagnostic and negative security assertions.
5. **Restart Resilience**: Both gateway data-plane and ingress controller pods can be restarted independently without configuration loss or deadlocks.
6. **Zero Business Regressions**: No changes or performance degradation to backend microservices or frontend web application.

---

## 8. Related Files

- `infra/apisix/values-local.yaml` — Local Helm chart configuration and etcd sizing
- `infra/apisix/chart-versions.yaml` — Pinned chart and image component versions
- `infra/kubernetes/overlays/local/gateway/` — Declarative Gateway API manifests (`gatewayclass.yaml`, `gateway.yaml`, `httproutes.yaml`)
- `scripts/gateway/install.sh` — Gateway installation and etcd bootstrap sequence
- `scripts/gateway/test.sh` — Gateway routing and security test suite
