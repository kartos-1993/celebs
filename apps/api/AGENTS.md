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
