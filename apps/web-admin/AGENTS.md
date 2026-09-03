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

## 7. Typography, Whitespace & Focus Standards

- Type Scale (only these pairings; do not invent sizes or weights):
  - Page title (h1): `text-2xl font-semibold tracking-tight text-foreground`
  - Section title (h2, dialog/sheet titles): `text-lg font-semibold tracking-tight`
  - Subsection (h3): `text-base font-semibold`
  - Item title (h4): `text-sm font-semibold`
  - Eyebrow: `text-xs font-medium uppercase tracking-wide text-muted-foreground`
  - Body: `text-sm` (`font-medium` to emphasize, `font-semibold` max for strong)
  - Meta/caption: `text-xs text-muted-foreground`
  - Mono data (order #, tracking, counts): `font-mono text-xs` (+ `tabular-nums` for numerals)
- Floor: never go below `text-xs` in admin UI copy. No `text-[8/9/10/11px]` and no `text-[15px]` (use `text-sm`).
- Weights: `normal` / `medium` / `semibold` / `bold` only. No `extrabold` / `black` in admin chrome.
- Leading: `leading-none` on display/alert titles, `leading-tight` on item titles, `leading-relaxed` on long helper prose, Tailwind defaults elsewhere.
- Never override primitive type defaults (`DialogTitle`, `Button`, `Input`, `Badge`) with ad-hoc `text-*`/`font-*` classes — fix the primitive instead.
- Spacing rhythm: page `space-y-6`, sections `space-y-4`, field groups `space-y-1.5`/`space-y-2`, tight meta `space-y-1`/`space-y-0.5`; inline `gap-1`/`1.5`/`2`; cards `p-3 sm:p-4`, large containers `p-6`.
- Focus: all interactives use the shared `focusRing` token (`packages/shared-ui/src/lib/focus-ring.ts`) — `ring-2` + offset, `focus-visible` only.
- List headers: every list page uses `PageHeader` (title + description + `actions`) followed by the shared `FilterBar` (`@/components/filter-bar`) — `FilterSearch` left, `SegmentedTabs`/filters right, stacks on mobile. Never hand-roll a filter row or flip the order.
- Exemptions (documented, do not "fix"): storefront preview canvases (`widget-preview-boundary`, product preview sections) follow shop styling, not this scale; fixed-size glyph contexts (avatar initials, swatch placeholders, thumbnail overlays) may go below the floor.
