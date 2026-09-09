---
name: ts-enterprise-strict-contracts
description: 'Rules, patterns, and runbooks for eliminating TypeScript anti-patterns (lax parameter typing, escape hatches, leaky nulls, double-casting) across large-scale monorepos.'
---

# Enterprise TypeScript Strict Contracts & Anti-Pattern Runbook

Use this skill whenever authoring, reviewing, or refactoring TypeScript code across `apps/api`, `apps/web-admin`, `apps/mobile`, and `packages/*`.

---

## 1. The Core Philosophy: Models of Truth vs. Compiler Silencers

In an enterprise monorepo, the role of TypeScript is to **model system invariants** and **fail fast at runtime boundaries**.
Code must NEVER be written solely to "make TypeScript stop complaining." Silencing the compiler with escape hatches or loose types turns compile-time safety into production runtime crashes.

---

## 2. The 5 Banned Anti-Patterns & Canonical Replacements

### Anti-Pattern 1: Lax Parameter Typing ("Garbage In, Hope for Best")

- **Forbidden**: Weakening function parameters with `| null | undefined` because the caller has an unverified reference.
  ```ts
  // ❌ BAD: Function lies about its contract and silently fails
  function enqueueOrderEmail(order: OrderPayload | null | undefined) {
    if (!order) return;
    ...
  }
  ```
- **Mandated**: Leaf functions, services, and utilities must demand concrete, valid domain entities. The caller (or retrieval boundary) must guarantee existence.
  ```ts
  // ✅ GOOD: Strict contract, fails at the boundary if missing
  function enqueueOrderEmail(order: OrderPayload): Promise<void> { ... }
  ```

---

### Anti-Pattern 2: Leaky Prisma `findUnique` in Transactions

- **Forbidden**: Calling `tx.<model>.findUnique()` when fetching a record already known to exist or inside a mutating transaction. Prisma returns `T | null`, which infects the entire service layer with nullable unions.
  ```ts
  // ❌ BAD: Returns Order | null, forcing callers to guess if it exists
  const order = await tx.order.findUnique({ where: { id } });
  return order;
  ```
- **Mandated**: Use `tx.<model>.findUniqueOrThrow()`. If a verified entity is missing inside a transaction, throwing is the correct transactional behavior.
  ```ts
  // ✅ GOOD: Returns strictly non-null Order
  const order = await tx.order.findUniqueOrThrow({ where: { id } });
  return order;
  ```

---

### Anti-Pattern 3: Double-Casting Escape Hatches (`as unknown as T`)

- **Forbidden**: Bypassing type checking for incoming JSON, third-party webhooks (eSewa, Khalti, 3PL), or database JSON columns.
  ```ts
  // ❌ BAD: Zero runtime verification; crash waiting to happen
  const payload = rawData as unknown as PaymentWebhookPayload;
  ```
- **Mandated**: Parse at the boundary with Zod. Inferred types flow from runtime validation.
  ```ts
  // ✅ GOOD: Validated at runtime; compiler knows the exact shape
  const payload = paymentWebhookSchema.parse(rawData);
  ```

---

### Anti-Pattern 4: Non-Null Assertion Overuse (`!.`) in Production Code

- **Forbidden**: Forcing the compiler to trust non-nullability with `!` in application code.
  ```ts
  // ❌ BAD: If cart is empty, throws unhandled TypeError at runtime
  const itemId = cart.items[0]!.id;
  ```
- **Mandated**: Use explicit existence guards or domain invariant assertions.
  ```ts
  // ✅ GOOD: Clear domain error if assumption is violated
  const firstItem = cart.items[0];
  if (!firstItem) {
    throw new AppError('Cart has no items', HTTPSTATUS.BAD_REQUEST, ErrorCode.INVALID_REQUEST);
  }
  ```

---

### Anti-Pattern 5: "Optional Everything" Domain Interfaces

- **Forbidden**: Marking every property `?` to accommodate partial forms or incomplete endpoints.
- **Mandated**: Use Discriminated Unions and dedicated DTO schemas:
  - `DraftOrder` (address optional, items pending) vs. `ConfirmedOrder` (address required, items non-empty, total non-null).

---

## 3. Boundary Matrix: Where Null is Allowed vs. Forbidden

| Layer                    | Input Parameter         | Return Type           | Rule                                                              |
| :----------------------- | :---------------------- | :-------------------- | :---------------------------------------------------------------- |
| **Repository Queries**   | Primitive ID / Filter   | `Promise<T \| null>`  | Expected: An arbitrary user-supplied ID may not exist.            |
| **Repository Mutations** | Validated DTO / ID      | `Promise<T>` (Strict) | Forbidden to return `null`. Use `findUniqueOrThrow` or `update`.  |
| **Domain Services**      | Validated DTO / User ID | `Promise<T>` (Strict) | Must guard repository query with `404 AppError` before returning. |
| **Utilities & Mailers**  | Concrete Domain Model   | `Promise<void>` / `T` | Forbidden to accept `\| null \| undefined`.                       |

---

## 4. Pre-Flight Verification Checklist

Before submitting any TypeScript code changes:

1. [ ] Did you add `| null | undefined` to any parameter? If so, remove it and fix the caller.
2. [ ] Did you use `as unknown as`? If so, replace with Zod schema parsing.
3. [ ] Are repository mutations returning non-null entities?
4. [ ] Did you run `npm run typecheck` to confirm zero errors without type escapes?
