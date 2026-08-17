# Antigravity Engineering Mandate Profile Context File

## 1. Engine Execution Boundaries & Environment Realignment

You are operating inside the context parameters of the 'kartos-1993/celebs' platform monorepo structure. Every file modification pass must enforce strict structural maintenance guidelines:

- Scope Restrictions: Constrain execution logs natively within local absolute container blocks.
- Terminal Execution Safety: Evaluate data structural states prior to running any terminal actions.

## 2. Canonical Monorepo Folder Topography Rules

Enforce all file creation logic to follow this structure precisely:

- apps/api/src/config/ -> Initialization entrypoints for database pool wrappers and singletons.
- apps/api/src/modules/ -> Domain-driven mini-apps split into controllers, services, repositories.

## 3. Single Database Storage & Component Architecture Controls

- Store all data models (users, transactions, catalog products, dynamic JSON attributes, option variants, ledgers, and sessions) 100% inside a single PostgreSQL database managed via Prisma.
- Component Layers must isolate logical boundaries cleanly:
  1. Routes: Maps structural URL endpoint properties and applies guards.
  2. Controllers: Captures request models, handles express headers. No inline DB execution blocks.
  3. Services: Executes core business logic calculations and orchestrates domain data flows.
  4. Repositories: Direct access to underlying data layers through ORM singletons.

## 4. Operational Protocols & Scale-Out Hardening Rules

- Connection footprints must be pooled via singletons using port 6543 for Postgres transaction routing.
- Media upload components must completely avoid Multer memory streams. Use Cloudflare R2 presigned PUT url generation pipelines directly to decouple edge binary ingestion tracks.
- High-concurrency caching loops must rely on stateless HTTP REST operations backed by Upstash Redis.
- Isolate testing vectors within localized '**tests**' files. Ensure cross-domain repository abstractions are thoroughly stubbed with fast mock profiles to avoid processing over live external cloud infrastructures.

## 5. Strict Type Safety & No-Explicit-Any Mandate

- Explicit `any` annotations are strictly forbidden across all production code, domain modules, and test suites (`__tests__`).
- Domain models and payloads must use explicit TypeScript types (e.g. Prisma models, Zod schema inputs/outputs like `CreateProductType`, `ProductFilterType`).
- Function return types, test helper objects, and mocked boundaries must be strongly typed.

## 6. Incremental Step-by-Step Refactoring & Commit Mandate

- Never dump massive, unreviewable multi-file changes across the entire monorepo all at once.
- Execute refactoring in discrete, logical steps (e.g. Step 1: `packages/shared-types`, Step 2: `apps/api`, Step 3: `apps/web-admin`, Step 4: `apps/mobile`).
- After completing each logical step:
  1. Run localized typechecks and unit/integration tests to verify correctness.
  2. Commit the changes for that step with a clear, human-friendly git commit message.
  3. Provide a summary of completed changes for review before moving to the next step.

## 7. Mandatory Test Isolation, Local Database & Test Fixture Mandates

- **Local Isolated Database Only**: Integration/unit tests MUST run strictly against local PostgreSQL (`postgresql://postgres:celebs@localhost:5432/celebs_test`). Testing against remote cloud databases (e.g. Supabase cloud) is strictly prohibited.
- **Single Subshell Env Wrapping**: Package `package.json` test scripts must wrap all chained commands inside a single subshell environment scope (`dotenv -e .env.test -- sh -c "..."` or explicit per-command `dotenv -e`) so `vitest` and `prisma db push` always run against the exact same database.
- **Password Hashing for Auth Fixtures**: NEVER insert plain-text passwords into test database records directly. When seeding `User` records for integration tests that perform `/auth/login`, ALWAYS hash the password using `await hashValue(...)`.
- **No External Container/Cloud Dependencies for Tests**: Tests must execute cleanly against local native servers and rely on stubs/mocks for S3 presigned URLs without requiring external cloud connectivity.

## 8. Senior Architect Guidelines & Monorepo Architectural Mandates

- **Monorepo Package Boundaries & Single Source of Truth**:

  - Core domain entity types, data contracts, Zod schemas, and cross-application invariants MUST strictly originate from `@celebs/shared-types`. Apps (`apps/api`, `apps/web-admin`, `apps/mobile`) must re-export or consume shared contracts rather than redefining duplicate interfaces locally.
  - `@celebs/shared-*` packages must maintain strict downward dependency flow and NEVER depend on target application scopes (`apps/*`). `@celebs/shared-types` must remain pure TypeScript type declarations without runtime side effects.

- **React Architecture & Fast Refresh Isolation (`react-refresh/only-export-components`)**:

  - Component files (`.tsx`) MUST ONLY export React components.
  - Data transformation mappers, static configuration objects, schema parsing helpers, and utility functions must be extracted into standalone `.ts` files to ensure HMR state preservation and fast refresh compliance.
  - Custom React hooks MUST be isolated into dedicated `use-*.ts` files.

