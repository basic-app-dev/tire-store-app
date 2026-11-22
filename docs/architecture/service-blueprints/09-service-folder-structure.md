# 09 — Service Folder Structure

> **Status:** Proposed implementation convention; this document does not scaffold or refactor services.  
> **Scope:** Each independent Spring Boot service under `backend/services/`.  
> **Source:** [Spring Boot Project Structure Explained (Best Practices) — Anand](https://medium.com/@anandjeyaseelan10/spring-boot-project-structure-explained-best-practices-c2ba46ea57eb).

## 1. Purpose

Use a predictable structure so developers can locate HTTP endpoints, business logic, persistence, configuration and tests quickly. This adapts the article's package-by-layer layout to this repository's independent Gradle Kotlin DSL projects, service-owned databases and Keycloak security model.

The tree below is a **recommended template**, not an inventory of implemented classes. `automotive-operations` is the example service; replace its package and class names with those of the service being developed. Its existing base package is `com.tirestore.operations`.

## 2. Recommended Service Tree (only for src/main/java/com/tirestore/....)

```text
backend/services/automotive-operations/
├── src/
│   ├── main/
│   │   ├── java/com/tirestore/operations/
│   │   │   ├── AutomotiveOperationsApplication.java
│   │   │   ├── config/
│   │   │   │   ├── SecurityConfig.java
│   │   │   │   └── OpenApiConfig.java
│   │   │   ├── controller/
│   │   │   │   └── OrderController.java
│   │   │   ├── service/
│   │   │   │   └── OrderService.java
│   │   │   ├── repository/
│   │   │   │   └── OrderRepository.java
│   │   │   ├── model/
│   │   │   │   ├── entity/
│   │   │   │   │   └── Order.java
│   │   │   │   └── dto/
│   │   │   │       ├── CreateOrderRequest.java
│   │   │   │       └── OrderResponse.java
│   │   │   ├── mapper/
│   │   │   │   └── OrderMapper.java
│   │   │   ├── exception/
│   │   │   │   ├── GlobalExceptionHandler.java
│   │   │   │   └── ResourceNotFoundException.java
│   │   │   ├── security/
│   │   │   │   └── StoreAccessPolicy.java
│   │   │   ├── integration/                # Only when integrations are needed
│   │   │   │   ├── client/
│   │   │   │   └── messaging/
│   │   │   ├── saga/                       # Only in services owning orchestration
│   │   │   └── util/                       # Only genuinely reusable small helpers
│   │   └── resources/
│   │       ├── application.yml
│   │       ├── application-dev.yml
│   │       ├── application-prod.yml
│   │       └── db/
│   │           └── migration/
│   │               └── V1__initial_schema.sql
│   └── test/
│       ├── java/com/tirestore/operations/
│       │   ├── controller/
│       │   ├── service/
│       │   ├── repository/
│       │   ├── security/
│       │   ├── integration/
│       │   └── architecture/
│       └── resources/
│           ├── application-test.yml
│           └── fixtures/
└── README.md
```

Example Java classes and migration filenames are illustrative, not approved APIs, database definitions or instructions to replace existing migration history. Add only the packages the service needs; do not create empty folders to satisfy the diagram.

## 3. Java Package Responsibilities

| Package / file | Responsibility |
| --- | --- |
| `AutomotiveOperationsApplication.java` | Application entry point with `@SpringBootApplication`. Keep it at the base-package root so default component scanning includes child packages. |
| `config/` | Spring bean and framework wiring: security filter chains, HTTP clients, messaging configuration and OpenAPI setup. Keep business rules out. Add a dedicated database configuration class only when Boot's normal configuration is insufficient. |
| `controller/` | HTTP boundary: routes, request validation, status codes and response DTOs. Controllers delegate use cases to services rather than implementing business workflows or querying repositories directly. |
| `service/` | Application use cases and business rules. Coordinates repositories, mapping and integrations, with local transaction boundaries where appropriate. `OrderService.java` can be a concrete Spring service; use an interface plus implementation when an actual contract or multiple implementations justify it. |
| `repository/` | Persistence access to this service's owned data, using Spring Data JPA repositories or focused SQL/JdbcClient adapters. Contains queries and persistence operations, not HTTP handling or remote-service orchestration. |
| `model/` | Parent package separating persistence models from external API contracts. It is not a catch-all for unrelated helpers. |
| `model/entity/` | JPA entities and owned persistence mappings. Preserve approved identifiers, types and constraints; do not model another service's entities as cross-service JPA relationships. |
| `model/dto/` | Explicit request and response contracts. Separate input and output shapes where useful; apply validation annotations to input. Do not return JPA entities directly or expose credentials and internal persistence fields. |
| `mapper/` | Converts between DTOs and entities or other internal models. Use manual mapping or an approved mapping library; mapping should not secretly perform database writes or remote calls. |
| `exception/` | Application exceptions and centralized HTTP error translation, normally via `@RestControllerAdvice`. Return consistent safe errors without leaking stack traces, credentials or SQL details. |
| `security/` | Authorization policies, verified principal/claim handling and store/customer ownership checks. `config/SecurityConfig.java` wires the framework; this package contains reusable security behavior. |
| `integration/` | Optional boundary for external systems and other services, keeping transport-specific concerns out of controllers and core business logic. |
| `integration/client/` | Typed REST clients and external-provider adapters, including timeout and error translation behavior. Communicate through approved APIs, never another service's repository or database. |
| `integration/messaging/` | RabbitMQ publishers, consumers and message contracts/adapters. Handle duplicate delivery and retries appropriately; do not assume exactly-once delivery. |
| `saga/` | Optional durable workflow coordination: steps, state transitions, compensation and recovery. Applicable to the owning orchestrators, such as Automotive Operations and Vehicle Sales; not a requirement for every service. See [08 — Saga Orchestration](./08-saga-orchestration.md). |
| `util/` | Small, focused, stateless helpers with genuine reuse. Prefer meaningful domain classes or standard libraries over a growing miscellaneous utility package. |

### Typical Request Flow

```text
HTTP request
  → controller (validate request DTO)
  → service (authorize the use case and apply business rules)
  → repository (read/write owned data)
  → mapper (produce response DTO)
  → HTTP response
```

Authentication and applicable request-level authorization run through Spring Security before the controller. Ownership checks also belong at the appropriate application/security boundary; validating a request's `store_id` alone is not authorization. Mapping may occur at different points depending on the use case.


## 4. Test Folder Responsibilities

Mirror the production package structure under `src/test/java/<base-package>/`.

| Test path | Responsibility |
| --- | --- |
| `controller/` | HTTP routes, input validation, status codes and response contracts, typically using MockMvc. |
| `service/` | Business rules and use cases, including failure paths and local transaction behavior where integration tests are needed. |
| `repository/` | Queries, mappings and constraints against a representative PostgreSQL test database, typically using Testcontainers. |
| `security/` | Authorized and unauthorized access, customer ownership and store-scoped role isolation. |
| `integration/` | External API/message boundaries, duplicate messages, timeouts and recovery. Use controlled stubs or containers, not live production providers. |
| `architecture/` | ArchUnit rules for layer boundaries, dependency direction and forbidden cross-service imports. |
| `src/test/resources/` | Test-only configuration and resources. Never embed production connection strings or credentials. |
| `src/test/resources/fixtures/` | Small synthetic test inputs and expected outputs; no real customer records, tokens or payment details. |