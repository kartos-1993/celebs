# Antigravity Dual-DB Engineering Mandate Profile Context File

## 1. Engine Execution Boundaries & Environment Realignment
You are operating inside the context parameters of the 'kartos-1993/celebs' platform monorepo structure. Every file modification pass must enforce strict structural maintenance guidelines:
- Scope Restrictions: Constrain execution logs natively within local absolute container blocks. 
- Terminal Execution Safety: Evaluate data structural states prior to running any terminal actions.

## 2. Canonical Monorepo Folder Topography Rules
Enforce all file creation logic to follow this structure precisely:
- apps/api/src/config/      -> Initialization entrypoints for database pool wrappers and singletons.
- apps/api/src/modules/     -> Domain-driven mini-apps split into controllers, services, repositories.

## 3. Storage Separation & Component Architecture Controls
- Store dynamic schemas, option variants, product properties, and catalog indices inside MongoDB using Mongoose maps.
- Store users, transaction lineages, warehouse ledgers, balances, and security sessions inside PostgreSQL managed via Prisma.
- Component Layers must isolate logical boundaries cleanly:
  1. Routes: Maps structural URL endpoint properties and applies guards.
  2. Controllers: Captures request models, handles express headers. No inline DB execution blocks.
  3. Services: Executes core business logic calculations and orchestrates cross-database data mappings.
  4. Repositories: Direct access to underlying data layers through ORM singletons.

## 4. Operational Protocols & Scale-Out Hardening Rules
- Connection footprints must be pooled via singletons using port 6543 for Postgres transaction routing.
- Media upload components must completely avoid Multer memory streams. Use Cloudflare R2 presigned PUT url generation pipelines directly to decouple edge binary ingestion tracks.
- High-concurrency caching loops must rely on stateless HTTP REST operations backed by Upstash Redis.
- Isolate testing vectors within localized '__tests__' files. Ensure cross-domain repository abstractions are thoroughly stubbed with fast mock profiles to avoid processing over live external cloud infrastructures.

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