- **Hook Stability & Event Handler Closure Management**:

  - Functions passed down as props or used as effect dependencies MUST be stabilized using `useCallback` or `useMemo` to prevent unnecessary render cascades and broken effect lifecycles (`react-hooks/exhaustive-deps`).
  - Heavy or dynamic object transformations (e.g. data table columns, filtered lists) must be memoized at component boundaries.

- **Resource & Memory Leak Prevention**:

  - Dynamic object URLs created via `URL.createObjectURL()` during file previews MUST be explicitly revoked in effect cleanup callbacks (`URL.revokeObjectURL()`).
  - Event listeners, timers, and WebSocket subscriptions must include explicit tear-down routines on unmount.

- **Domain Model Extensibility & Type-Safe Guards (No Hacky Double-Casts)**:

  - Avoid unsafe double-cast escape hatches (`as unknown as Record<string, unknown>`).
  - Shared domain entity interfaces in `@celebs/shared-types` that accommodate dynamic attributes or optional metadata MUST explicitly declare structured optional fields (e.g. `dynamicData?: Record<string, unknown>`, `uploadedAssets?: Record<string, unknown>`) or index signatures (`[key: string]: unknown`) when dynamic keys are part of the domain contract.
  - Use runtime type guards (e.g. `isRecord(val)`, `Array.isArray(val)`) and Zod schema parsing to safely inspect dynamic payloads.

- **React Hook Form Path Invariants (`Path<TFormValues>` & `FieldValues`)**:

  - Avoid casting `form.setValue` itself to untyped function signatures.
  - Dynamic forms handling schema-driven category fields should be bound using `useForm<FieldValues>()` or `UseFormReturn<FieldValues>`, allowing native `form.setValue(name, value)` without path inference breakage.
  - Statically typed forms with dynamic nested paths MUST type field paths using React Hook Form's `Path<TFormValues>` or `FieldPath<TFormValues>` (e.g., `form.setValue(path as Path<ProductFormValues>, value)`).

- **Cross-Platform & Native Invariants (Mobile / Web)**:
  - Mobile UI components MUST use native synthetic event signatures (`GestureResponderEvent`, `NativeSyntheticEvent<NativeScrollEvent>`) and native theme properties (`ColorValue`).
  - Platform-specific dynamic module imports or asset requires in Expo MUST be guarded with scoped lint rules (`// eslint-disable-next-line @typescript-eslint/no-require-imports`).

## 9. Frontend Ecosystem Architectural Mandate (`apps/web-admin`)

### 1. Feature-Sliced Domain Architecture & Modularity

- The `web-admin` application MUST strictly adhere to a Feature-Sliced Design (FSD) paradigm. Monolithic folders (e.g., global `/components`, `/hooks`, `/services`) are strictly prohibited.
- **Domain Co-location**: Every business domain (e.g., `product`, `category`, `order`, `vendor`) MUST exist as an isolated module under `src/features/{domain}/`.
- **Internal Module Structure**: Each feature folder MUST encapsulate its own boundaries:
  - `api.ts`: Axios client calls and payload mapping.
  - `hooks/`: Feature-specific TanStack Query hooks and custom state hooks.
  - `components/`: UI components strictly bound to this domain.
  - `pages/`: Route-level components (lazy-loaded).
  - `types.ts`: Feature-specific UI state types (never duplicate `@celebs/shared-types`).
- **Unidirectional Dependency Flow**: Features MUST NOT import directly from other features. Cross-feature communication MUST occur via route-level composition or shared global state packages (`@celebs/shared-ui`, `@celebs/shared-types`).
- **Barrel File Eradication**: Do not use `index.ts` barrel files for exporting components or hooks within a feature. Import directly from the exact file path.

### 2. Server-State Orchestration (TanStack Query)

- The application relies on TanStack Query for all asynchronous server state. Manual global state management (Redux, Zustand, Context) for API data is strictly forbidden.
- **Query Key Factory Pattern**: Query keys MUST NOT be hardcoded strings. They MUST be generated via centralized factory objects (e.g., `PRODUCT_QUERY_KEYS.list(filters)`) to ensure type-safe cache invalidation.
- **Cache Invalidation Precision**: Mutations MUST invalidate specific query keys, not broad global refetches. Use `queryClient.invalidateQueries({ queryKey: [...] })` surgically.
- **Optimistic UI & Rollbacks**: For high-frequency interactions, mutations MUST implement `onMutate` for optimistic updates and `onError` for deterministic rollbacks using `queryClient.setQueryData`.
- **Pagination & Infinite Queries**: List views with large datasets MUST use `useInfiniteQuery` or cursor-based pagination hooks. Offset-based pagination that refetches the entire list on page change is prohibited.

