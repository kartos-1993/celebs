# API Architectural Mandates (`apps/api`)

## 1. Canonical Monorepo Folder Topography Rules

- `src/config/`: Initialization entrypoints for database pool wrappers and singletons.
- `src/modules/`: Domain-driven mini-apps split into controllers, services, repositories.

## 2. Component Layers & Storage Controls

- Single Database: Store all data models 100% inside a single PostgreSQL database managed via Prisma.
- Clean Architecture Boundaries:
  1. Routes: Maps structural URL endpoint properties and applies guards.
  2. Controllers: Captures request models, validates DTOs, handles express headers. Zero inline DB execution blocks.
  3. Services: Executes core business logic, orchestrates domain flows, and handles transaction boundaries.
  4. Repositories: Direct access to underlying data layers through Prisma ORM singletons.

## 3. Operational Protocols & Scale-Out Hardening Rules

- Connection Footprints: Connections must be pooled via singletons using port 6543 for Postgres transaction routing (PgBouncer/Supabase).
- Media Uploads: Avoid Multer memory streams. Use Cloudflare R2 presigned PUT URL generation pipelines directly.
- Concurrency & Caching: High-concurrency caching loops and distributed idempotency locks must rely on stateless HTTP REST operations backed by Upstash Redis.
- Concurrency Safety: State-modifying operations across multiple tables MUST use interactive `prisma.$transaction`.

## 4. Test Isolation & Auth Fixtures

- Local Database Only: Integration/unit tests MUST run strictly against local PostgreSQL (`postgresql://postgres:celebs@localhost:5432/celebs_test`).
- Password Hashing for Auth Fixtures: NEVER insert plain-text passwords into test database records. Always hash using `await hashValue(...)`.
- Stubs for Cloud Storage: Mock S3/R2 presigned URL generation; do not require live cloud storage during automated tests.

## 5. Strict Existence Contracts & Repository Non-Nullability

- Zero Lax Parameter Typing: Never add `| null | undefined` to downstream services, utilities, or mailer signatures to patch compile errors. Functions must enforce concrete domain contracts.
- Repository Mutation Returns: State-modifying repository methods (`apply...`, `update...`, `create...`) MUST return non-null domain entities.
- Transactional Reads of Verified Entities: When fetching an entity that was already confirmed to exist within the transaction or caller boundary, use `tx.<model>.findUniqueOrThrow()` instead of `tx.<model>.findUnique()`. Never let Prisma's `findUnique()` leak unnecessary `null` unions into domain services.
- User ID Lookups: Arbitrary lookups by external user ID may return `T | null`; the domain Service MUST perform an explicit 404 existence guard before delegating to downstream operations.

## 6. Universal API Response Envelope Mandate

- Mandatory Envelope Helpers: ALL controller methods MUST return responses using `sendSuccess<T>`, `sendCreated<T>`, or `sendPaginated<T>` from `@/common/utils/response.util`.
- Forbidden: Never return bare `res.json({ message, data })` or manually construct inline `{ success, message, data }` objects. The canonical helpers automatically inject `X-Request-Id` and ISO timestamps required for distributed tracing.
- Strict Success Guard: Every successful response MUST contain `success: true`. Omitting `success: true` breaks client interceptors.
- Standard Pagination Envelope: Use `sendPaginated(res, items, { page, limit, total })` returning `{ success: true, message, data: items, meta: { page, limit, total, totalPages }, requestId, timestamp }`. Domain controllers must not invent arbitrary pagination wrappers.

## 7. Database Concurrency, Deadlock Elimination & Pool Safety (Port 6543)

- Deterministic Row-Locking Order: Whenever acquiring row-level locks or updating multiple rows in `prisma.$transaction` (e.g. stock reservation during checkout or cancellation), the collection MUST be sorted by unique identifier (`inventoryId`) before transaction entry:
  `const sorted = [...items].sort((a, b) => a.inventoryId.localeCompare(b.inventoryId));`
  This mathematically eliminates PostgreSQL `40P01` deadlocks under high-concurrency checkouts.
- Zero Transaction Loops: In Supabase PgBouncer **Transaction Mode** (port 6543), physical server connections are held exclusively for the entire duration of an interactive transaction. Sequential queries inside loops (e.g. `for (...) { await tx.create(...) }`) multiply connection hold time and cause pool exhaustion. Always use `tx.createMany`, batch updates, or single CTEs.
- Transaction Boundaries: Interactive transactions MUST specify bounded timeouts: `{ maxWait: 5000, timeout: 10000 }`.

## 8. Mandatory Clean Architecture Repositories

- Strict Layering: Routes $\to$ Controller $\to$ Service $\to$ Repository.
- Zero Prisma in Services: Domain services (`ProductService`, `InventoryService`, `StoreLifecycleService`, `WishlistService`) MUST NOT import `prisma from '@/config/db.prisma'` or execute raw SQL. All database reads and writes must be encapsulated in dedicated repository classes (`ProductRepository`, `InventoryRepository`, `VendorRepository`, `WishlistRepository`).
- Zero Dangling Imports: Never leave unused `import prisma from '@/config/db.prisma'` statements in service or utility files.

## 9. BullMQ & Redis Concurrency Standards

- Shared Connection Factory: Never pass raw connection objects `{ host, port, password }` directly to multiple Queue and Worker instances. Use a shared client connection or factory with `maxRetriesPerRequest: null` to avoid TCP connection exhaustion on pooled Redis (e.g. Upstash).
- Complete Graceful Shutdown: The HTTP server process (`main.ts`) MUST close all BullMQ dispatch queues (`mailQueue`, `assetQueue`) during `SIGTERM`/`SIGINT` teardown alongside Prisma and HTTP server pools.

## 10. REST API Route Conventions

- Plural Nouns Only: Mount resource routes with plural nouns (`/products`, `/vendors`, `/categories`, `/quick-filters`).
- Standard Verbs Only: Use HTTP verbs for state mutations:
  - Archive / Delist: `DELETE /:id` (never `POST /:id/archive`).
  - Status / Toggle: `PATCH /:id` (never `POST /:id/toggle-activation`).
  - Scoped Queries: `GET /orders?scope=mine` (never `GET /my-orders`).
- Pre-Production YAGNI: In active development, do not maintain legacy backward-compatibility shims or redundant aliases. Build cleanly to the standard.
