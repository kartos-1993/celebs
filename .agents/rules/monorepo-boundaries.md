# Monorepo Boundaries & Architecture Rules

## 1. Engine Execution Boundaries & Environment Realignment

- Scope Restrictions: Constrain execution logs natively within local absolute container blocks.
- Terminal Execution Safety: Evaluate data structural states prior to running any terminal actions.

## 2. Package Boundaries & Single Source of Truth

- Core domain entity types, data contracts, Zod schemas, and cross-application invariants MUST strictly originate from `@celebs/shared-types`. Apps (`apps/api`, `apps/web-admin`, `apps/mobile`) must re-export or consume shared contracts rather than redefining duplicate interfaces locally.
- `@celebs/shared-*` packages must maintain strict downward dependency flow and NEVER depend on target application scopes (`apps/*`). `@celebs/shared-types` must remain pure TypeScript type declarations without runtime side effects.
- Unidirectional Dependency Flow: Applications MUST NOT import directly from other applications.

## 3. Strict Type Safety & No-Explicit-Any Mandate

- Explicit `any` annotations are strictly forbidden across all production code, domain modules, and test suites (`__tests__`).
- Domain models and payloads must use explicit TypeScript types (e.g. Prisma models, Zod schema inputs/outputs like `CreateProductType`, `ProductFilterType`).
- Function return types, test helper objects, and mocked boundaries must be strongly typed.
- Avoid unsafe double-cast escape hatches (`as unknown as Record<string, unknown>`).
- Use structured optional fields or index signatures with runtime type guards (e.g. `isRecord(val)`, `Array.isArray(val)`) and Zod schema parsing.
