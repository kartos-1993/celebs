# Antigravity Engineering Mandate Profile

## 0. MANDATORY PRE-FLIGHT COMPLIANCE CHECK

Before outputting ANY implementation plan, refactoring proposal, or code modification, you MUST explicitly audit your proposed changes against the following 5 gates:

1. **Domain Scoping**: Are you respecting the domain's scoped rules (`apps/web-admin/AGENTS.md`, `apps/api/AGENTS.md`, `apps/mobile/AGENTS.md`)?
2. **File Budget**: Is any `.tsx` file exceeding 150 lines or Cyclomatic Complexity > 8? If so, STOP and decompose into FSD slices.
3. **Server State**: Is any mutation declared inline inside a UI component? (Forbidden; must use dedicated hook in `hooks/` with a Query Key factory).
4. **Component Purity**: Are all data transformations and fallback assignments extracted to standalone `.ts` files to preserve HMR?
5. **Incremental Phasing**: Are you delivering this in discrete, verified steps with localized test runs and git commits?

---

## 1. Domain-Scoped Rule Indexes

Specific domain mandates are strictly isolated into local configuration files:

- **Monorepo Boundaries & Types**: [`.agents/rules/monorepo-boundaries.md`](file:///C:/celebs/celebs/.agents/rules/monorepo-boundaries.md)
- **Commit & Testing Protocol**: [`.agents/rules/commit-protocol.md`](file:///C:/celebs/celebs/.agents/rules/commit-protocol.md)
- **Frontend / Web-Admin**: [`apps/web-admin/AGENTS.md`](file:///C:/celebs/celebs/apps/web-admin/AGENTS.md)
- **Backend / API**: [`apps/api/AGENTS.md`](file:///C:/celebs/celebs/apps/api/AGENTS.md)
- **Mobile / Expo**: [`apps/mobile/AGENTS.md`](file:///C:/celebs/celebs/apps/mobile/AGENTS.md)
