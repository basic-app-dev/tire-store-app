# Kubernetes Local Development Infrastructure

This directory contains the declarative Kubernetes manifests and local development configuration for the Automotive Platform monorepo.

## Architecture Overview

The local Kubernetes environment runs on **kind** (Kubernetes in Docker) as a single control-plane cluster named `tire-store-local`.

All workloads are deployed into a dedicated, isolated namespace: `tire-store`.

```
                    kind cluster: tire-store-local
┌────────────────────────────────────────────────────────────────────────┐
│ Namespace: ingress-apisix (API Gateway Infrastructure)                 │
│                                                                        │
│   - Deployment/Service: apisix (ClusterIP 80 -> 9080)                  │
│   - Deployment/Service: apisix-ingress-controller (Controller + ADC)   │
│   - StatefulSet/Service: apisix-etcd (Minimal ephemeral config store)  │
│   - Gateway API Resources:                                             │
│       * GatewayClass: tire-store-apisix                                │
│       * Gateway: tire-store-api-gateway (Listener on Port 80)          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Cross-Namespace HTTPRoutes
┌───────────────────────────────────▼────────────────────────────────────┐
│ Namespace: tire-store (Business Applications & Frontend)               │
│                                                                        │
│   HTTPRoute: tire-store-backend-routes (Routes 8 service path prefixes)│
│                                                                        │
│   Frontend:                                                            │
│     - Deployment/Service: web (Port 3000)                              │
│                                                                        │
│   Backend Microservices (Spring Boot):                                 │
│     - Deployment/Service: automotive-operations (Port 8091)            │
│     - Deployment/Service: automotive-product   (Port 8092)            │
│     - Deployment/Service: vehicle-sales        (Port 8093)            │
│     - Deployment/Service: vehicle-product      (Port 8094)            │
│     - Deployment/Service: notification         (Port 8095)            │
│     - Deployment/Service: identity-access      (Port 8096)            │
│     - Deployment/Service: appointment          (Port 8097)            │
│     - Deployment/Service: store-management     (Port 8098)            │
└────────────────────────────────────────────────────────────────────────┘
```

## Directory Structure

```text
infra/kubernetes/
├── README.md
├── kind/
│   └── cluster.yaml             # kind cluster configuration (v1alpha4)
├── base/
│   ├── kustomization.yaml       # Composes all services and web application
│   ├── services/
│   │   ├── automotive-operations/
│   │   │   ├── deployment.yaml
│   │   │   ├── service.yaml
│   │   │   └── kustomization.yaml
│   │   ├── automotive-product/
│   │   ├── vehicle-sales/
│   │   ├── vehicle-product/
│   │   ├── notification/
│   │   ├── identity-access/
│   │   ├── appointment/
│   │   └── store-management/
│   └── web/
│       ├── deployment.yaml
│       ├── service.yaml
│       └── kustomization.yaml
└── overlays/
    └── local/
        ├── namespace.yaml       # Namespace definition: tire-store
        ├── kustomization.yaml   # Local dev image overrides (tag: dev-local)
        └── gateway/             # Declarative Kubernetes Gateway API resources
            ├── gatewayclass.yaml   # Class: tire-store-apisix
            ├── gateway.yaml        # Gateway: tire-store-api-gateway (port 80)
            ├── httproutes.yaml     # 8 microservice prefix routes to ClusterIP services
            └── kustomization.yaml  # Kustomize composer for Gateway API
```

See also [`infra/apisix/README.md`](../apisix/README.md) for Apache APISIX Helm configuration and ADC synchronization details.

## Workload Specifications

- **Container Images**: `tire-store/<service>:dev-local`
- **Security Context**:
  - Non-root execution: `runAsNonRoot: true`, `runAsUser: 1001`
  - Privilege escalation disabled: `allowPrivilegeEscalation: false`
  - Linux capabilities dropped: `capabilities: { drop: ["ALL"] }`
- **Resource Constraints (Microservices)**:
  - CPU: `requests: 100m`, `limits: 500m`
  - Memory: `requests: 256Mi`, `limits: 512Mi`
- **Health Probes**:
  - Spring Boot Actuator:
    - Startup: `/actuator/health/liveness` (initialDelay: 10s, period: 5s, failureThreshold: 15)
    - Liveness: `/actuator/health/liveness` (period: 10s, failureThreshold: 3)
    - Readiness: `/actuator/health/readiness` (period: 5s, failureThreshold: 3)
  - Next.js Web:
    - HTTP GET `/` on containerPort 3000

## Quickstart

Run these lifecycle commands from the repository root:

1. **Create local kind cluster**:
   ```bash
   ./scripts/kubernetes/cluster-create.sh
   ```

2. **Load container images into kind**:
   ```bash
   ./scripts/kubernetes/images-load.sh dev-local
   ```

3. **Deploy workloads**:
   ```bash
   ./scripts/kubernetes/deploy.sh
   ```

4. **Verify status**:
   ```bash
   ./scripts/kubernetes/status.sh
   ./scripts/kubernetes/health.sh
   ```

5. **Port-forward for local host testing**:
   ```bash
   ./scripts/kubernetes/port-forward.sh all
   # Or a single service:
   ./scripts/kubernetes/port-forward.sh web 3000
   ```

6. **Teardown**:
   ```bash
   ./scripts/kubernetes/remove-apps.sh    # Delete workloads only
   ./scripts/kubernetes/cluster-delete.sh   # Delete entire kind cluster
   ```
