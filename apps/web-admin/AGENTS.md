# Web-Admin Architectural Mandates (`apps/web-admin`)

## 1. Feature-Sliced Domain Architecture (FSD)

- Strictly adhere to Feature-Sliced Design under `src/features/{domain}/`.
- Monolithic folders (global `/components`, `/hooks`, `/services`) are strictly prohibited.
- Internal Module Structure per feature:
  - `api.ts`: Axios client calls and centralized `QUERY_KEYS` factory.
  - `hooks/`: Feature-specific TanStack Query hooks and custom state hooks.
  - `components/`: UI components strictly bound to this domain (max 150 lines per file).
  - `pages/`: Thin route-level orchestrator components (<60 lines, lazy-loaded).
  - `types.ts`: Feature-specific UI state types (never duplicate `@celebs/shared-types`).
- No Barrel Files: Do not use `index.ts` barrel files for exporting within a feature. Import directly from the exact file path.
- Unidirectional Flow: Features MUST NOT import directly from other features.

## 2. Server-State Orchestration (TanStack Query)

- Query Key Factory Pattern: Query keys MUST NOT be hardcoded strings. They MUST be generated via centralized factory objects (e.g., `VENDOR_ONBOARDING_QUERY_KEYS.status()`).
- No Raw Inline Mutations: Mutations MUST NOT be instantiated directly in presentation leaf components. Extract to `hooks/use-*-mutations.ts`.
- Cache Invalidation Precision: Mutations MUST invalidate specific query keys (`queryClient.invalidateQueries({ queryKey: [...] })`), not broad global refetches.
- Use `useInfiniteQuery` or cursor pagination for large datasets. Offset-based pagination refetching entire lists is prohibited.

## 3. Dynamic Form Engine & Context Isolation

- Complex dynamic forms MUST utilize React Hook Form (RHF) and Zod.
- Form validation schemas MUST originate from `@celebs/shared-types`. Use `zodResolver`.
- Context Isolation: Avoid wrapping massive DOM trees in `<FormProvider>`. Pass `control` explicitly to sub-components to prevent global form re-renders on keystroke.
- Path Type Safety: Use `Path<TFormValues>` or `FieldPath<TFormValues>` generics when calling `form.setValue` or `form.watch`.

## 4. Render Determinism, Memoization & Component Purity

- File Length Budget: No `.tsx` component file may exceed 150 lines. Decompose into sub-components.
- Complexity Budget: Cyclomatic Complexity per component/function must not exceed 8.
- Component Purity: `.tsx` files MUST ONLY export React components. Data mappers, constants, and helper functions must be extracted into adjacent `.ts` files to preserve HMR.
- Hook Stability: Functions passed down as props or used in dependency arrays MUST be stabilized using `useCallback` or `useMemo`.
- Object URL Teardown: `URL.createObjectURL()` MUST be paired with a `useEffect` cleanup calling `URL.revokeObjectURL()`.
- AbortController: Axios requests in `useEffect` MUST be tied to an `AbortController` with `.abort()` in cleanup.

## 5. UI Composition & Accessibility

- Radix Primitive Supremacy: Do not build custom dropdowns/modals using raw `div`s. Use headless Radix primitives from `@celebs/shared-ui`.
- Tailwind Class Determinism: Use `cn()` utility (`clsx` + `tailwind-merge`) for conditional class names.
- Discriminated Unions: Model UI states with discriminated unions (`{ status: 'loading' } | { status: 'error', message: string } | { status: 'success', data: T }`).

## 6. Testing & Mocking Isolation

- MSW Mandate: Intercept API interactions in integration tests using MSW.
- Component Testing over E2E: Use Vitest + React Testing Library for unit/integration testing.
- Deterministic Mocks: Generate test fixtures with seeded values.
