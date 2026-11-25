# Architecture Decision Register (Root Index)

> **Canonical Decision Authority**: The single master architecture decision register is [`service-blueprints/approved-decisions.md`](./service-blueprints/approved-decisions.md) (retaining `ADR-01`–`ADR-18`, Part 0 governance rules `GOV-01`–`GOV-05`, and approved correction directions `COR-DIR-01`–`COR-DIR-10`).
> **Correction Remediation Tracker**: All 132 Round-2 audit findings across Parts 0–12 are tracked in [`service-blueprints/architecture-correction-register.md`](./service-blueprints/architecture-correction-register.md).
> This root document preserves original technology/product scope decisions and open verification gates without creating a competing decision authority.

## Approved and stable (Foundational Stack & Scope)
- **Scope:** one automotive company with multiple branches; web, Android and iOS; tire sales, repair management, inventory and used-car sales.
- **Business boundaries:** precisely eight independent microservices in Automotive Services, Used-Car Sales and Shared Platform, as defined in `02-service-architecture.md`.
- **Backend:** Java 25 LTS, Spring Boot 4.2.x, appropriate Spring Cloud 2026.0.x modules, Gradle **Kotlin DSL** (business code still Java), Spring MVC REST.
- **Build & Runtime Independence:** eight standalone Spring Boot projects inside one Git monorepo, each with its own independent Gradle build, wrapper, and runtime. Centralized multi-project Gradle build is rejected.
- **Gateway:** Apache APISIX OSS on Kubernetes, rather than Spring Cloud Gateway.
- **Communication:** REST/JSON and RabbitMQ; OpenAPI and versioned events; gRPC/GraphQL/Kafka not baseline.
- **Persistence:** PostgreSQL ownership per service, Flyway; Redis selectively.
- **Identity:** Keycloak + Spring Security, store-scoped access control.
- **Web:** Next.js App Router, React/TypeScript with SSR/BFF.
- **Mobile:** React Native + Expo/EAS, potential native Kotlin/Swift modules.
- **Deployment:** Kubernetes, Helm, Argo CD, Terraform, observability and CI.
- **License preference:** free/open-source software, with practical infra/third-party costs subject to approval.

## To verify before implementation
1. Exact Spring Boot/Spring Cloud/third-party plugin compatibility at initialization time; pin compatible versions.
2. Existing repository structure, functioning code, Supabase roles and data, and the purpose of the two Next.js projects.
3. Kubernetes distribution/hosting provider, cluster access, secrets backend, data infrastructure operations and budget.
4. Product details: payment processor, tax treatment, regional legal requirements, suppliers, tire fitment data sources, vehicle-sales workflow and role permissions.
5. Mobile hardware integrations, offline scope and vendor SDK availability.
6. External messaging (email/SMS/push) providers and their costs.
7. Exact API/event schemas, payment workflow and end-to-end acceptance tests.

## Decision discipline
A documented architecture decision is not evidence that it has been implemented. Report actual code observations separately. Architectural changes require an ADR with context, alternatives, impact, and explicit project-owner approval. One-time tasks, audits, migrations, and commands belong in prompts/plans, not this evergreen document.
