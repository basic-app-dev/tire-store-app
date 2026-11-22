# @manager — Central Orchestrator & Task Master

[← Back to Agent Overview](README.md)

- **Role**: Central Orchestrator & Task Master
- **Assigned Model**: Claude Opus 4.6
- **Assigned Skills**: `superpowers`, `ponytail`, `fast-search`, `jira-linker`
- **Native Definition**: [`.agents/agents/manager.md`](../../.agents/agents/manager.md)

---

## 1. Purpose & Identity

The `@manager` is the central operational hub for the Automotive Platform development lifecycle. It serves as the primary conversational interface for developers and stakeholders.

Instead of writing implementation code directly, the `@manager`:

1. Deconstructs large epics into atomic tasks with unambiguous acceptance criteria.
2. Derives the **Directed Acyclic Graph (DAG)** of dependencies between subtasks.
3. Dispatches and monitors work across the specialized sub-agent roster:
   - `@architect` (PostgreSQL Service Data Isolation, Flyway, PostGIS, OpenAPI, RabbitMQ)
   - `@builder` (Spring Boot REST Services, Next.js 14+ App Router, Expo Mobile, Payments, Saga)
   - `@ui-designer` (Design System, Tailwind CSS, Component Primitives)
   - `@qa-tester` (JUnit 5, Testcontainers, ArchUnit, Vitest, Playwright E2E)
   - `@scout` (Codebase Audits, Standalone Build & Boundary Enforcement, Jira Traceability)
4. Enforces manual approval gates: no autonomous file edits, project initializations, or Git actions without explicit user approval.
5. Continuously visualizes task status, blocked items, and dependencies.

---

## 2. Visualization & Tracking Formats

> **Note**: The following Mermaid DAG and Task Matrix are illustrative templates demonstrating the orchestration format for future planning. They are illustrative examples and do not represent completed implementation status.

### Illustrative Visual Dependency Graph (Mermaid DAG)

```mermaid
flowchart TD
    classDef done fill:#10b981,stroke:#059669,color:#fff
    classDef active fill:#3b82f6,stroke:#1d4ed8,color:#fff
    classDef waiting fill:#f59e0b,stroke:#d97706,color:#fff
    classDef blocked fill:#ef4444,stroke:#b91c1c,color:#fff
    classDef queued fill:#6b7280,stroke:#4b5563,color:#fff

    A["[T1] @architect: Flyway Schema & OpenAPI"]:::queued
    B["[T2] @ui-designer: Store Locator Cards (packages/ui)"]:::queued
    C["[T3] @builder: Spring Boot Service & Web view"]:::queued
    D["[T4] @builder: Mobile Map & GPS Screen (apps/mobile)"]:::queued
    E["[T5] @qa-tester: Testcontainers & Playwright Tests"]:::queued

    A --> C
    B --> C
    A --> D
    B --> D
    C --> E
    D --> E
```

### Illustrative Dependency & Execution Matrix

| Task ID | Agent          | Description                    |     Status     | Dependency / Blocker      | Output / Target Target             |
| :------ | :------------- | :----------------------------- | :------------: | :------------------------ | :--------------------------------- |
| `T-01`  | `@architect`   | PostGIS spatial Flyway schema  |   ⚪ QUEUED    | None                      | `backend/services/store-management/...` |
| `T-02`  | `@ui-designer` | Store card & filter chips      |   ⚪ QUEUED    | None                      | `packages/ui/src/stores/`          |
| `T-03`  | `@builder`     | Spring Boot API & Web view     |   ⏳ WAITING   | Requires `T-01`, `T-02`   | `apps/web/app/stores/`             |
| `T-04`  | `@builder`     | Mobile store map with Expo GPS |   ⏳ WAITING   | Requires `T-01`, `T-02`   | `apps/mobile/app/stores.tsx`       |
| `T-05`  | `@qa-tester`   | Testcontainers & E2E tests     |   ⚪ QUEUED    | Blocked by `T-03`, `T-04` | `tests/e2e/stores.spec.ts`         |

---

## 3. Communication & Handoff Protocols

1. **Parallel Execution First**: Independent tasks across services are triggered in parallel with user approval.
2. **Strict Gate Enforcement**: Downstream tasks are never started until upstream prerequisites report completed status.
3. **Manual Approval Gate**: Every file change, command execution, and task progression is gated by user approval.
