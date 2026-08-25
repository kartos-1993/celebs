# Platform Hardening Report — August 24, 2026

Scope: full-stack audit remediation across `apps/api`, `apps/web-admin`,
`apps/mobile`, plus toolchain cleanup. Delivered as a linear stack of six
branches (see §1).

---

## 1. Delivered work

| Branch                                  | Commit          | Summary                                                                                                                                                                       |
| --------------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `feat/mobile-sdui-and-preview`          | earlier         | Server-driven home UI, widget registry, admin preview simulator, shared layout validators                                                                                     |
| `fix/media-uploads-and-cache-freshness` | d6c0ec4…        | Upload folder/scope fixes (banners, marketing, KYC), presign-time key allowlist, mobile cache-revalidation                                                                    |
| `chore/nx-removal-ui-consistency`       | ef1375e…0bea6d1 | Nx/webpack toolchain removal, web-admin UI consistency sweep, `AGENTS.md` conventions guide                                                                                   |
| `fix/api-validation-and-observability`  | 7883062         | Mass-assignment fixes, pino error logging, `PRODUCT_STATUS` constants, config-driven email links, dead-code deletion                                                          |
| `fix/api-data-integrity-and-hotpaths`   | b4261e5         | Transactions, JWT hot-path parallelism + lean projection, checkout N+1 batch, audit-diff fast path, category pagination bugfix                                                |
| `perf/api-storefront-caching`           | fd3fed0         | Generic `TtlCache` (L1 memory + Upstash L2); banners/campaigns/combos cached with exact invalidation; quick-filter N+1 hoist; brand-screening prefetch; option-set seed guard |
| `perf/api-queued-mail`                  | 3057d28         | All transactional email moved to BullMQ `mail-delivery` queue + worker                                                                                                        |
| `chore/api-r2-orphan-reaper`            | 4f3aac1…6e30156 | Delete-safe orphan-object reaper CLI (dry-run default, live-reference cross-check, age cutoff)                                                                                |

Verification at stack tip: `turbo typecheck` 7/7 ✅ · `turbo lint` 7/7 ✅ ·
`turbo test` 8/8 ✅ (183 API tests incl. 15 new audit-trial unit tests,
36 web-admin test files, media security suite).

---

## 2. Audit findings → resolution map

### Resolved

| Finding                                                                                        | Severity    | Fix                                                                                           |
| ---------------------------------------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------- |
| Campaign/combo PUT accepted raw `req.body` (mass assignment)                                   | High        | New `updateCampaignSchema` / `updateComboSchema`; routes parse before service                 |
| Central error handler used `console.error`                                                     | High        | pino structured logs; `warn` for expected `AppError`, `error` + stack otherwise               |
| Product lifecycle statuses as raw string literals (~24 sites, incl. one phantom `'PUBLISHED'`) | High        | `PRODUCT_STATUS` const map + `VENDOR_EDITABLE_STATUSES` (`modules/product/product-status.ts`) |
| Vendor emails linked to hardcoded `localhost:5173`                                             | High        | `buildWebUrl(config.APP_ORIGIN)` everywhere                                                   |
| Combo/campaign updates: delete-all then re-create outside transaction                          | High        | Wrapped in `prisma.$transaction`                                                              |
| Media usage counters silently swallowed failures → DAM could delete live images                | High        | Logged with product context; tx-integration still pending (§4)                                |
| JWT strategy: serialized lookups + full rows incl. password hash on every request              | High        | Parallel fetches + lean `findAuthPrincipal` projection                                        |
| Checkout N+1 product lookups                                                                   | High        | Single batched `findMany` + Map                                                               |
| Public storefront reads uncached & unbounded                                                   | Medium–High | TtlCache rollout (see §3 limits); unbounded queries still lack `take` (§4)                    |
| quick-filter identical subquery per filter (public endpoint)                                   | Medium      | Hoisted single fetch                                                                          |
| Brand-hijack screening N+1 authorization checks per product write                              | Medium      | One vendor-authorization prefetch                                                             |
| Option-set seeding ran on every list()                                                         | Medium      | Once-per-process promise guard                                                                |
| Category pagination ignored `page` (pages 2+ returned page 1)                                  | Medium      | `skip` wired through repository                                                               |
| Silent catch blocks (9 bare catches + promise swallows)                                        | Medium      | Highest-risk ones now logged; remaining are documented intentional fallbacks                  |
| Nx + webpack remnants (7 packages, unused)                                                     | Low         | Removed; CI verified nx-free                                                                  |
| Dead code (empty `backblaze.ts`, dead `response.util.ts` consumers, unused guard/middlewares)  | Low/Medium  | Deleted where trivially safe; full envelope unification still open (§4)                       |

### Explicitly NOT resolved (parked)

