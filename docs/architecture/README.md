# Automotive Platform — Architecture Documentation

This directory contains stable, reusable project decisions. **Task instructions for Antigravity are kept separately in `../prompts/`.**

Read in this order:

1. [01-product-scope.md](01-product-scope.md) — purpose, roles, workflows, multi-store model.
2. [02-service-architecture.md](02-service-architecture.md) — the eight approved service boundaries and ownership rules.
3. [03-technology-stack.md](03-technology-stack.md) — approved frameworks, tools, and exclusions.
4. [04-engineering-standards.md](04-engineering-standards.md) — repository architecture, communication, security, data, testing.
5. [05-infrastructure-deployment.md](05-infrastructure-deployment.md) — Kubernetes and operations.
6. [06-decisions-and-open-questions.md](06-decisions-and-open-questions.md) — stable decisions, open questions and change control.

## Source of truth
These files are the approved target architecture, **not** evidence about what the current repository contains. Only a repository inspection can establish implemented state. When a proposed change conflicts with these documents, explain the conflict and request approval.

## Scope of documentation
Keep these files evergreen: do not put one-time agent tasks, migration checklists tied to the current repository, or temporary progress reports in them. Keep prompts, audit reports and plans separate.