### 3. Advanced Form Engine & Dynamic Schema Binding

- Complex dynamic form handling (e.g., Category Attributes, Product SKU Matrices) MUST utilize React Hook Form (RHF) and Zod with extreme precision to prevent render thrashing.
- **Context Isolation**: Avoid wrapping massive DOM trees in `<FormProvider>`. Use `useFormContext` only within isolated sub-components. For deeply nested dynamic fields, pass `control` explicitly as a prop to prevent global form re-renders on every keystroke.
- **Path Type Safety**: When using `form.setValue` or `form.watch` on dynamic paths, utilize React Hook Form's `Path<TFormValues>` or `FieldPath<TFormValues>` generics:
  - ❌ Anti-Pattern: `form.setValue(`variants.${color}.stock` as any, 10)`
  - ✅ Mandate: `form.setValue(path as Path<ProductFormValues>, 10)`
- **Zod as Single Source of Truth**: Form validation schemas MUST originate from `@celebs/shared-types`. Use `zodResolver` to bridge Zod schemas to RHF.
- **Dynamic Field Registry**: UI registries (e.g., `ui-registry.tsx`) mapping backend schema types to React components MUST be statically typed using discriminated unions.

### 4. Render Determinism, Memoization & Closure Stability

- **Stable Closures in Effects**: Functions invoked inside `useEffect` or passed to TanStack Query `queryFn`/`mutationFn` MUST be wrapped in `useCallback` or defined outside component scope.
- **Referential Equality for Props**: Objects, arrays, and inline functions passed as props to memoized children (`React.memo`), TanStack Table column definitions, or Radix UI primitives MUST be memoized via `useMemo` or `useCallback`.
- **Derived State Computation**: Heavy computations MUST be wrapped in `useMemo`. Never compute derived state during the render phase outside of memoization boundaries.

### 5. Memory Management & Resource Teardown

- **Object URL Revocation**: Usage of `URL.createObjectURL()` for image previews MUST be paired with a `useEffect` cleanup callback calling `URL.revokeObjectURL()`.
- **AbortController Integration**: All Axios requests initiated inside `useEffect` or component lifecycles MUST be tied to an `AbortController` with `.abort()` in cleanup.
- **Event Listener Teardown**: Global event listeners MUST be explicitly removed in the `useEffect` teardown phase.

### 6. Type Contract Enforcement & Anti-Pattern Eradication

- **The `any` Eradication Mandate**: Use of `any`, `@ts-ignore`, and `@ts-nocheck` is strictly prohibited.
- **No Hacky Double-Casts**: Escape hatches like `as unknown as Record<string, any>` are forbidden. Use structured optional types or index signatures with runtime type guards.
- **Discriminated Unions for State**: UI states MUST be modeled using discriminated unions (e.g. `{ status: 'loading' } | { status: 'error', message: string } | { status: 'success', data: T }`).

### 7. Routing, Code-Splitting & Security Boundaries

- **Lazy Loading Mandate**: ALL route-level page components MUST be imported using `React.lazy()` and wrapped in `<Suspense>`.
- **Guard Composition**: `AuthGuard` and `RoleGuard` wrappers MUST handle loading states gracefully without layout shifts.
- **Route Handle Metadata**: Utilize React Router's `handle` property for breadcrumbs, titles, and permissions declaratively.

### 8. UI Composition, Accessibility & Design System Invariants

- **Radix Primitive Supremacy**: Do not build custom dropdowns/modals using raw `div`s and manual z-index. Use headless Radix primitives from `@celebs/shared-ui`.
- **Tailwind Class Determinism**: Use `cn()` utility (`clsx` + `tailwind-merge`) for conditional class names.
- **Component Purity**: `.tsx` files MUST ONLY export React components. Data mappers, constants, and helpers MUST be extracted into adjacent `.ts` files to preserve HMR.

### 9. Testing & Mocking Isolation

- **MSW Mandate**: All API interactions in integration tests MUST be intercepted using MSW without hitting live backend services.
- **Component Testing over E2E**: Use Vitest + React Testing Library for component unit/integration testing.
- **Deterministic Mocks**: Mock data MUST be generated using `@faker-js/faker` with seeded values.

### 🚀 Execution Protocol for Web-Admin Tasks

When modifying `apps/web-admin`:

1. **Trace the Domain**: Identify `src/features/{domain}`. Do not bleed logic across domains.
2. **Verify the Contract**: Check `@celebs/shared-types` before creating new interfaces.
3. **Protect the Render**: Ensure memoization before passing objects/functions down the tree.
4. **Clean the Memory**: Verify teardown for event listeners, timers, or blob URLs before finalizing.
