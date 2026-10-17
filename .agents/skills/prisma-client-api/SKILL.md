---
name: prisma-client-api
description: 'Modern Prisma Client API reference for high-performance querying, strict typing, selective field projections, batching, and transaction patterns.'
---

# Prisma Client API Runbook & Standards

Use this skill whenever writing, optimizing, or reviewing Prisma database operations in `apps/api`.

---

## 1. Clean Architecture & Repository Encapsulation

Under our codebase mandate ([`.agents/AGENTS.md`](file:///c:/celebs/celebs/.agents/AGENTS.md) Gate 9):

- **Never call `prisma` directly inside controllers or domain services.**
- All queries must reside in dedicated Repository classes (`src/modules/{domain}/{domain}.repository.ts`).
- Controllers and services receive repositories via dependency injection or repository singletons.

---

## 2. Projection & Selection Best Practices (Preventing Over-Fetching)

Avoid unconditional `include: { ... }` that pulls wide relational trees into memory:

### Bad (Over-fetching & Deep Joins)

```typescript
// Anti-pattern: Joins entire tables and relations on simple auth check
const session = await prisma.session.findUnique({
  where: { id: sessionId },
  include: {
    user: {
      include: {
        vendorProfile: { include: { warehouses: true } },
      },
    },
  },
});
```

### Good (Targeted Field Selection)

```typescript
// Fast: Only projects fields strictly needed by caller
const session = await prisma.session.findUnique({
  where: { id: sessionId },
  select: {
    id: true,
    userId: true,
    expiredAt: true,
    user: {
      select: {
        id: true,
        email: true,
        role: true,
        permissions: true,
        vendorId: true,
      },
    },
  },
});
```

---

## 3. Strict Null Contracts & Existence Guarantees (Gate 6)

Never propagate loose `| null | undefined` return types from repository operations when records are guaranteed or expected to exist.

### Leaf Reads and Transaction Mutates

Use `findUniqueOrThrow()` or `findFirstOrThrow()` inside transactional updates so return types are strictly non-nullable:

```typescript
// Inside a transaction or validated update:
const inventory = await tx.productInventory.findUniqueOrThrow({
  where: { id: inventoryId },
});
// inventory is strictly non-nullable: ProductInventory (not ProductInventory | null)
```

---

## 4. Concurrency & Deadlock-Free Transactions (Gate 8)

When updating multiple records inside an interactive `$transaction`:

1. **Sort unique keys deterministically** before acquiring row locks (eliminates PostgreSQL 40P01 deadlocks).
2. **Zero sequential loops inside `$transaction`**: Use `createMany` or single batch updates to minimize port 6543 pool hold times.
3. Set explicit transaction timeouts:

```typescript
return prisma.$transaction(
  async (tx) => {
    // 1. Sort IDs deterministically to eliminate deadlock order inversions
    const sortedIds = [...itemIds].sort();

    // 2. Batch lock / update
    await tx.productInventory.updateMany({
      where: { id: { in: sortedIds } },
      data: {
        /* ... */
      },
    });
  },
  {
    maxWait: 5000, // Max time to acquire connection from pool
    timeout: 10000, // Max transaction execution duration
  },
);
```

---

## 5. Standard Error Handling

Catch and map canonical Prisma error codes into domain errors:

| Prisma Code | Meaning                                                | HTTP Mapping               |
| :---------- | :----------------------------------------------------- | :------------------------- |
| `P2002`     | Unique constraint violation (e.g. duplicate email/SKU) | `409 Conflict`             |
| `P2025`     | Record not found (`findUniqueOrThrow` / `delete`)      | `404 Not Found`            |
| `P2003`     | Foreign key constraint violation                       | `400 Bad Request`          |
| `P2034`     | Transaction failed due to write conflict / deadlock    | `409 Conflict` (Retryable) |
