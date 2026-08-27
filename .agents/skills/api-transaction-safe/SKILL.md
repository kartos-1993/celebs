---
name: api-transaction-safe
description: 'Runbook for creating concurrency-safe Express endpoints with Prisma interactive transactions, port 6543 connection pooling, and Redis idempotency.'
---

# API Concurrency & Transaction Runbook (`apps/api`)

Use this skill whenever creating or updating state-modifying backend endpoints in `apps/api`.

## The 4-Layer Architecture Checklist

1. **Route (`src/modules/{domain}/{domain}.routes.ts`)**:

   - Apply authentication and role guards.
   - Attach Zod validation middleware.

2. **Controller (`src/modules/{domain}/{domain}.controller.ts`)**:

   - Capture HTTP request parameters and body.
   - Zero database calls allowed. Delegate to Domain Service.

3. **Service (`src/modules/{domain}/{domain}.service.ts`)**:

   - Idempotency check: Acquire Upstash Redis lock for duplicate prevention.
   - Transaction boundary: Wrap multi-entity updates in `prisma.$transaction(async (tx) => { ... })`.
   - Release lock upon completion or failure.

4. **Repository (`src/modules/{domain}/{domain}.repository.ts`)**:
   - Encapsulate Prisma queries using singletons pooled via port 6543.
   - Return strongly-typed domain entities.
