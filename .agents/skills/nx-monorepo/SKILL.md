---
name: nx-monorepo-manager
description: Rules and workflows for navigating, modifying, and executing tasks within an Nx monorepo workspace.
globs: [ "apps/**/*", "libs/**/*", "nx.json", "package.json", "tsconfig.base.json" ]
---

# Nx Monorepo Management Skill

## Context & Activation Triggers
Use this skill whenever you are asked to generate code, create projects, manage dependencies, or troubleshoot builds in this workspace. 

## 1. Workspace Layout
The repository is split into distinct logical boundaries:
- `apps/`: Contains deployment-ready applications (e.g., auth, product, web-admin).
- `libs/`: Contains reusable code divided into standard types (create this folder when adding libraries):
  - `feature/`: Smart components, routing, and business page layouts.
  - `ui/`: Dumb/presentational components, strictly reusable and presentational.
  - `data-access/`: Services, state management, and API client integrations.
  - `util/`: Helper functions, custom types, and foundational logic utilities.

## 2. Code Generation & Architecture
- **Never manually scaffold directories inside `libs/` or `apps/`.**
- Always discover and use the appropriate official Nx or plugin generators.
- Execute generators dry-run first to check output structure: `pnpm nx g <generator-name> --dry-run`
- Ensure every new library includes accurate `tags` in its `project.json` file to enforce module boundaries (e.g., `tags: ["scope:shared", "type:ui"]`).

## 3. Strict Module Boundaries
- **App to App:** Apps must never import from other apps.
- **Lib to App:** Libraries must never import from apps.
- **Lib to Lib Dependency Rules:**
  - `feature` can depend on `ui`, `data-access`, and `util`.
  - `ui` can only depend on `ui` and `util`.
  - `data-access` can depend on `data-access` and `util`.
  - `util` can only depend on other `util` libraries.
- Deep imports bypass the public API (`index.ts`). **Always use the paths mapped in `tsconfig.base.json`**.

## 4. Task Orchestration & Caching
- Do not run general scripts via `npm` or `pnpm` if an Nx target exists.
- Leverage computation caching. To execute tasks only on modified code, prioritize the `affected` workflow:
  - Build check: `pnpm nx affected -t build`
  - Unit testing: `pnpm nx affected -t test`
  - Linting check: `pnpm nx affected -t lint`
- To visually inspect cross-package dependencies or troubleshoot unexpected isolation breaks, use: `pnpm nx graph`

## 5. Verification Steps
After any generation or refactoring task:
1. Confirm the project graph updates correctly with `pnpm nx graph --file=output.json` or inspect the modified `project.json` files.
2. Run localized or affected tests/linting targeting the blast radius of your modifications to ensure zero regression.
