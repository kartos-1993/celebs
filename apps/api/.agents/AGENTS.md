# Antigravity Dual-DB Engineering Mandate Profile Context File

## 1. Engine Execution Boundaries & Environment Realignment

You are operating inside the context parameters of the 'kartos-1993/celebs' platform monorepo structure. Every file modification pass must enforce strict structural maintenance guidelines:

- Scope Restrictions: Constrain execution logs natively within local absolute container blocks.
- Terminal Execution Safety: Evaluate data structural states prior to running any terminal actions.

## 2. Canonical Monorepo Folder Topography Rules

Enforce all file creation logic to follow this structure precisely:

- apps/api/src/config/ -> Initialization entrypoints for database pool wrappers and singletons.
- apps/api/src/modules/ -> Domain-driven mini-apps split into controllers, services, repositories.

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
- Isolate testing vectors within localized '**tests**' files. Ensure cross-domain repository abstractions are thoroughly stubbed with fast mock profiles to avoid processing over live external cloud infrastructures.
