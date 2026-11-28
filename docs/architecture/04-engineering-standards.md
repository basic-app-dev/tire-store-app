# Engineering Standards and Repository Design

## Monorepo target (not an instruction to move existing files)
```text
automotive-platform/
├── backend/
│   ├── services/
│   │   ├── automotive-operations/     # Standalone Gradle project (settings.gradle.kts, build.gradle.kts, gradlew)
│   │   ├── automotive-product/        # Standalone Gradle project (settings.gradle.kts, build.gradle.kts, gradlew)
│   │   ├── vehicle-sales/             # Standalone Gradle project (settings.gradle.kts, build.gradle.kts, gradlew)
│   │   ├── vehicle-product/           # Standalone Gradle project (settings.gradle.kts, build.gradle.kts, gradlew)
│   │   ├── notification/              # Standalone Gradle project (settings.gradle.kts, build.gradle.kts, gradlew)
│   │   ├── identity-access/           # Standalone Gradle project (settings.gradle.kts, build.gradle.kts, gradlew)
│   │   ├── appointment/               # Legacy directory (target retired; merged into store-management per P5-DEC-01 — do not delete until Phase 3 migration)
│   │   └── store-management/          # Standalone Gradle project (settings.gradle.kts, build.gradle.kts, gradlew)
│   ├── libraries/{security-support,observability-support,api-error-support,test-support}/
│   └── contracts/{openapi,events}/
├── apps/{web,mobile}/
├── packages/{api-client,shared-types,design-tokens}/
├── deploy/{helm,argocd}/
├── infrastructure/{docker,compose,terraform}/
├── docs/{architecture,adr,api}/
├── .github/workflows/
└── pnpm-workspace.yaml
```

The gateway may live at `backend/gateway/`. The seven target backend services (`P5-DEC-01`; `appointment` merged into `store-management`) are standalone Gradle projects (each with its own `settings.gradle.kts`, `build.gradle.kts`, and Gradle Wrapper) inside the Git monorepo; there is no centralized root Gradle project. A separate pnpm workspace manages `apps/{web,mobile}` and `packages/*`. Each service requires its own `@SpringBootApplication`, JAR, container image, Kubernetes Deployment, and Flyway database migration set.

## Within each Spring service
Prefer package-by-feature, with `api/`, `application/`, `domain/`, `infrastructure/` under each business feature. Use explicit application use cases and domain invariants. Controller DTOs are not JPA entities; external adapters should not leak into the domain. Avoid gratuitous separate Gradle subprojects for every package.

## APIs and integration
- OpenAPI contract per service; generated TypeScript client for web/mobile; standard validation, pagination, errors (Problem Details where appropriate), dates/timezones, IDs and versioning.
- Versioned event schema with event ID, source, type, schema version, timestamp, correlation ID and payload.
- REST calls: deadline/timeout, authorization, bounded/safe retries, error translation and traces.
- RabbitMQ: durable topic exchange `tirestore.events`, transactional outbox (`<schema>.outbox_event`) with publisher confirms and `mandatory` routing, idempotent consumers (`<schema>.consumer_inbox` keyed by `(consumer_name, event_id)`), manual ACK only after local SQL commit, 5 total broker delivery attempts before quarantine DLQ; never assume exactly-once delivery.
- Cross-service workflows: documented orchestration, timeout policy, hold expiry and compensations. No distributed SQL transactions by default.

## Security
- Keycloak for identity; web uses OIDC code flow with secure HTTP-only session cookies; mobile uses OIDC authorization code with PKCE and secure token storage.
- Spring Security validates token issuer/audience/signature/expiry and enforces operation- and store-scoped authorization.
- Do not trust client-provided `store_id` alone. Derive/validate authorized store access server-side.
- Internal calls authenticated; TLS, least-privilege DB accounts, secrets out of source control, secure audit logs and no raw payment-card storage.

## Persistence
Each service owns **one logical PostgreSQL database and one matching named schema**, with explicit Flyway `schemas`/`defaultSchema` configuration and qualified DDL. Separate migration roles (DDL on own schema only) from least-privilege runtime roles (DML only, zero cross-service grants). Do not enable automatic schema mutation in production. Use constraints and locking/atomic operations for inventory and exclusive resource holds. Do not use Redis as a source of truth.

## Observability, testing and quality
Actuator probes; consistent structured logs and trace propagation across HTTP/messages; Micrometer and OpenTelemetry. Unit, controller, PostgreSQL/RabbitMQ Testcontainers integration, authorization, contract and cross-service workflow tests. Include concurrent booking/stock scenarios, idempotency and partial failures. Enforce dependency direction/package access via ArchUnit. Do not claim a test passed unless executed and observed.

## Collaboration and safety
Separate **APPROVED**, **REPOSITORY-OBSERVED**, **ASSUMPTION**, **RECOMMENDATION**, **PENDING-APPROVAL** in agent reports. Preserve existing code and data until migration is explicitly approved. No unsolicited delete/overwrite, secrets disclosure, commit, push, merge, deploy or external resource changes. Prefer cohesive incremental changes and reusable contracts rather than duplicated disconnected code.