| Item                                                                                                                                                                                                                                                                                                                                                                                       | Why parked                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| ~~**God files/methods**~~ — `product.service.ts` RESOLVED 2026-08-25: decomposed into `product-query.service`, `product-lifecycle.service`, `product.presenter`, `product-assets`, `product-payloads`, + inventory sync moved to repository. Largest file now 525L, no method >80L, all 194 API tests green unchanged. Remaining: `auth.service.ts` (739L) — refactor-as-you-touch applies | Deliberate policy (`AGENTS.md`): refactor-as-you-touch. Decomposition completed per `docs/plans/2026-08-24-api-remediation-and-god-file-plan.md` §2 |
| Response-envelope unification (123 inline literals vs dead helper; two competing error shapes)                                                                                                                                                                                                                                                                                             | Touches 19 backend files + frontend error handling; needs its own branch                                                                            |
| Media-counter reconciliation inside the transaction                                                                                                                                                                                                                                                                                                                                        | Current state: post-commit with loud structured logging; true fix wants `tx`-aware repository signature or outbox                                   |
| Admin/staff unpaginated listings                                                                                                                                                                                                                                                                                                                                                           | Requires coordinated web-admin UI change                                                                                                            |
| Unbounded `take` on public campaigns/combos queries                                                                                                                                                                                                                                                                                                                                        | Mitigated by caching; hard caps still worth adding                                                                                                  |
| Email sends from API fallback when Redis is down                                                                                                                                                                                                                                                                                                                                           | Intentional degraded mode (documented in code)                                                                                                      |

---

## 3. Behavioral changes testers must know

1. **Campaign product links now actually update.** Previously the admin form's
   `productIds` never reached the repository (silent no-op). Editing a
   campaign's products now replaces links — verify existing saved campaigns
   still render correctly after an edit.
2. **Unknown fields on campaign/combo PUT now return 400** instead of being
   spread into Prisma. Only the documented fields are accepted.
3. **Emails arrive asynchronously** (queued). Expect delivery seconds after
   the action, gated on the worker service running (see deploy checklist).
4. **Category list pagination works past page 1** — any consumer that relied
   on always receiving the first page will see different data.
5. **Storefront reads may lag up to ~60s** behind publishes (banners, active
   campaigns, combos). Mutations bust the cache immediately on the serving
   instance; other instances heal within the L1 TTL.
6. **Product edit history** now records every field change (`edited` entries
   in review history, platform edits flagged `· Platform`).
7. **Vendor approval/rejection emails link to `APP_ORIGIN`** — ensure it is
   set correctly per environment or links fall back to localhost.

---

## 4. Environment audit correction

Earlier suspicion of "two conflicting `.env.development` databases" was
wrong. There is exactly one authoritative file per app
(`apps/api/.env.development`). The confusing second schema diff came from
running Prisma without loading any env file, which activated the
`localhost:5432/celebs-auth` fallback in `prisma.config.ts`. Rule: always
pass `-e apps/api/.env.development` explicitly when invoking Prisma CLI.

---

## 5. Follow-up audit findings (post-hardening)

| Finding                                                                                                                                       | Severity                                          | Fixed in         |
| --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ---------------- |
| Reject KHALTI/ESEWA checkout until real adapters exist; `getPaymentGateway` fallback was mock                                                 | High                                              | Branch 1 (A1)    |
| `StripePaymentAdapter` silently faked success when `STRIPE_SECRET_KEY` missing in non-prod/prod                                               | High                                              | Branch 1 (A2)    |
| Idempotency keys: user-scoped lookup + race-safe placeholder in tx to prevent data leak & duplicates                                          | High                                              | Branch 1 (A3)    |
| Checkout oversell guard inside transaction using atomic conditional stock reservation                                                         | Med-High                                          | Branch 1 (A4)    |
| Vendor-cancelled order items must release reserved stock in `updateOrderItemStatus`                                                           | Med-High                                          | Branch 1 (A5)    |
| Scheduled background worker (`order-maintenance`) to reap stale online payment reservations                                                   | Med                                               | Branch 1 (A6)    |
| Unpaid online orders (e.g. Stripe) must not be marked `paymentStatus: COMPLETED` on delivery                                                  | High                                              | Branch 1 (A7)    |
| Refresh-token rotation with `jti` tracking and reuse detection / session family revocation                                                    | Med                                               | Branch 1 (A8)    |
| Mobile checkout: guest/user cart divergence — `POST /cart/sync` defined but never called; checkout reads user-cart only → "cart is empty" 400 | High (orders silently never persist)              | Branch 3 (C1)    |
| Mobile checkout: `.catch()` converts every failure into a fake "Order Placed!" success and clears the cart                                    | High                                              | Branch 3 (C2)    |
| Web-admin Orders page renders hardcoded mock data (`INITIAL_ORDERS`); fulfillment save is local-state only                                    | High (operators believe orders are being managed) | Branch 4 (D3–D5) |
| `dispatch3PLOrder` sends `{courierProvider}` but backend zod reads `provider` — courier silently defaults                                     | Low-Med                                           | Branch 4 (D1)    |
