# Universal Code Readability & Anti-Patching Mandates

## 1. The Anti-Patch Doctrine (Root Cause over Band-Aids)

Patch code (quick band-aids, monkey patches, nested ternary ladders, ad-hoc `if` blocks appended to bloated functions) leads to code rot in a large monorepo. Every code change must be cohesive, readable, and architecturally sound.

1. **The Boy Scout Rule (Leave Code Cleaner)**:
   - When touching an existing function or component to fix a bug or add a feature, you must not simply append patch code on top of a messy structure.
   - If the surrounding code has high cognitive load, refactor the enclosing block first into clear, cohesive functions before applying the change.
2. **Root-Cause Resolution over Symptom Shims**:
   - Never suppress compiler or runtime errors with defensive client-side cascades (`data?.data?.data ?? []`) or loose parameter unions (`| null | undefined`). Fix contracts at their root source.
3. **Refactor-First Mandate for Legacy Debt**:
   - If a file currently violates line budgets (>150 lines for `.tsx`) or has high complexity, **DO NOT add new code directly to it**. First decompose the file into FSD slices, sub-components, or pure helpers, verify tests stay green, and then implement the change.
4. **Single Level of Abstraction Principle (SLAP)**:
   - A function must operate at exactly one level of abstraction.
   - High-level orchestrators must read like a table of contents, delegating low-level details (parsing, math, string formatting) to dedicated, named pure helpers.

---

## 2. Logic Readability & Cognitive Simplicity

1. **Self-Documenting Naming & Boolean Extraction**:

   - Never inline complex compound conditions inside `if` statements or JSX conditionals.
   - Extract conditions into descriptively named variables:

     ```typescript
     // ❌ Patch Code:
     if (user.role === 'VENDOR' && vendor.status === 'ACTIVE' && (!product.isArchived || hasAdminBypass)) { ... }

     // ✅ Readable & Self-Documenting:
     const isEligibleVendor = user.role === 'VENDOR' && vendor.status === 'ACTIVE';
     const canModifyProduct = !product.isArchived || hasAdminBypass;
     if (isEligibleVendor && canModifyProduct) { ... }
     ```

2. **Guard Clauses & Early Returns (Zero Pyramid of Doom)**:
   - Deeply nested `if/else` hierarchies are prohibited.
   - Validate preconditions, permissions, and edge cases at the very beginning of the function and return early. The primary happy path must remain flat at indentation level 0.
3. **Cognitive Complexity Ceiling**:
   - Keep Cognitive Complexity under **12** and Cyclomatic Complexity under **8** per function or component. Exceeding this limit requires immediate decomposition.
4. **Intent-Based Comments (Explain "WHY", Never "WHAT")**:
   - Do not write comments stating what code does (`// set loading to false`). The code itself must be self-explanatory.
   - Comments are reserved exclusively for explaining **non-obvious domain constraints, regulatory rules, or architectural edge cases** ("WHY").

---

## 3. Web & Frontend Readability (`apps/web-admin`)

1. **Declarative, Scannable JSX**:

   - JSX must represent the visual structure of the UI without drowning in business logic.
   - **Strict Ban on Nested Ternaries in JSX**:

     ```tsx
     // ❌ Forbidden: Nested ternary soup in JSX
     <div>
       {isLoading ? (
         <Spinner />
       ) : isError ? (
         <ErrorView />
       ) : items.length === 0 ? (
         <Empty />
       ) : (
         <ItemList items={items} />
       )}
     </div>;

     // ✅ Mandated: Guard returns or dedicated sub-render components
     if (isLoading) return <Spinner />;
     if (isError) return <ErrorView error={error} onRetry={refetch} />;
     if (items.length === 0) return <Empty />;
     return <ItemList items={items} />;
     ```

2. **Strict Component Purity & FSD Slices**:
   - Route pages (`pages/`): Thin orchestrators (<60 lines) that read route params and compose feature components.
   - Feature components (`components/`): Presentational units bounded by 150 lines.
   - Data mappers, table column definitions, and formatters must reside in adjacent `.ts` files to preserve fast HMR and component focus.
3. **Tailwind & CSS Design Token Discipline (Zero Magic Numbers)**:
   - Arbitrary pixel values (e.g. `p-[13px]`, `w-[347px]`, `text-[11px]`) are forbidden.
   - Use design system tokens: standard spacing (`space-y-4`, `p-4`, `gap-2`), typography scales (`text-sm`, `text-lg font-semibold`), and semantic color tokens (`bg-card`, `text-muted-foreground`).
   - Use `cn()` (`clsx` + `tailwind-merge`) for conditional class joining; never use template literal string concatenations.

---

## 4. Backend Readability & Clean Architecture (`apps/api`)

1. **Strict Layer Boundary Isolation**:
   - `Routes` $\to$ `Controller` $\to$ `Service` $\to$ `Repository`.
   - Controllers (<40 lines): Parse and validate DTOs, invoke the service, and return canonical envelopes (`sendSuccess`, `sendCreated`, `sendPaginated`). Zero business logic, zero direct database access.
   - Services: Orchestrate business domain workflows. Never import `prisma` directly; all database operations must route through dedicated Repositories.
2. **Typed Domain Errors over Generic Try/Catch**:
   - Never catch errors just to return `{ error: 'Failed' }`.
   - Throw explicit domain errors (`NotFoundError`, `BadRequestError`, `ConflictError`, `ForbiddenError`). Centralized error middleware formats RFC-7807 responses with request tracking IDs.
3. **Pure Domain Decision Functions vs Side Effects**:
   - Separate pure domain logic (pricing calculations, status validations, order totals) into pure functions with zero database or network dependencies.
   - Pure domain functions must be covered by fast, isolated unit tests.

---

## 5. Mobile & StyleSheet Readability (`apps/mobile`)

1. **Zero Inline Style Objects in Render Loops**:
   - Inline style objects (`style={{ flex: 1, padding: 12 }}`) allocate new memory on every render cycle and pollute JSX readability.
   - All styles must be declared via `StyleSheet.create` **outside the component** or in an adjacent `[component].styles.ts` file.
2. **Semantic Style Naming**:
   - Use clear semantic names in logical layout order: `container`, `contentWrapper`, `header`, `title`, `badgeRow`, `actionButton`, `buttonText`.
3. **Dynamic Styling via Clean Style Arrays**:
   - Compose styles cleanly using array syntax:
     ```tsx
     <TouchableOpacity
       style={[styles.tabButton, isActive && styles.tabButtonActive]}
       onPress={onPress}
     >
       <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{label}</Text>
     </TouchableOpacity>
     ```
4. **Theme Token Binding**:
   - Never hardcode arbitrary hex codes (`#1E293B`) or random margins. Bind all styles to central theme tokens (`colors`, `spacing`, `typography`, `radii`).
5. **List & Gesture Handler Isolation**:
   - `renderItem` functions in `FlatList` or `FlashList` must be extracted to dedicated memoized components (`ProductListItem`), not written as inline 80-line JSX callbacks.

---

## 6. Test Readability Standards

1. **Arrange-Act-Assert (AAA) Structure**:
   - Tests must visually separate setup (`Arrange`), execution (`Act`), and verification (`Assert`) with clean blank lines.
2. **Plain English Behavior Descriptions**:
   - Zero ticket codes or meta-labels in test names (`test("P0-H3 fix", ...)`).
   - Test names must clearly describe the expected behavior:
     ```typescript
     it('rejects order checkout when variant inventory is insufficient', async () => { ... });
     ```
3. **Deterministic Seed Data & Stubs**:
   - Use explicit, seeded test fixtures. Avoid random data that causes intermittent flaky test failures.
