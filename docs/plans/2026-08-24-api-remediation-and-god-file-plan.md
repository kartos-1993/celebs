# Implementation Plan — API Remediation + God-File Decomposition

**Date:** 2026-08-24
**Status:** Approved, ready for implementation
**Executors:** AI agent (Gemini Flash 3.5) with human review
**Deliverables:** 4 branches (§1, §1b, §1c, §2) + report update (§4)
**Branch independence:** each branch touches one app (`api` / `mobile` /
`web-admin`) and is reviewable/deployable on its own. Recommended merge order:
1 → 3 (§1b) → 4 (§1c); Branch 2 may land anywhere after 1.

This document is a self-contained execution brief. Every step lists the exact
file, the current state (verified on branch `chore/worker-mail-and-r2-maintenance`
as of commit `ad001a5`), the precise change to make, and the acceptance test.
Do not improvise beyond what is written; if reality diverges from this plan
(a line number moved, a symbol renamed), stop and report rather than guessing.

---

## §0 — Context & rules for the implementer

### Repository facts

| Fact                         | Value                                                                              |
| ---------------------------- | ---------------------------------------------------------------------------------- |
| Monorepo                     | pnpm workspaces + Turborepo                                                        |
| API app                      | `apps/api` (Express + Prisma + PostgreSQL)                                         |
| Shared packages              | `packages/shared-types` (zod validators), `packages/shared-utils`, `packages/rbac` |
| Prisma schema                | `apps/api/src/db/schema.prisma`                                                    |
| Background worker entrypoint | `apps/api/src/worker-main.ts`                                                      |
| Queue factory                | `apps/api/src/common/services/queue.service.ts`                                    |

### Commands (run from repo root)

```bash
pnpm turbo typecheck   # must be green before every commit
pnpm turbo lint        # must be green before every commit
pnpm turbo test        # must be green at end of each workstream
```

Prisma CLI rule (from the 2026-08-24 hardening report §4): **always** pass the
env file explicitly or you will hit the wrong database:

```bash
pnpm --filter @celebs/api exec prisma migrate dev -e apps/api/.env.development --name <migration_name>
```

### Conventions to follow

- Logging: pino via `import { logger } from '@celebs/shared-utils'`. Never `console.*`.
- Errors: `AppError(message, HTTPSTATUS.X, ErrorCode.Y)` / typed exceptions from shared-utils.
- Validation: zod schemas live in `packages/shared-types/src/validators/`; routes/controllers parse input before services.
- Repositories: each module keeps Prisma access in `<module>.repository.ts`; services stay storage-aware but delegate raw queries where a repository already exists.
- Import order: enforce existing lint rules (external → @celebs/\* → relative → @/aliases).
- No comments unless a non-obvious decision needs one; match surrounding style.

### Hard rules

1. **Read every file listed in a step before editing it.** Line numbers below are accurate at plan time but may shift.
2. **Workstream B is zero-behavior-change.** No spec/test file may be edited in Branch 2. If a test breaks, the refactor is wrong — fix the refactor.
3. **Every A-item ships its acceptance test first** (write test, watch it fail, implement, watch it pass).
4. Never invent env vars not defined here without flagging them in the PR description.
5. One logical change per commit. Commit messages follow repo style (`fix(api): …`, `refactor(api): …`).

---

## §1 — Branch 1: `fix/api-order-payment-integrity`

Base: current stack tip (`chore/worker-mail-and-r2-maintenance`).
Scope: items A1–A8. Each item = problem → exact change → acceptance test.

---

### A1 — Reject KHALTI/ESEWA until real gateways exist (High)

**Problem.** `OrderService.getPaymentGateway` (`apps/api/src/modules/order/order.service.ts:17-24`)
only maps `'STRIPE'`; every other method — including `'KHALTI'` and `'ESEWA'`,
which the checkout schema advertises (`packages/shared-types/src/validators/order.validator.ts:23`) —
silently falls through to `MockPaymentAdapter`, whose `verifyPayment` succeeds
for anything except `payload.status === 'failed'`
(`apps/api/src/modules/order/adapters/mock-payment.adapter.ts:29-40`).

**Change.**

1. In `checkoutSchema` (order.validator.ts:20-26) keep the enum values (mobile clients compile against the type) but append a refine:
   ```ts
   paymentMethod: z
     .enum(['COD', 'STRIPE', 'KHALTI', 'ESEWA'])
     .refine((m) => m === 'COD' || m === 'STRIPE', {
       message: 'KHALTI and ESEWA payments are not supported yet',
     }),
   ```
2. Defense-in-depth: in `getPaymentGateway`, replace the `default:` mock return with:
   ```ts
   case 'COD':
     return null as unknown as IPaymentGateway; // never called for COD — see call site guard
   default:
     throw new AppError(
       `Payment gateway for ${method} is not configured`,
       HTTPSTATUS.BAD_REQUEST,
       ErrorCode.INVALID_REQUEST,
     );
   ```
   The call site (`order.service.ts:269-271`) is already inside `if (!isCOD)`, so COD never reaches it; keep that structure.

