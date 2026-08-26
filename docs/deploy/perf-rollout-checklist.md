# Post-Deploy Checklist — Performance Rollout (Aug 2026)

Covers: batched `syncCart`, atomic CTE add-to-cart, Redis auth cache.
**No schema changes, no migrations.** Full rollback = revert these files:

```
apps/api/src/modules/cart/cart.service.ts
apps/api/src/common/cache/auth-cache.ts            (new file — delete on revert)
apps/api/src/common/strategies/jwt.strategy.ts
apps/api/src/modules/auth/auth.service.ts
apps/api/src/modules/store/store-lifecycle.service.ts
apps/api/.env.example
```

---

## 1. Before deploying

- [ ] Staging `DATABASE_URL` has pool params:
      `?connection_limit=25&pool_timeout=10` (fixes connection queue spikes)
- [ ] Staging has `REDIS_HOST` set (cache degrades gracefully without it —
      app still works, just no speedup)
- [ ] Full test suite green locally: `pnpm --filter api test`
- [ ] Deploy to staging first. Never straight to prod.

## 2. Smoke tests on staging (5 minutes, do all of them)

Auth (Redis cache touched every request):

- [ ] Login → hit any page → logout → **hit API again with old token → must get 401 instantly**
      (this is the critical one — proves cached sessions can't outlive logout)
- [ ] Login from mobile app → browse around → confirm responses feel fast
- [ ] Refresh token flow: leave app idle past access-token expiry → app auto-refreshes → still logged in

Cart (batched sync + CTE upsert):

- [ ] As guest (logged out): add 2–3 items to cart → login → cart syncs, items appear
- [ ] Add an item already in your cart → quantity **increments**, not duplicates
- [ ] Two devices, same account, last item in stock: both tap buy at once →
      exactly one succeeds, other gets stock error (no oversell)
- [ ] Try adding more qty than available → clean error message, no partial write

Vendor/store path:

- [ ] Suspend a vendor from admin → vendor's requests 401 immediately
      (revocation invalidates cache)

## 3. What to watch in logs (first hour)

Compare query counts per request vs before:

| Endpoint                    | Before               | Expected after         |
| --------------------------- | -------------------- | ---------------------- |
| `POST /cart/sync` (3 items) | ~50+ queries         | ~10                    |
| `POST /cart/items`          | ~17 queries          | ~7                     |
| Any authenticated GET       | session+user queries | absent when Redis warm |

- [ ] No new `WARN: Redis cache operation failed` spam
      (occasional = fine, app falls back to DB; constant = check REDIS_HOST)
- [ ] Response times: `/addresses`, `/wishlist` should drop from ~900ms to <200ms
- [ ] No spike in 500s or Prisma errors (`P20xx` codes)

## 4. Known behavior changes (intentional, not bugs)

- Role/permission changes take **up to 30s** to propagate while a session
  stays valid. Session revocation is always instant. If you ever build an
  admin "ban user" that does NOT delete their sessions, also call
  `authCache.invalidateSessions()` for them — or accept ≤30s exposure.
- Cart sync skips out-of-stock items silently (same as before).

## 5. Honest risk register (what automated tests do NOT cover)

| Area                                     | Covered by tests?                              | Residual risk                             |
| ---------------------------------------- | ---------------------------------------------- | ----------------------------------------- |
| addToCart lifecycle + inventory creation | ✅ integration test                            | low                                       |
| syncCart batching/merge/skip-OOS         | ✅ added Aug 26                                | low                                       |
| Instant logout with warm cache           | ✅ session.spec                                | low                                       |
| Concurrent oversell prevention           | ⚠️ concurrency spec covers decrementStock only | verify manually via two-device test above |
| Redis Upstash REST mode (prod)           | ❌ tested locally via TCP mode only            | watch WARN logs after deploy              |
| Very large guest carts (100+ items)      | ❌                                             | unnest handles it, but eyeball one        |

## 6. Rollback decision tree

- Anything auth-related misbehaves → revert `jwt.strategy.ts` +
  `auth.service.ts` + `store-lifecycle.service.ts`, delete `auth-cache.ts`.
  App returns to per-request DB validation instantly.
- Cart quantities wrong / sync weirdness → revert `cart.service.ts`.
- Everything else (env example) — harmless either way.

Reverting costs nothing: no data format changed, no migration to undo.
