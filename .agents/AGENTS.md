# Antigravity Engineering Mandate Profile

## 0. MANDATORY PRE-FLIGHT COMPLIANCE CHECK

Before outputting ANY implementation plan, refactoring proposal, or code modification, you MUST explicitly audit your proposed changes against the following 11 gates:

1. **Domain Scoping**: Are you respecting the domain's scoped rules (`apps/web-admin/AGENTS.md`, `apps/api/AGENTS.md`, `apps/mobile/AGENTS.md`)?
2. **File Budget**: Is any `.tsx` file exceeding 150 lines or Cyclomatic Complexity > 8? If so, STOP and decompose into FSD slices.
3. **Server State**: Is any mutation declared inline inside a UI component? (Forbidden; must use dedicated hook in `hooks/` with a Query Key factory).
4. **Component Purity**: Are all data transformations and fallback assignments extracted to standalone `.ts` files to preserve HMR?
5. **Incremental Phasing**: Are you delivering this in discrete, verified steps with localized test runs and git commits?
6. **Strict Null Contracts & Existence Guarantees**: Never suppress compiler errors with lax parameter typing (`| null | undefined`) in leaf functions or services. Fix contracts at the source: use Prisma's `findUniqueOrThrow()` inside transactions or validated operations so repository return types are strictly non-nullable.
7. **Universal API Response Standardization**: All Express controllers MUST return the canonical `IApiResponse<T>` envelope via `sendSuccess`, `sendCreated`, or `sendPaginated` from `response.util.ts`. Zero bare `res.json({ message, data })` without `success: true`. Zero omission of `message`, `requestId`, or `timestamp`.
8. **Database Concurrency & Deadlock Prevention**: In interactive transactions (`$transaction`), row updates across collections (e.g. inventory reservation/decrement) MUST sort items deterministically by unique key (`inventoryId`) before locking rows to eliminate PostgreSQL 40P01 deadlocks. ZERO sequential loops inside `$transaction` (use `createMany`, batch updates, or single CTEs) to minimize port 6543 connection pool hold times.
9. **Repository Encapsulation & Dead Import Cleanliness**: Every entity model accessed by services MUST have a dedicated Repository (e.g., `ProductRepository`, `InventoryRepository`, `VendorRepository`). Zero direct `prisma.*` or `$queryRaw` calls inside domain services. Zero orphaned Prisma imports (`import prisma from '@/config/db.prisma'`).
10. **Zero Raw Network Calls in Hooks & Clean Client Unwrapping**: Web-Admin and Mobile API client functions MUST return `response.data` (`IApiResponse<T>`) or unwrap uniformly. No mutating functions returning raw `AxiosResponse`. Never call `apiClient`/`axiosClient` directly inside UI components or React Query hooks (must reside in dedicated feature `api.ts` clients).
11. **REST Verbs & YAGNI Pre-Production Simplicity**: In active development, reject legacy backward-compatibility shims, action-verb URLs (`POST /:id/archive`, `POST /:id/toggle-activation`), and triple-nested fallback cascades (`data?.data?.data`). Build cleanly to the standard from the start; delete dead legacy adapters.
12. **TDD Mandate & Security/Cost Hierarchy**:
    - **Test-First Non-Negotiable**: Tests MUST be authored and proven failing FIRST before any application code is touched. Every requirement, bugfix, and vulnerability must have a dedicated test fixture before implementation.
    - **Priority 1 — Absolute Security**: Fail-closed guards, strict authorization, zero account/data enumeration, universal boundary validation at router level before any database interaction.
    - **Priority 2 — Cost & Compute Reduction**: Preserve PostgreSQL port 6543 connection pool; eliminate redundant DB roundtrips via Redis-first caches; reject invalid requests at HTTP gateway with zero database query cost; eliminate N+1 queries.
    - **Priority 3 — Verification Plan First**: Test matrix and resource impact must be planned and agreed upon before writing any solution code.

---

## 1. Domain-Scoped Rule Indexes

Specific domain mandates are strictly isolated into local configuration files:

- **Monorepo Boundaries & Types**: [`.agents/rules/monorepo-boundaries.md`](file:///C:/celebs/celebs/.agents/rules/monorepo-boundaries.md)
- **Commit & Testing Protocol**: [`.agents/rules/commit-protocol.md`](file:///C:/celebs/celebs/.agents/rules/commit-protocol.md)
- **Ponytail Anti-Overengineering**: [`.agents/rules/ponytail.md`](file:///C:/celebs/celebs/.agents/rules/ponytail.md)
- **Frontend / Web-Admin**: [`apps/web-admin/AGENTS.md`](file:///C:/celebs/celebs/apps/web-admin/AGENTS.md)
- **Backend / API**: [`apps/api/AGENTS.md`](file:///C:/celebs/celebs/apps/api/AGENTS.md)
- **Mobile / Expo**: [`apps/mobile/AGENTS.md`](file:///C:/celebs/celebs/apps/mobile/AGENTS.md)