**Acceptance tests.**

- `POST /api/v1/orders/checkout` with `paymentMethod: 'KHALTI'` → 400, message contains "not supported".
- Same for `'ESEWA'`.

---

### A2 — Stripe adapter must not fake success when unconfigured (High)

**Problem.** `StripePaymentAdapter` silently simulates when `STRIPE_SECRET_KEY`
is missing: `createPaymentIntent` returns `stripe_sim_*` ids (adapter lines 20-28)
and `verifyPayment` returns `success: true, status: 'COMPLETED'` (lines 72-78).
In production this means orders "paid" with no money movement.

**Change.**

1. Add a private helper:
   ```ts
   private get isConfigured(): boolean { return Boolean(this.secretKey); }
   ```
2. `createPaymentIntent`: if `!isConfigured && process.env.NODE_ENV === 'production'` → throw
   `new Error('STRIPE_SECRET_KEY is required in production')`.
3. If unconfigured outside production: keep simulation **but log loudly**:
   `logger.warn({ orderId }, 'Stripe key missing — SIMULATING payment intent (non-production)')`.
4. `verifyPayment`: same production throw; non-prod path returns `status: 'PENDING'`,
   `success: false` instead of `success: true` so an unconfigured gateway can never confirm payment.
5. Import `logger` from `@celebs/shared-utils`.

**Acceptance tests.**

- Adapter with no key, `NODE_ENV='test'`: `verifyPayment` returns `success:false, status:'PENDING'`.
- Adapter with no key + forced prod env: `createPaymentIntent` rejects.

---

### A3 — Idempotency keys: user-scoped lookup + race-safe creation (High)

**Problem.** Three defects in checkout idempotency:

1. `findIdempotencyKey(key)` filters by key only (`apps/api/src/modules/order/order.repository.ts:133-137`),
   and `order.service.ts:96-100` replays whatever response is stored. Any authenticated user who obtains/guesses another user's key receives that user's full order payload (name, address, phone, items). The schema confirms `key String @unique` with a separate unused `userId` column (`schema.prisma:97-107`).
2. Check-then-create across awaits (`service :96` then `:299`) is a TOCTOU race: two concurrent submits both pass the existence check and both create orders.
3. The record is written _after_ payment-intent creation; if that call throws, the retry creates a duplicate order because no key was recorded.

**Change.**

_Repository_ (`order.repository.ts`):

```ts
async findIdempotencyKey(key: string, userId: string) {
  return prisma.idempotencyKey.findFirst({ where: { key, userId } });
}
```

_Service_ (`order.service.ts` `checkout`):

1. Pass `userId` at the lookup site (`:96`).
2. Inside the existing `runTransaction` block (starts `:213`), immediately after cart clear (`:260-262`) insert the placeholder:
   ```ts
   await tx.idempotencyKey.create({
     data: {
       key: idempotencyKey,
       userId,
       statusCode: 201,
       responseBody: JSON.stringify({ status: 'PROCESSING' }),
     },
   });
   ```
3. Delete the post-commit `createIdempotencyKey` call (`:299-304`); after payment init succeeds, update the stored body:

```ts
await orderRepository.updateIdempotencyKeyResponse(idempotencyKey, JSON.stringify(responseBody));
```

