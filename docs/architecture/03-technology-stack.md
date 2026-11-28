# Approved Technology Stack

## Backend
- Java **25 LTS** application code, **Spring Boot 4.2.x**; Spring Cloud **2026.0.x** components only where needed. Verify specific dependency compatibility before initialization/upgrades.
- **Gradle Kotlin DSL** (`settings.gradle.kts`, `build.gradle.kts`) for seven target standalone Gradle projects (`P5-DEC-01`), each with its own dedicated Gradle Wrapper. **Do not write Kotlin business code merely because the build DSL is Kotlin.**
- **Spring Web MVC** for backend REST controllers (`@RestController`), not server-rendered business pages.
- **Spring Security** OAuth2/OIDC resource-server capabilities, Jakarta Validation, Spring transactions; **Spring AOP** selectively for cross-cutting infrastructure, never hidden core workflows.
- **Spring Data JPA/Hibernate** for suitable transactional persistence; **JdbcClient/JDBC** for SQL needing explicit control. **Flyway** migrations. Spring Cache / Spring Data Redis only when warranted.
- **Spring HTTP Service Clients** for REST service calls, Spring AMQP for RabbitMQ, **Spring Cloud CircuitBreaker + Resilience4j** selectively. Scheduling/Batch/WebSocket only where justified.
- **Spring Boot Actuator**, Micrometer and OpenTelemetry; Spring Boot Test, JUnit, Mockito, MockMvc, Testcontainers; ArchUnit for architecture rules.

## Edge and clients
- **Apache APISIX** (open-source/self-hosted) with Kubernetes controller: ingress/API routing, policies and rate limits. Do not add Spring Cloud Gateway as well.
- **Next.js App Router + React + TypeScript** independently deployed Node.js SSR frontend/BFF; Tailwind CSS, consistent component library, optional TanStack Query for interactive state.
- **React Native + Expo**, Expo Router, EAS Build/Submit for Android/iOS. Start with Expo SDK 58 *subject to verification at setup time*. Use native Kotlin/Swift Expo Modules if actual hardware requirements necessitate them.
- **pnpm workspaces** for TypeScript packages (generated OpenAPI clients, stable shared types/design tokens); Turborepo optional, not mandatory.

## Data and communication
- **PostgreSQL**, logically separate database and credentials per each of seven target services (`P5-DEC-01`); one cluster initially is acceptable.
- **RabbitMQ + Spring AMQP**, versioned domain-event contracts, transactional outbox, idempotent consumers, dead-letter queues and observability.
- **REST/JSON + OpenAPI** default; gRPC only after measured needs; no GraphQL or Kafka initially.
- **Redis** only for targeted caching/ephemeral concerns, never the authoritative inventory/payment/order record.
- **Keycloak** handles OIDC authentication; Identity & Access service handles application profiles, store roles and policies.

## Platform and automation
- OCI/Docker images; **Kubernetes**, **Helm**, **Argo CD**, **Terraform**, **GitHub Actions**; Kubernetes native DNS rather than Eureka; ConfigMaps + External Secrets Operator and a secrets backend.
- Prometheus, Grafana, OpenTelemetry/Tempo or Jaeger, centralized structured logs.
- Prefer free/open-source software without required license/subscription fees; infrastructure, SMS and payments may still incur costs.

## Explicit non-selections at baseline
No Spring Cloud Gateway, Eureka, default Spring Cloud Config Server, Kafka, GraphQL, blanket WebFlux adoption, service mesh, separate native mobile apps, or direct Supabase business APIs from clients. Alternatives may be proposed with evidence but require approval.
