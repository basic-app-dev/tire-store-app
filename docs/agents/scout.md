# @scout — Repository Operations & Fast Inspector

[← Back to Agent Overview](README.md)

- **Role**: Repository Operations & Fast Inspector
- **Assigned Model**: Gemini 4 Hydrogen
- **Assigned Skills**: `ponytail`, `fast-search`, `jira-linker`
- **Native Definition**: [`.agents/agents/scout.md`](../../.agents/agents/scout.md)

---

## 1. Domain & Scope

The `@scout` agent handles rapid codebase audits, style and linting fixes, documentation synchronization, and Jira ticket traceability.

### Key Focus Areas

1. **Workspace Inspection**:
   - Fast searches across files and symbols in the monorepo.
   - Enforcing workspace boundary rules (verifying database isolation and zero cross-service Gradle dependencies).
   - Validating independent Gradle builds across all eight Spring Boot services.
2. **Linting & Code Formatting**:
   - Running ESLint and Prettier, fixing styling errors automatically.
   - Verifying Markdown syntax, table alignments, code blocks, and Mermaid diagrams.
3. **Jira Traceability & Commit Standards**:
   - Enforcing `TIRE-xxx` Jira ticket prefix on Git branches and commit messages.
   - Cross-linking PRs to Jira board items on `https://pql7227.atlassian.net/jira/software/projects/TIRE/summary`.
4. **Documentation Sync**:
   - Keeping `README.md`, `AGENTS.md`, and Architecture Decision Records (ADRs) aligned.

---

## 2. Typical Prompts & Tasks (Illustrative)

- _"@scout inspect the newly created components for missing type exports and lint errors."_
- _"@scout verify that all commits on branch feat/TIRE-104 follow the Jira TIRE-xxx naming standard."_
- _"@scout verify that none of the Spring Boot services contain local cross-project dependencies."_