Repository method **already exists** — `updateIdempotencyKeyResponse` at
`order.repository.ts:139-143` (verified) — reuse it as-is. 4. Handle the unique-violation race at the top of `checkout`: wrap the tx in try/catch for Prisma error `P2002` on target `IdempotencyKey_key_key` → re-fetch with `(idempotencyKey, userId)`; if found → replay stored responseBody (same semantics as today's early return); if _not_ found (key belongs to another user) → throw
`new AppError('Idempotency key already in use', HTTPSTATUS.CONFLICT, ErrorCode.INVALID_REQUEST)`. 5. Replay of a `{status:'PROCESSING'}` body: return HTTP 200 with that body rather than pretending the order exists — include `"retry_with_new_key": true` hint field. Document this in the controller's success shape comment-free by simply returning it.

**Acceptance tests.**

- User B submitting user A's key → 409, and B never sees A's order data.
- Two parallel checkouts (same user, same key, e.g. `Promise.allSettled` against the service twice) → exactly one Order row created; other result replays/errors without duplicating.
- Payment-init failure injection (stub adapter throwing): retry with same key does NOT create a second order.

---

### A4 — Checkout oversell guard inside the transaction (Med-High)

**Problem.** Stock availability is checked _outside_ the transaction
(`order.service.ts:142-152`), and reservation inside the tx is a blind increment
(`:215-224`). Two concurrent checkouts can both pass validation and oversell.
An atomic helper already exists elsewhere (`InventoryService.decrementStock`,
`inventory.service.ts:33+`) but checkout doesn't use conditional logic either.

**Verified table names** (schema.prisma:156-176): model `ProductInventory` has **no
`@@map`**, so the Postgres table is `"ProductInventory"` (case-sensitive); columns:
`"reservedQuantity"` maps to `reserved_quantity`, `quantity` has no map (column `quantity`).

**Change.** Replace the per-item update loop (`order.service.ts:215-224`) with a
conditional atomic reserve per item:

```ts
for (const item of itemDetails) {
  const updated = await tx.$executeRaw`
    UPDATE "ProductInventory"
    SET reserved_quantity = reserved_quantity + ${item.quantity}
    WHERE id = ${item.inventoryId}
      AND quantity - reserved_quantity >= ${item.quantity}`;
  if (updated === 0) {
    throw new AppError(
      `Insufficient stock for item (${item.colorVariantName} - ${item.size}) at checkout`,
      HTTPSTATUS.CONFLICT,
      ErrorCode.INVALID_REQUEST,
    );
  }
}
```

Keep the pre-tx check (:142-152) untouched — it stays as fast-fail UX; the tx
guard is now authoritative. Throwing inside `runTransaction` rolls back order +
cart-clear automatically (existing behavior).

**Acceptance test.**

- Integration: seed inventory `quantity=1, reservedQuantity=0`; run two checkouts concurrently (`Promise.allSettled`); assert exactly one resolves, inventory ends `reserved_quantity=1`, exactly one Order exists.

---

### A5 — Vendor-cancelled order items must release reserved stock (Med-High)

**Problem.** In `updateOrderItemStatus` (`order.service.ts:376-448`) only the
`DELIVERED` branch touches inventory (`:404-412`). When a vendor sets an item to
`CANCELLED`, its reservation leaks forever — stock becomes permanently unsellable
until someone runs manual SQL. Customer-side `cancelOrder` does release correctly (`:340-351`).

**Change.** Inside the transaction, before/parallel to the DELIVERED branch add:

```ts
if (
  itemStatus === 'CANCELLED' &&
  item.itemStatus !== 'CANCELLED' &&
  item.itemStatus !== 'DELIVERED'
) {
  await tx.productInventory.update({
    where: { id: item.inventoryId },
    data: { reservedQuantity: { decrement: item.quantity } },
  });
}
```

Guards explained: `!== 'CANCELLED'` prevents double-decrement on repeated calls;
`!== 'DELIVERED'` prevents decrementing stock already finalized (quantity was
already deducted at delivery).

Also: when an item is cancelled, do **not** let the all-items aggregation set
`DELIVERED`/`COMPLETED` states incorrectly — verify the existing `allItems.every(...)`
logic treats `CANCELLED` correctly (it does: `allDelivered` requires every item
DELIVERED, so a cancelled item blocks auto-completion — leave as-is).

**Acceptance tests.**

- Vendor cancels a PENDING item → inventory `availableQuantity` increases back by item quantity.
- Calling cancel twice → reservation decremented once only.
- Cancel after DELIVERED → 400 or no-op without stock mutation.

---

### A6 — Reservation reaper for abandoned online-payment orders (Med)

**Problem.** Online-payment orders stay `PENDING_PAYMENT` with stock reserved
(`reservedQuantity` incremented at checkout) forever if payment is abandoned.
Only customer `cancelOrder` releases. No job exists.

**Change.** Mirror the session-maintenance worker trio exactly:

1. **Queue** — `apps/api/src/common/services/queue.service.ts` (pattern: `sessionQueue` at :75):

   ```ts
   export const orderMaintenanceQueue = new Queue('order-maintenance', {
     connection: redisConnection,
   });
   ```

2. **Worker** — new file `apps/api/src/modules/order/order-reservation.worker.ts`, modeled on
   `session.worker.ts` (entire file, 32 lines):

   ```ts
   const orderReservationWorker = new Worker(
     'order-maintenance',
     async (job: Job) => {
       if (job.name === 'release-stale-reservations') { ... call service ... }
       return { ignored: true };
     },
     { connection: redisConnection, concurrency: 1 },
   );
   export { orderReservationWorker };
   ```

3. **Service method** — add to `OrderService` (or a small `OrderMaintenanceService` in the same module):

   ```ts
   async releaseStaleReservations(): Promise<{ cancelledOrders: number }> {
     const ttlHours = Number(process.env.ORDER_RESERVATION_TTL_HOURS ?? 2);
     const cutoff = new Date(Date.now() - ttlHours * 3600_000);
     // find PENDING_PAYMENT orders older than cutoff (include items), reuse cancelOrder's tx logic
   }
   ```

   Reuse the exact release pattern from `cancelOrder` (:340-363): decrement reservations, mark items CANCELLED, mark order CANCELLED. Wrap all in ONE transaction per order. Log each release with `logger.warn({ orderId, ageMinutes }, 'Released stale payment reservation')`. Send cancellation email via the existing `enqueueMail` queue (see product.service usage of mail queue for the import path).

4. **Registration** — `apps/api/src/worker-main.ts`:

   - Import `orderMaintenanceQueue` (+ worker) alongside session ones (:14-24).
   - Register repeatable next to the session job (:41-52):
     ```ts
     await orderMaintenanceQueue.add(
       'release-stale-reservations',
       {},
       { repeat: { pattern: '*/30 * * * *' }, jobId: 'stale-reservation-release' },
     );
     ```
   - Update the startup log string listing queues (:38).
   - Add worker + queue close calls in `shutdown` (:54-65).

5. **Env** — document `ORDER_RESERVATION_TTL_HOURS` (optional, default 2) wherever `.env.example` files exist.

**Acceptance tests.**

- Seed PENDING_PAYMENT order `updatedAt` 3h ago → service method cancels it, releases reservations, marks items CANCELLED.
- Fresh PENDING_PAYMENT order (< TTL) → untouched.
- CONFIRMED (COD) old order → untouched (COD orders are never reaped).

---

### A7 — Do not mark unpaid online orders as paid on delivery (High)

**Problem.** `updateOrderItemStatus` auto-sets `paymentStatus: 'COMPLETED'`
when every item reaches DELIVERED (`order.service.ts:441`) regardless of whether
money was ever received. Combined with A2/A1 this let zero-payment orders complete.

**Change.** Replace the unconditional spread at :441:

```ts
...(allDelivered ? { paymentStatus: 'COMPLETED' } : {}),
```

with a paid-check computed before the update:

```ts
const paid =
  item.order.paymentMethod === 'COD' ||
  (await tx.payment.findFirst({
    where: { orderId: item.orderId, status: 'COMPLETED' },
  }));
...
data: {
  status: newOrderStatus,
  ...(allDelivered && paid ? { paymentStatus: 'COMPLETED' } : {}),
},
```

If `allDelivered && !paid`, log: `logger.error({ orderId }, 'Order delivered without completed payment — paymentStatus left PENDING')`.

Note: `item.order` must include `paymentMethod` — extend the include in
`findVendorOrderItemById` if needed (check `order.repository.ts`; currently likely
includes order — add `select` for `id, status, paymentMethod`).

**Acceptance tests.**

- COD order fully delivered → `paymentStatus: COMPLETED` (unchanged behavior).
- STRIPE order delivered with no COMPLETED Payment row → `paymentStatus` stays PENDING, order status DELIVERED.

---

### A8 — Refresh-token rotation with reuse detection (Med)

**Problem.** `refreshToken` (`auth.service.ts:539-618`) rotates tokens but never
invalidates the previous refresh token: JWTs are stateless and the Session row
has no rotation marker (`schema.prisma:9-19`). A stolen refresh token works until
session expiry even after the victim rotates.

**Change.**

1. **Migration** (additive, safe):

   ```prisma
   model Session {
     ...
     rotatedRefreshId String? @map("rotated_refresh_id")
   }
   ```

   Run: `pnpm --filter @celebs/api exec prisma migrate dev -e apps/api/.env.development --name session_rotated_refresh_id`

2. **Token issuance sites** — four places create refresh payloads; embed a fresh jti in each:

   - vendor register ~`:320`, login ~`:390`, google sign-in ~`:725`, rotation `:604-606`.

   ```ts
   import { randomUUID } from 'node:crypto';
   const refreshTokenPayload: RefreshTPayload = { sessionId: session.id, jti: randomUUID() };
   ```

   Extend `RefreshTPayload` in `@celebs/shared-utils` jwt types (`jti?: string` — optional keeps old tokens verifiable during rolling deploy).

3. **Creation sites must persist the jti**: wherever a Session row is created
   (find `prisma.session.create` in auth.service) add `rotatedRefreshId: <jti>`.

4. **Verification** in `refreshToken` (`auth.service.ts:544-575`):
   ```ts
   if (!payload?.sessionId) → 401 (unchanged)
   ...
   const presentedJti = payload.jti;
   if (presentedJti && session.rotatedRefreshId && presentedJti !== session.rotatedRefreshId) {
     await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
     logger.error(
       { sessionId: session.id, userId: session.userId },
       'security.refresh_reuse_detected — session terminated',
     );
     throw new UnauthorizedException('Session revoked due to token reuse', ErrorCode.AUTH_UNAUTHORIZED_ACCESS);
   }
   ```
5. **Rotation** at :583-588 (the sliding-window update): also write the new jti:
   ```ts
   data: { expiredAt: ..., ...(newPayloadJti ? { rotatedRefreshId: newPayloadJti } : {}) },
   ```
   Generate the replacement jti BEFORE signing (:604-606) so you can persist and embed the same value.
6. Logout flow: unchanged (deletes whole session).

**Behavior note for review:** first refresh with a legacy token (no jti) still
succeeds and upgrades the session — this is deliberate for rolling deploys.

**Acceptance tests** (extend `__tests__/refresh-token.spec.ts` patterns):

- Valid rotation chain works (jti updates each hop).
- Replaying the PREVIOUS refresh token → 401, session deleted, subsequent refresh with newest token also fails (family killed).
- Legacy jti-less token → still refreshes once (upgrade path).

---

## §1b — Branch 3: `fix/mobile-checkout-persistence`

Base: `main` or current stack tip. Scope: apps/mobile only. No API changes
required — the server contract is already correct.

### Root-cause diagnosis (verified)

Mobile orders never persist because of two stacked bugs:

1. **M1 — Guest/user cart divergence.** Items added while logged out are stored
   in a session-keyed cart (`x-session-id: guest_<ts>_<rand>`, generated in
   `apps/mobile/src/features/cart/store/use-cart-store.ts:30-45`). The API's
   checkout reads the cart **by userId only**
   (`apps/api/src/modules/order/order.repository.ts:146` → throws
   "Your cart is empty" 400 if the user-cart has no items). The mobile API layer
   already defines `CartApiService.syncCart` → `POST /cart/sync`
   (`apps/mobile/src/features/cart/services/cart-service.ts:84`) but **nothing calls
   it anywhere in the app**. Symptom is intermittent: it works only for users
   who log in _before_ adding items.
2. **M2 — Fake-success fallback.** `apps/mobile/src/app/checkout.tsx:105-113`
   attaches `.catch(async () => ({ data: { success: true, data: { orderId:
'CEL-2026-<random>' } } }))` (comment: _"Fallback simulation for staging"_).
   Every failure — validation, auth, network, the M1 empty-cart 400 — becomes an
   "Order Placed!" alert, after which the local cart is cleared. The user can
   never see a real error.

Minor extra: the payload built at checkout.tsx (~lines 77-103) includes an
`items[]` array the zod schema (`checkoutSchema`) silently strips — harmless but
dishonest; remove it.

### C1 — Wire guest→user cart sync on login

**Change.**

1. Find the successful-login/token-acquisition point in the mobile auth flow
   (search `apps/mobile/src` for where the auth token is persisted to
   SecureStore / the auth store transitions to authenticated).
2. Immediately after login success, before any navigation completes:
   ```ts
   await CartApiService.syncCart({
     items: guestItems.map((i) => ({
       productId: i.productId,
       colorVariantName: i.colorVariantName,
       size: i.size,
       quantity: i.quantity,
     })),
   });
   ```
   Signature note (verified): `syncCart(input: SyncCartInput)` takes ONE object —
   `{ items: [{ productId, colorVariantName, size, quantity }] }` per
   `syncCartSchema` in `packages/shared-types/src/validators/cart.validator.ts`.
   Server behavior (already implemented, `cart.service.ts:264-273`): merges each
   item into the user cart, silently skipping out-of-stock ones.
3. After sync resolves: regenerate the guest session id via the existing
   `initSession()` helper (so subsequent logged-out sessions start clean),
   clear the local cart state, and re-fetch the server cart through the normal
   `fetchCart` path so the UI shows merged data.
4. On logout: call `initSession()` to mint a fresh guest session and clear local
   cart state (verify this isn't already done; add if missing).

**Notes.** Do not send both `x-session-id` and rely on it once authenticated —
the server ignores sessionId when a userId is present
(`cart.service.ts:23-29`), which is exactly what makes C1 sufficient.

### C2 — Remove fake success; honest error handling

**Change.** In `apps/mobile/src/app/checkout.tsx`:

1. Delete the `.catch(async () => ({ data: { success: true, ... } }))` block
   entirely (lines ~105-113). No fallback simulation survives.
2. Wrap the POST in try/catch. On error: show `Alert.alert('Order failed',
<server message>)` using the same error-normalization pattern other screens
   use with `apiClient` (see how existing screens surface API errors — reuse
   that helper). **Do not** call `clearCart()`, **do not** navigate away.
3. Success path: read the real identifiers from the response
   (`result.data.data.order.orderNumber`) and pass them to the confirmation
   screen/navigation instead of fabricated ids.
4. Remove the phantom `items` field from the payload object.
5. Gate the payment-method picker to `'COD' | 'STRIPE'` only (the constant at
   checkout.tsx line ~48 currently offers all four) — consistent with A1's
   server-side rejection of KHALTI/ESEWA. Keep the picker data-driven so real
   gateways re-enable entries later without logic changes.

**Acceptance (manual smoke, no RN unit harness assumed).**

1. Logged out: add item to cart → log in → verify (via admin/API) the user cart
   contains the item → COD checkout → Order row exists in DB; confirmation shows
   real order number.
2. Airplane-mode checkout attempt → visible error alert; cart still populated;
   retry after reconnect succeeds with the SAME idempotency key producing one order.
3. KHALTI/ESEWA do not appear as options.

---

## §1c — Branch 4: `feat/web-admin-live-orders`

Base: Branch 1 tip (displays A5/A7 behavior correctly only then). Scope:
apps/web-admin only.

### Root-cause diagnosis (verified)

The entire orders feature renders mock data:
`apps/web-admin/src/features/orders/pages/orders-page.tsx` seeds component state
from a hardcoded 3-row array `INITIAL_ORDERS` (L60-119) at `useState`
(L122); there is **no fetch/query anywhere** in the feature. "Save & Notify
Customer" mutates local state only (L155+); a "Reset Demo" button re-seeds
mocks (L249-250). Bonus bug: `dispatch3PLOrder` in `features/orders/api.ts:15`
sends `{ courierProvider }` while the backend zod schema reads `req.body.provider`
(`apps/api/src/modules/logistics/logistics.routes.ts:23`).

Backend endpoints are ready and match the per-item fulfillment UI:

- `GET /orders/vendor/orders` — paginated `{items,total,page,limit}`; each item
  includes `order{..., address, user{id,name}}`; vendor-scoped; `?status=` filter
  on itemStatus.
- `GET /orders/admin/orders` — paginated `{orders,total,page,limit}`; each order
  includes `items[], address, user`; `?status=` filter on order-level status.
- `PATCH /orders/vendor/orders/items/:orderItemId/status` — body
  `{itemStatus, trackingNumber?, courierPartner?}` (matches fulfillment modal).

House pattern to copy: `features/vendors/api.ts` (query-key factory + async fns)
consumed via TanStack Query in `vendor-list-page.tsx:67-98`.

### D1 — API client layer

Extend `features/orders/api.ts` following the vendors pattern:

```ts
export const ORDERS_QUERY_KEYS = {
  vendor: (filters) => ['orders', 'vendor', filters] as const,
  admin: (filters) => ['orders', 'admin', filters] as const,
};
getVendorOrders({ status?, page?, limit? })   // GET /orders/vendor/orders
getAdminOrders({ status?, page?, limit? })    // GET /orders/admin/orders
updateOrderItemStatus(orderItemId, body)      // PATCH .../items/:orderItemId/status
```

Fix `dispatch3PLOrder`: rename body key `courierProvider` → `provider`.

### D2 — Shape mapper

Flatten either backend shape into the existing `OrderItemUI` rows:

- From vendor items: `item.order.orderNumber`, `item.order.user.name`,
  `item.order.address.{phone, province, district, cityArea}`,
  `item.{productName, colorVariantName, size, quantity}`,
  `unitPrice = Number(item.unitPrice)` (Prisma Decimal serializes as string),
  row amount = `Number(item.subtotal)` (per-line, matches current mock semantics),
  `paymentMethod/paymentStatus` from `item.order`, `itemStatus/tracking/courier`
  from the item.
- From admin orders: emit one row per `order.items[]` entry; order-level fields
  from the parent; status filtering applies to `order.status`.
- `createdAt`: ISO string as today.

### D3 — Dual-mode page wiring

Mode resolution (mirror how other features read identity from the auth store):

- user has `vendorProfile` → vendor mode → `useQuery(ORDERS_QUERY_KEYS.vendor(filters), getVendorOrders)`
- role `ADMIN|SUPERADMIN` with ORDER_VIEW → admin mode → admin endpoint +
  order-level status tabs (8-value enum from `updateOrderStatusSchema`:
  PENDING_PAYMENT, CONFIRMED, PACKED, HANDED_OVER, OUT_FOR_DELIVERY,
  DELIVERED, CANCELLED, RETURNED)
  Both modes get pagination controls wired to `{page,limit}` and loading/error/
  empty states per the house recipe (dim wrapper/PageLoader/EmptyState).

### D4 — Live mutations

1. `handleSaveFulfillment` → `useMutation(updateOrderItemStatus)` +
   `invalidateQueries` on the active list key; button pending state while
   mutating; surface mutation errors via existing toast/alert pattern.
2. Dispatch & Settle-COD buttons call the (now fixed) existing api fns;
   gate visibility/enability with `can()`:
   dispatch → `Permission.ORDER_MANAGE`, settle → `Permission.FINANCE_MANAGE`.
3. Restrict the status dropdown to valid transitions only (PENDING→PACKED→
   HANDED_OVER→DELIVERED; CANCELLED allowed pre-delivery) mirroring service
   rules — backend remains authoritative.

### D5 — Demolish mocks

Delete `INITIAL_ORDERS`, its seeding, and the "Reset Demo" button. Empty list →
existing `EmptyState`. Explicitly out of scope: return-orders-page.tsx and
reviews-page.tsx stay stubs.

**Acceptance (manual smoke against staging API).**

1. Vendor login → sees only own items; PACKED transition persists after reload;
   inventory reserved count drops on DELIVERED (A5 behavior visible).
2. Admin login → platform-wide orders with working order-status tabs + pagination.
3. Fulfilling an unpaid STRIPE order to DELIVERED leaves paymentStatus PENDING
   in DB and does not display COMPLETED (A7 behavior visible).
4. Zero occurrences of `INITIAL_ORDERS` / "Reset Demo" in the codebase.

---

## §2 — Branch 2: `refactor/product-service-decomposition`

Base: Branch 1 tip (stacked). **Zero behavior change. Zero test-file edits.**

### Current state — `apps/api/src/modules/product/product.service.ts` (1,253 lines)

Module-level helpers:

| Lines    | Symbol                                              |
| -------- | --------------------------------------------------- |
| 46-56    | `toJsonInput`                                       |
| 58-110   | `collectProductAssetUrls` (exported? no — internal) |
| 112      | `HEX_COLOR_PATTERN`                                 |
| 114-120  | `isFilledString`                                    |
| 122-~176 | `resolveStorefrontColorVariants`                    |

Class methods (`export class ProductService` at :177):

| Lines     | Method                            | Size          |
| --------- | --------------------------------- | ------------- |
| 180-183   | `getProducts`                     | thin wrapper  |
| 184-328   | `formatProductResponse` (private) | ~145L         |
| 329-467   | `createProduct`                   | ~139L         |
| 468-494   | `getProductById`                  | ~27L          |
| 495-550   | `getProductsByVendor`             | ~56L          |
| 551-699   | `getAllProducts`                  | ~149L         |
| 700-732   | `getProductReviewQueue`           | ~33L          |
| 733-769   | `submitProductForReview`          | ~37L          |
| 770-903   | `reviewProduct`                   | ~134L         |
| 904-1106  | `updateProduct`                   | ~203L ← worst |
| 1107-1146 | `archiveProduct`                  | ~40L          |
| 1147-1253 | `toggleProductActivation`         | ~106L         |

Type exports at top (`CreateProductInput`, etc.) and re-export
`{ PRODUCT_DETAIL_SELECT, PRODUCT_LIST_SELECT }` (:41) must remain importable
from `./product.service`.

**Consumers (verified exhaustive):** `product.controller.ts`, `product.routes.ts`
(instantiates), 5 spec files under `modules/product/__tests__/`. No cross-module imports.

### Target layout

```
modules/product/
  product.service.ts          # facade + create/update CRUD (~450L target)
  product-query.service.ts    # NEW: read side
  product-lifecycle.service.ts# NEW: submit/review/archive/toggle
  product.presenter.ts        # NEW: formatProductResponse + storefront variants
  product-assets.ts           # NEW: asset-url collection + json/color helpers
```

### Move sequence — one commit per step, full gates between steps

**B1 → `product-assets.ts`.**
Move `toJsonInput`, `collectProductAssetUrls`, `HEX_COLOR_PATTERN`,
`isFilledString` (+ anything they alone need). Export them. Update service imports.
Gate: typecheck + lint + tests.

**B2 → `product.presenter.ts`.**
Move `formatProductResponse` and `resolveStorefrontColorVariants`. Presenter
exports pure functions taking `(product, options…)` mirroring the current private
signature exactly. Service delegates. Gate again.

**B3 → `product-query.service.ts`.**
Move `getProducts`, `getProductById`, `getProductsByVendor`, `getAllProducts`,
`getProductReviewQueue` into `export class ProductQueryService` with identical
signatures. These methods may use presenter/assets modules. Gate again.

**B4 → `product-lifecycle.service.ts`.**
Move `submitProductForReview`, `reviewProduct`, `archiveProduct`,
`toggleProductActivation` into `export class ProductLifecycleService`. Gate again.

**B5 → slim the facade.**
Remaining in `ProductService`: `createProduct`, `updateProduct`. Decompose
`updateProduct` internals into named private steps within the same class
(e.g. `applyInventoryChanges`, `diffAndRecordAudit`, `syncMediaUsage`) — extract
along natural seams found while reading, do NOT change ordering or side effects.
Facade wiring:

```ts
export class ProductService {
  private queries = new ProductQueryService();
  private lifecycle = new ProductLifecycleService();
  getProducts(f) {
    return this.queries.getProducts(f);
  }
  // …delegate every legacy public member with identical signature…
}
export type CreateProductInput = CreateProductType; // keep all existing exports
export { PRODUCT_DETAIL_SELECT, PRODUCT_LIST_SELECT };
```

**Acceptance criteria (Branch 2 as a whole).**

- All 5 spec files byte-identical to base branch (`git diff --stat` shows no `__tests__` changes).
- No file >600L; no method >80L.
- Public API surface of `product.service.ts` unchanged (same exported names/types).
- Full turbo suite green.

---

## §3 — Verification & rollout checklist

Per commit: `pnpm turbo typecheck && pnpm turbo lint`.
Per branch completion: `pnpm turbo test` — expected ≥ 191 API tests
(183 baseline + 8+ new from §1) plus web-admin suites untouched-green.

Manual smoke (staging, post-Branch-1):

1. COD checkout happy path → order CONFIRMED, stock reserved.
2. Customer cancel → stock released (compare inventory counts before/after).
3. Vendor PACKED → HANDED_OVER → DELIVERED on multi-item COD order → paymentStatus COMPLETED at final delivery.
4. STRIPE order abandoned at payment → within TTL + reaper cycle → auto-cancelled, stock restored, cancellation email received.
5. Campaign edit changing products persists (regression check vs Aug-24 report §3.1).
6. Login → refresh → refresh → logout → old refresh rejected everywhere.

Manual smoke (post-Branch-3, mobile):

7. Logged-out add-to-cart → login → cart shows synced items → COD checkout →
   real order number on confirmation, Order row in DB.
8. Network killed mid-checkout → error alert shown, cart intact; retry with same
   idempotency key creates exactly one order.

Manual smoke (post-Branch-4, web-admin — full E2E chain):

9. Order placed via mobile (step 7) is visible on the admin Orders page within
   one refresh; vendor login sees the same order's items scoped to their store.
10. Fulfill that order PACKED → HANDED_OVER → DELIVERED from the admin UI;
    inventory `reservedQuantity` drops at DELIVERED; paymentStatus correct per A7.
11. Confirm zero mock remnants: no `INITIAL_ORDERS`, no "Reset Demo".

Deploy notes: Branch 1 adds one additive migration (A8) and optional env var
(A6); Render deploy checklist should gain `ORDER_RESERVATION_TTL_HOURS` and a
mandatory `STRIPE_SECRET_KEY` for any production API instance (A2 makes it required).
Branch 3 ships via the normal EAS/mobile release channel and requires no API
coordination beyond Branch 1's A1 already being merged (payment-method gating).

---

## §4 — Report/documentation updates

1. Append to `docs/reports/2026-08-24-platform-hardening-report.md` a section
   **“§5 Follow-up audit findings (post-hardening)”** containing the findings
   table from this plan (A1–A8 sources) with resolution mapping, plus the
   mobile/admin rows below:

   | Finding                                                                                                                                       | Severity                                          | Fixed in         |
   | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ---------------- |
   | Mobile checkout: guest/user cart divergence — `POST /cart/sync` defined but never called; checkout reads user-cart only → "cart is empty" 400 | High (orders silently never persist)              | Branch 3 (C1)    |
   | Mobile checkout: `.catch()` converts every failure into a fake "Order Placed!" success and clears the cart                                    | High                                              | Branch 3 (C2)    |
   | Web-admin Orders page renders hardcoded mock data (`INITIAL_ORDERS`); fulfillment save is local-state only                                    | High (operators believe orders are being managed) | Branch 4 (D3–D5) |
   | `dispatch3PLOrder` sends `{courierProvider}` but backend zod reads `provider` — courier silently defaults                                     | Low-Med                                           | Branch 4 (D1)    |

2. After Branch 2 merges: flip the god-file row in that report's
   “Explicitly NOT resolved” table to resolved-with-link-to-this-plan.
3. Update `AGENTS.md` if the refactor-as-you-touch policy gets an exception note
   for completed decompositions (one sentence, human-approved wording).

---

## Execution order summary

| Step                              | Branch | Commit(s)                                                                    |
| --------------------------------- | ------ | ---------------------------------------------------------------------------- |
| A1+A2 (validation & stripe traps) | 1      | `fix(api): reject unsupported payment methods and unconfigured stripe`       |
| A3 (idempotency)                  | 1      | `fix(api): scope checkout idempotency keys to users and close creation race` |
| A4 (oversell guard)               | 1      | `fix(api): conditional stock reservation inside checkout transaction`        |
| A5 (vendor cancel restock)        | 1      | `fix(api): release reserved stock when vendor cancels order items`           |
| A6 (reaper)                       | 1      | `feat(api): scheduled stale-reservation reaper worker`                       |
| A7 (paid gate)                    | 1      | `fix(api): require completed payment before marking online orders paid`      |
| A8 (refresh reuse)                | 1      | `feat(api): detect refresh-token reuse and kill sessions`                    |
| Report update §4.1                | 1      | `docs: append follow-up audit findings to hardening report`                  |
| B1–B5 decomposition               | 2      | one commit per B-step, `refactor(product): …`                                |
| C1 cart sync on login             | 3      | `fix(mobile): sync guest cart into user cart after login`                    |
| C2 honest checkout errors         | 3      | `fix(mobile): remove fake checkout success fallback, surface real errors`    |
| D1+D2 api layer + mapper          | 4      | `feat(web-admin): add orders query layer and shape mapper`                   |
| D3 dual-mode page                 | 4      | `feat(web-admin): wire orders page to live vendor/admin endpoints`           |
| D4+D5 mutations & mock removal    | 4      | `feat(web-admin): live fulfillment mutations; delete mock order data`        |

Merge order: 1 → 3 → 4 (Branch 2 independent, any time after 1).
