# @scout — Repository Operations & Fast Inspector

[← Back to Agent Overview](README.md)

- **Role**: Repository Operations & Fast Inspector
- **Assigned Model**: Flash 3.8
- **Assigned Skills**: `ponytail`, `fast-search`, `jira-linker`
- **Native Definition**: [`.agents/agents/scout.md`](../../.agents/agents/scout.md)

---

## 1. Domain & Scope

The `@scout` agent handles rapid codebase audits, style and linting fixes, documentation synchronization, and Jira ticket traceability.

### Key Focus Areas

1. **Workspace Inspection**:
   - Fast searches across files and symbols in the monorepo.
   - Enforcing workspace boundary rules (preventing client app direct imports of `@tire-store/db`).
2. **Linting & Code Formatting**:
   - Running ESLint and Prettier, fixing styling errors automatically.
   - Verifying Markdown syntax, table alignments, code blocks, and Mermaid diagrams.
3. **Jira Traceability & Commit Standards**:
   - Enforcing `TIRE-xxx` Jira ticket prefix on Git branches and commit messages.
   - Cross-linking PRs to Jira board items on `https://pql7227.atlassian.net/jira/software/projects/TIRE/summary`.
4. **Documentation Sync**:
   - Keeping `README.md`, `AGENTS.md`, and Architecture Decision Records (ADRs) aligned.

---

## 2. Typical Prompts & Tasks

- _"@scout inspect the newly created components for missing type exports and lint errors."_
- _"@scout verify that all commits on branch feat/TIRE-104 follow the Jira TIRE-xxx naming standard."_
- _"@scout check markdown formatting and table alignment in docs/architecture/."_
