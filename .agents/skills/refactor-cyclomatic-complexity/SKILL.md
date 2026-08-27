---
name: refactor-cyclomatic-complexity
description: 'Algorithm to systematically decompose monolithic, high cyclomatic complexity React components down to CC < 8 and under 150 lines.'
---

# Cyclomatic Complexity Reduction Algorithm

Use this skill whenever refactoring high CC or monolithic components (e.g. >150 lines, CC > 10).

## The 4-Step Decomposition Algorithm

### Step 1: Extract Pure Fallback Mappers (`utils/`)

- Identify all `|| ''`, `?? fallback`, and ternary branches in default values or data preparation.
- Move them into pure TypeScript functions inside `src/features/{domain}/utils/`.
- Target: Each function must have CC ≤ 2 and be 100% testable without mounting React.
- Write unit tests in `utils/__tests__/`.

### Step 2: Extract Server State & Mutations (`hooks/`)

- Never keep `useMutation` or raw query calls inside the UI component.
- Move them to `src/features/{domain}/hooks/`.
- Wire queries and mutations to a centralized `QUERY_KEYS` factory in `api.ts`.

### Step 3: Extract Bounded Sub-Components (`components/`)

- Break multi-step wizards or complex sections into dedicated sub-components.
- Each sub-component must:
  - Be under 150 lines.
  - Mount only its own form and queries.
  - Pass callbacks (`onComplete`, `onBack`) instead of mutating parent state directly.

### Step 4: Assemble Thin Orchestrator Page (`pages/`)

- The page component should only manage route-level guards and active step rendering.
- Total page component size must be <60 lines with CC ≤ 4.
