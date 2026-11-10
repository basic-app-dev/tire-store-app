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

1. **Vitest Unit & Integration Tests**:
   - Validation schema tests in `packages/types` (fitment logic, staggered setups, tire specs).
   - Hook tests in `packages/api-client`.
   - Database schema unit tests and RPC assertions in `packages/db`.
2. **Playwright Cross-Browser E2E Tests**:
   - Automated test specs for customer flows (vehicle fitment search, store locator, checkout).
   - Admin & store manager workflows (bay appointment management, technician check-in).
3. **Database RLS Security Verification**:
   - Multi-tenant security assertions verifying role isolation (`customer`, `shop_worker`, `store_manager`, `super_admin`).
4. **CI/CD Quality Gates**:
   - GitHub Actions automated test workflows and coverage validation on PRs.

---

## 2. Typical Prompts & Tasks

- _"@qa-tester write Playwright tests for the vehicle fitment search and garage save flow."_
- _"@qa-tester create Vitest test cases verifying that staggered tire fitments calculate separate front and rear dimensions."_
- _"@qa-tester verify that shop workers cannot access appointments from other stores via Supabase RLS tests."_
