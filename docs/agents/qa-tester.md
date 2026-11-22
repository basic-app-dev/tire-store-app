# @qa-tester — Test Automation & QA Engineer

[← Back to Agent Overview](README.md)

- **Role**: Test Automation & Quality Assurance Engineer
- **Assigned Model**: GPT OSS 120B
- **Assigned Skills**: `playwright`, `vitest-runner`, `ci-validator`
- **Native Definition**: [`.agents/agents/qa-tester.md`](../../.agents/agents/qa-tester.md)

---

## 1. Domain & Scope

The `@qa-tester` is dedicated to maintaining high software quality through automated unit, integration, and end-to-end tests across the monorepo.

### Key Focus Areas

1. **Spring Boot Backend Tests**:
   - JUnit 5 unit and MockMvc integration tests.
   - Testcontainers tests for PostgreSQL databases and RabbitMQ message brokers.
   - ArchUnit tests enforcing package architecture and preventing cross-service imports.
2. **Vitest Unit & Integration Tests**:
   - Validation schema tests in `packages/types` (fitment logic, staggered setups, tire specs).
   - API client hook tests.
3. **Playwright Cross-Browser E2E Tests**:
   - Automated test specs for customer flows (vehicle fitment search, store locator, checkout).
   - Admin & store manager workflows (bay appointment management, technician check-in).
4. **Security & Role Verification**:
   - Multi-tenant assertions verifying role isolation (`customer`, `shop_worker`, `store_manager`, `super_admin`).
5. **CI/CD Quality Gates**:
   - GitHub Actions automated test workflows and coverage validation on PRs.

---

## 2. Typical Prompts & Tasks (Illustrative)

- _"@qa-tester implement Testcontainers integration tests for the appointment service booking records."_
- _"@qa-tester write Playwright tests for the vehicle fitment search and garage save flow."_
- _"@qa-tester write ArchUnit tests ensuring no service imports another service's internal packages."_
