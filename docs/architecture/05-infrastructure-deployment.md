# Kubernetes and Operations

## Deployment model
Self-managed Kubernetes is the selected orchestration direction; the precise infrastructure provider/cluster distribution has **not** been selected. Every business service has an independent OCI image, Kubernetes Deployment/Service, configuration, readiness/startup/liveness probes, resource budgets and release process. The APISIX gateway and Next.js SSR server are separate deployables.

## Components
- **Apache APISIX + Kubernetes controller:** external API traffic, routing and edge controls; do not publicly expose internal business services.
- **Kubernetes Services/DNS:** internal discovery. Avoid Eureka and a redundant public gateway hop for backend-to-backend traffic.
- **Helm:** reusable base chart and per-service values, not seven copied charts.
- **Argo CD:** GitOps synchronization of approved desired state.
- **Terraform:** infrastructure resources; exact modules depend on chosen hosting environment.
- **ConfigMaps, External Secrets Operator and secrets backend:** configuration and secrets; never store actual secrets in Git.
- **Kubernetes NetworkPolicies:** isolate workloads; use TLS and authenticated service communication.
- **HPA** for suitable HTTP workloads; **KEDA** optional for broker consumers when justified.
- **cert-manager** for certificates if appropriate to selected cluster/ingress design.

## Data infrastructure
PostgreSQL, RabbitMQ, Redis and Keycloak must have documented backups, restore procedures, upgrades and health monitoring. Prefer independently managed stateful infrastructure when it is available within deployment constraints. If hosting it on Kubernetes, plan persistent storage, availability, operator support and disaster recovery explicitly. Seven service-owned PostgreSQL databases (`P5-DEC-01`) can share a cluster, but not tables or credentials.

## Environment and delivery
Development, staging and production must have distinct configuration and data. A single nonproduction cluster may be appropriate initially; choose production isolation based on risk and budget. GitHub Actions builds/tests/scans and publishes versioned images; Argo CD deploys approved manifests. Do not deploy automatically without owner approval. Enable rollback, migration compatibility and safe rollout practices.

## Observability and operations
- Spring Actuator, Micrometer, OpenTelemetry.
- Prometheus/Grafana for metrics and dashboards.
- Tempo/Jaeger for tracing; centralized JSON logs and correlation identifiers.
- Alert on API error/latency, failed deliveries, reservation inconsistencies, database availability, outbox backlog and queue dead letters.

## Cost constraint
Use free/open-source software where possible. 'No paid software' does not imply free servers/cloud, bandwidth, SMS or payment processing. Any infrastructure costs or paid vendor dependencies require explicit approval.
