# Cache & Tenant Isolation — Forensic Report + Autonomous Execution Runbook

**Document Version:** 1.0.0
**Date:** 2026-10-18
**Author:** Forensic audit performed by agent on live dev stack (API :3333, dev DB, seeded logins)
**Target Execution Agent:** Autonomous implementation agent (switch out of Plan mode to execute)
**Branch:** `fix/auth-ux-and-shortcut-rename`
**Companion runbook:** `docs/plans/2026-10-18-storefront-campaign-combo-agent-execution-runbook.md` (this plan is a **pre-flight hardening addendum**; execute BEFORE its Phase 4)
**Status:** READY FOR EXECUTION — findings verified live (read-only); no files changed yet

---

## 1. Operational Directive & Mandatory Pre-Flight Gates

Execute per the repo mandates in `.agents/AGENTS.md`, `apps/api/AGENTS.md`, `apps/web-admin/AGENTS.md`:

1. **TDD Mandate:** author the failing spec first for every fix in this document.
2. **No backward-compat shims** (pre-production YAGNI): fix contracts at the source; delete dead code instead of shimming it.
3. **Repository pattern:** no Prisma in services; controllers are thin.
4. **Baseline gates (known pre-existing, measure deltas, do not "fix" unless in scope):**
   - `seed-logistics-locations.spec.ts:94` failure (BOOTSTRAP districts count) — identical on baseline.
   - ~30 app / ~38 spec pre-existing tsc errors (brand/category/media/platform-settings controllers) — none in touched files.
5. **Pending working tree:** the men-apparel seed work is uncommitted (`products.json`, `seed-categories-men.ts`, `seed-option-sets.ts`, `merge-seed-batch.ts(+spec)`, new `seed-product-attribute-coverage.spec.ts`). **Commit or stash it before starting** (recommended: commit; it is verified done).
6. **Do not break the good patterns** verified in this audit (§2, "Verified correct").

---

## 2. Forensic Reality — Findings & Root Causes (The "Why")

All findings F1–F3, F6 were verified against the live stack on 2026-10-18 (evidence in Appendix A). F4–F5 are code-verified.

### F1 — CRITICAL: Cross-tenant product read via client-supplied `vendorId` (reproduced live)

**File:** `apps/api/src/modules/product/product-query.service.ts`

- Lines 226–230 correctly pin a seller to their own store: `where.vendorId = opts.storeId`
- Lines **262–264** unconditionally override it with the client's query param:
  ```ts
  if (filters.vendorId) {
    where.vendorId = filters.vendorId;
  } // ← clobbers the store scope
  ```

**Repro (VERIFIED):** vendor `Brothers Collection` token + `GET /api/v1/products?manage=true&vendorId=00000000-0000-0000-0000-000000000001` → **25/25 "Celebs Official" (1P) products returned as the vendor's elevated list** — including non-published items of the targeted store (elevated status branch keys off the overridden filter).

**Contract violated:** `apps/api/src/common/guards/store.guards.ts:155-180` (`resolveTargetStoreId`) — _"Sellers are ALWAYS scoped to their own store; client-supplied vendorId params are ignored"_. Every other module follows it (verified: fulfillment controller pins `req.store?.id`; earnings `resolveVendorForRead`; seller-statement; media). `getProducts` is the outlier — it never applies that guard.

**Symptom mapping:** "1P platform products in a vendor's product list" — any URL/clients carrying `vendorId` render another store's catalog in a vendor's list.

### F2 — HIGH: The caching issue — authenticated/elevated responses marked publicly cacheable (verified headers)

**Files:**

- `apps/api/src/modules/product/product.routes.ts:25` — `publicCache({ maxAge: 30, sMaxAge: 60, swr: 120 })` on `GET /products` applies to **every** request.
- `apps/api/src/modules/product/product.controller.ts:133-137` — only the anonymous case is corrected (and it _replaces_ the header, dropping `s-maxage`).
- `apps/api/src/modules/product/product.routes.ts:40` — `publicCache({ maxAge: 60, sMaxAge: 300, swr: 300 })` on `GET /products/:id`; the detail controller (lines 72–118) has **no override at all**.
- `apps/api/src/common/http/cache-policy.middleware.ts:27-38` — sets the header unconditionally; ensures `Vary: Accept-Encoding` but never `Vary: Authorization/Cookie`.

**Verified live (vendor token):**
| Request | Response header |
|---|---|
| `GET /products?page=1&limit=100` (auth + `X-Surface: admin`) | `Cache-Control: public, max-age=30, s-maxage=60, stale-while-revalidate=120`, `Vary: Origin, Accept-Encoding` |
| `GET /products/:id` (auth) — and identical for anonymous | `Cache-Control: public, max-age=60, s-maxage=300, stale-while-revalidate=300` |

Same URL returns **identity-dependent payloads** (12 own products as scoped vendor vs 37 for anonymous in tests B/C/D) while all carry public directives → any shared cache (CDN/edge/reverse proxy) or the shared browser HTTP cache replays one identity's response to other vendors/guests: the admin's all-store list (incl. 25 "Celebs Official" rows) shown in a vendor's product list; an owner's non-published detail served publicly. **This is "the product being visible to all the vendors".**

**Side finding (freshness):** `category.routes.ts:58` — `publicCache({ maxAge: 300, sMaxAge: 3600, swr: 3600 })` on `/category/tree-with-attributes` (optional auth). Categories are not tenant-scoped, but authenticated admins currently receive the same 1h edge-cached payload → new/edited categories can be stale in the add-product form for up to 1h at the edge (5 min browser). The F2 fix (auth-aware middleware) also fixes the admin surface; the anonymous edge TTL remains a documented trade-off.

### F3 — MEDIUM: Management mode is a client-controlled switch (enabler of F1)

**File:** `apps/api/src/modules/product/product.controller.ts:125` — `isStoreManagement = req.headers['x-surface'] === 'admin' || req.query.manage === 'true'`.

Tenant scoping (`where.vendorId = opts.storeId`) and elevation (status visibility) both depend on this client-controlled flag. Verified: with `manage=true`/`X-Surface` the service scopes (12 own rows); without it a vendor JWT falls back to the public storefront semantics (37 published rows — public data, but proves the mode switch is caller-owned). Correct pattern: derive management context from the authenticated actor + store; treat the header only as a surface hint, never as the authorization switch.

### F4 — LOW: Dead cache/ETag machinery

- `apps/api/src/common/utils/response.util.ts:68` `sendPublicCachedWithETag` is **never used**; Express ETag disabled globally (`app.ts:56`); but `etag` is still in CORS `exposedHeaders` (`app.ts:106`). Either adopt or delete (YAGNI says delete).

### F5 — AUDIT ITEMS (no defect found yet; bounded verification steps in §4 Phase 3)

- **Auth cache** (`apps/api/src/common/cache/auth-cache.ts`): 30s TTL; invalidation call sites present and sensible (logout/refresh rotation: `auth.service.ts` 234/307/375/410/484/518; staff 294; admin 137; user 77; store suspension `store-lifecycle.service.ts:91`). Verify each revocation path in Phase 3; no changes planned.
- **Redis layer — verified CORRECT:** product list cache is public-scope only (`product-query.service.ts:98-102`); detail keys split `elev`/`pub` (`product-cache.ts:23-24`); storefront home Redis key + invalidations wired (`storefront.service.ts`; banner/campaign/combo/platform-settings repos all call `invalidateCacheKey(STOREFRONT_HOME_CACHE_KEY)`); `scanDelByPattern` batched + best-effort. The "cache" in the user's report is the **HTTP header layer (F2), not Redis**.
- **Checkout idempotency:** DB-backed (`checkout.service.ts:110-114, 328-350, 460-462`) — not a cache concern.
- **Remaining scoping surfaces to audit (Phase 3 checklist):** orders core (`order/core/order.controller.ts` — consumer `req.user.id` paths), reviews, vendor, wishlist modules — with the grep commands in Appendix B.
- **Storefront shortcuts cache:** NOT implemented yet. Companion runbook Phase 4.6 adds `storefront:shortcuts:${categorySlug}` (Redis, TTL 300s) — this plan REQUIRES invalidation on shortcut create/update/delete/reorder to be part of that step (see Phase 3).

### F6 — Data hygiene notes

- DB now holds **37 published products**: 25 under `Celebs Official` (1P) + 12 under `Brothers Collection`; 13 vendors (incl. "Cachee", 0 products).
- `products.json` declares 24 "Celebs Official" items — DB has **25**; one extra (`…Thermal Lined Pullover…`, created 15:23:49Z) exists outside the dataset. Reconcile in Phase 5.
- Why the incident surfaced "now": the reseed published the 1P platform catalog and re-created it newest-first, so any cross-tenant/cache replay now visibly floods lists with "Celebs Official".

---

## 3. Invariants To Enforce (canonical contracts for all fixes)

- **R1 — Seller pinning:** every seller-scoped read/write (management surfaces) derives the store from `req.store.id`; a client-supplied `vendorId` is ignored for seller actors; platform actors may name a vendor; guests may filter the public storefront (published-only). Exactly `resolveTargetStoreId` semantics.
- **R2 — Cache privacy:** `public`/`s-maxage` directives only on responses that are byte-identical for every consumer (anonymous, no actor, no auth material). Any authenticated/elevated response → `Cache-Control: private, no-store` (+ `Pragma: no-cache`). Auth variance (`Vary: Authorization, Cookie`) required on any endpoint that can serve both anonymous and authenticated traffic while remaining publicly cacheable.
- **R3 — Invalidation completeness:** every Redis key written must have at least one enumerated purge path per mutation that can change it (list of keys × mutations lives in code comments/tests).

---

## 4. Phase-by-Phase Execution Instructions (TDD)

### PHASE 1 — Tenant isolation fix (F1 + F3) — API

**Step 1.1 Author failing specs first**

- Extend `apps/api/src/modules/product/__tests__/product-tenant-isolation.spec.ts` (service level):
  - `getProducts(filters, { actor: vendorA, storeId: vendorA.id, isStoreManagement: true })` with `filters.vendorId = vendorB.id` → returns ONLY vendorA products (current code returns vendorB's — RED).
  - Same with no `filters.vendorId` → vendorA products (already green).
  - Orphaned seller (`actor` present, `storeId` undefined, `isStoreManagement: true`) → returns nothing / throws `SELLER_CONTEXT_REQUIRED` (no cross-tenant fallback).
- Add an HTTP-level spec (supertest pattern already used in `auth/__tests__/web-mobile-token-transport.spec.ts`): vendor JWT + `?manage=true&vendorId=<other>` → 200 with own-store payload only (and never non-published rows of the target).

**Step 1.2 Fix `product-query.service.ts`**

- Replace the two-step vendor resolution with a single effective resolution:
  ```ts
  if (isStoreManagement && !isPlatform) {
    if (!opts.storeId)
      throw new AppError(
        'This operation requires a seller store context',
        HTTPSTATUS.FORBIDDEN,
        ErrorCode.SELLER_CONTEXT_REQUIRED,
      );
    where.vendorId = opts.storeId; // seller ALWAYS pinned
  } else if (filters.vendorId) {
    where.vendorId = filters.vendorId; // platform support reads + public storefront filter
  }
  ```
- **Delete lines 262–264** (the unconditional override).
- Keep public storefront behavior: vendor-as-shopper browsing (no `manage`) may filter any vendor — published-only public data.

**Step 1.3 Fix the mode switch (F3, minimal)**

- `product.controller.ts`: keep `isStoreManagement` as a _surface hint_ for response shaping, but the scoping above must be sufficient. Add the seller-context assertion (1.2) so `manage=true` without a store is a 403, never a fallback.

**Step 1.4 Run:** product specs + tenant specs; verify the live curl repro (Appendix A #E) now returns own-store only.

### PHASE 2 — HTTP cache policy hardening (F2 + F4)

**Step 2.1 Author failing header specs first**

- supertest: anonymous `GET /products?page=1` → `Cache-Control: public, max-age=30, s-maxage=60, stale-while-revalidate=120`.
- Authenticated (vendor JWT) list AND detail → `Cache-Control: private, no-store` and NO `s-maxage`.
- `GET /products/:id` for anonymous → unchanged `public, max-age=60, s-maxage=300...`.
- `Vary` on any publicly-cacheable response includes `Authorization, Cookie` (defense in depth).

**Step 2.2 Make `publicCache` auth-aware (single source of truth)**

- `cache-policy.middleware.ts`: capture the public value as today; at request time, if `req.actor` (or `req.headers.authorization` / auth cookie present) → emit `Cache-Control: private, no-store, no-cache, must-revalidate` + `Pragma: no-cache` instead; otherwise the public value + `Vary: Authorization, Cookie` appended (keep `Accept-Encoding`).
- Routes already run `optionalAuthenticateJWT`/`optionalActorContext` BEFORE `publicCache` (product list/detail, category tree, storefront home) — actor is available at middleware time. Verify ordering on `logistics.routes.ts` and adjust if needed.
- Delete the anonymous-only override body in `product.controller.ts:133-137` (middleware now owns the header) — one source of truth.

**Step 2.3 Dead code (F4)**

- Delete `sendPublicCachedWithETag` and the `etag` CORS `exposedHeaders` entry (nothing emits ETags; Express `etag` is off).

**Step 2.4 Run** the header specs + full product route smoke; re-check live headers (Appendix A #A and detail test).

### PHASE 3 — Redis & cache-layer audit + shortcut cache (F5)

**Step 3.1 Audit pass (read-only, no behavior change unless a gap is found)**

- Verify each auth-cache invalidation site listed in F5 actually fires on the corresponding revocation path (logout, refresh reuse, staff removal, admin role flip, store suspension). Write findings into the PR description; add a spec only if a path is missing.
- Run the Appendix B grep checklist over orders/reviews/vendor/wishlist; any `req.query.vendorId`-style client tenant input must follow R1.

**Step 3.2 Storefront shortcuts cache (aligns with companion runbook Phase 4.6)**

- Add `storefront:shortcuts:${categorySlug}` Redis cache (TTL 300s) in the storefront-shortcut service — AND wire invalidation into every shortcut mutation (create/update/delete/reorder/activate) with a spec asserting stale keys are purged.
- If shortcut payloads embed product counts/visibility, add `purgeShortcutCache` to the product visibility-flip purge path (`product-cache.ts` `purgeProductLists` call site) — decide in the spec.

**Step 3.3 (optional hardening)** Category tree: keep the 1h anonymous edge TTL (documented), but add a CDN purge hook note for category CRUD deploys. Only if asked.

### PHASE 4 — Client interplay verification (web-admin + mobile)

**Step 4.1**

- After Phase 2, repeat the account-switch scenario: admin loads `/products/manage` → sign out → vendor logs in → `/products/manage` — the browser HTTP cache can no longer replay the admin payload (authed responses are `no-store`). Verify with DevTools network panel (no `(disk cache)` entry for the products calls).
- Confirm TanStack behavior stays as-is: `use-logout.ts` already removes all non-account queries; `staleTime: 30000` (`main.tsx:33`) is fine once HTTP-level replay is gone.
- Mobile: ensure no authenticated storefront GET becomes `no-store` in a way that breaks offline stubs — spot-check list/detail with and without a session.

**Step 4.2 Deploy note:** add a one-line purge for `/api/v1/products*`, `/api/v1/category*`, `/api/v1/storefront*` to the release checklist (stale public entries carry over otherwise).

### PHASE 5 — Hygiene & baselines

- Reconcile F6: confirm the 25th platform product (15:23:49Z) — import it into `products.json` or archive it; keep counts honest.
- Confirm delta-only test results: `pnpm --filter api test` (expect only the pre-existing `seed-logistics-locations` failure); tsc delta unchanged.
- Ensure the men-seed commit landed before this work (Pre-flight gate 5).

### PHASE 6 — End-to-end forensic verification (acceptance gate)

Run the Appendix A matrix; PASS requires ALL of:

1. #E (vendor + `manage=true&vendorId=<other>`) → own-store rows only (12 for Brothers Collection).
2. #B/authed list + detail → `Cache-Control: private, no-store`, no `s-maxage`, no `public`.
3. #D/#G anonymous list/detail → unchanged public values.
4. #F and #C → unchanged (documented public semantics).
5. All new specs green; delta test/tsc baselines unchanged.

---

## 5. Rollback & Troubleshooting Playbook

- Each phase is a single logical commit; revert individually. The Phase 1 fix is behavior-changing only for malformed/foreign `vendorId` reads — no legitimate flow regresses (platform support reads keep working via the actor check).
- If edge caches were already poisoned in a deployed environment: purge `/products*` + `/category*` after deploy.
- If a spec fails on strict `private, no-store` for anonymous requests, check route middleware ordering (auth middleware must run before `publicCache`).

---

## Appendix A — Live Evidence (2026-10-18, dev stack)

Login: `vendor11@celebs.test` / `Password123!` (Brothers Collection, `126c836d-…`). Platform 1P vendor id: `00000000-0000-0000-0000-000000000001`.

| Test  | Command (abridged)                        | Result                                                                                     |
| ----- | ----------------------------------------- | ------------------------------------------------------------------------------------------ |
| A     | authed list + `X-Surface: admin`, headers | `Cache-Control: public, max-age=30, s-maxage=60, swr=120`, `Vary: Origin, Accept-Encoding` |
| B     | authed list + `X-Surface: admin`, body    | 12/12 Brothers Collection only                                                             |
| C     | authed list, no `X-Surface`               | 37/37 published (public semantics)                                                         |
| D     | anonymous list                            | 37/37 published                                                                            |
| **E** | **authed + `?manage=true&vendorId=<1P>`** | **25/25 "Celebs Official" — cross-tenant read (F1)**                                       |
| F     | authed + `?manage=true`                   | 12/12 own store                                                                            |
| G     | anonymous + `vendorId=<1P>`               | 25/25 (intended public vendor filter)                                                      |
| —     | authed `GET /products/:id` headers        | `public, max-age=60, s-maxage=300, swr=300` (same as anonymous)                            |

DB at time of audit: 25 published 1P + 12 published 3P; 13 vendors.

## Appendix B — Remaining-surface audit checklist (Phase 3)

```bash
# client-supplied tenant inputs must follow R1 (sellers pinned)
grep -rn "query.vendorId\|body.vendorId\|filters.vendorId" apps/api/src --include="*.ts" | grep -v __tests__
# surface switches
grep -rn "x-surface" apps/api/src --include="*.ts" | grep -v __tests__
# cache directives on routes
grep -rn "publicCache(\|privateNoStore(" apps/api/src --include="*.ts" | grep -v __tests__
```

## Appendix C — Mapping to the companion runbook

- Execute this plan BEFORE `2026-10-18-storefront-campaign-combo-agent-execution-runbook.md` Phase 4 (both touch `ProductQueryService`; this plan's Phase 1/2 precede its Step 4.2 to avoid merge conflicts).
- This plan REPLACES the shortcut-cache step scope in its Phase 4.6 with the invalidation-inclusive version (Phase 3.2 here).
- The companion runbook's forensic sections remain valid; nothing in it conflicts.

## Execution Log — Phase A (2026-10-18, branch `fix/tenant-scope-and-cache-auth-hardening`)

**Phase 1 (F1 + F3) — done.**

- `product-query.service.ts` `applyScalarFilters` now has a single effective vendor resolution: platform actors scope `filters.vendorId`; non-platform actors with `isStoreManagement` are ALWAYS pinned to `opts.storeId` (missing store → `noStoreError(actor.role)` → `SELLER_CONTEXT_REQUIRED` for sellers/customers, `ACCOUNT_ORPHANED` for orphaned staff); anonymous/non-management browse keeps the public `filters.vendorId` filter. The unconditional override (old lines 262–264) is deleted, so management mode is a surface hint only — it can no longer widen tenant scope either way.
- `store.guards.ts` `noStoreError` is exported so the service and the declarative guards share one error contract.
- TDD evidence: service-level specs went RED pre-fix (pin test returned only vendor B's row; store-less management resolved instead of rejecting) and GREEN after.
- Regression specs: 4 service-level cases in `product-tenant-isolation.spec.ts` + 3 HTTP-level cases in `tests/security/product-cross-tenant-http.spec.ts` (seller + `?manage=true&vendorId=<other>` over the live app → own-store rows only; manage without store → 403 `SELLER_CONTEXT_REQUIRED`; anonymous stays public).

**Phase 2 (F2 + F4) — done.**

- `publicCache` is now the single source of truth: credentialed requests (resolved actor/user, `Authorization` header, `accessToken`/`refreshToken` cookies) emit `Cache-Control: private, no-store, no-cache, must-revalidate` + `Pragma: no-cache`; anonymous requests emit the configured public policy and `Vary: Accept-Encoding, Authorization, X-Surface`.
- The controller override (old `product.controller.ts` lines 133–137) is deleted: it stripped `s-maxage` for anonymous reads and left `public, s-maxage` on authenticated reads. Anonymous list reads now correctly serve the route policy (`public, max-age=30, s-maxage=60, stale-while-revalidate=120`), verified at HTTP level.
- `sendPublicCachedWithETag` + `PublicCacheETagOptions` + `conditional-get-revalidation.spec.ts` deleted (zero production call sites; the middleware is the one cache-header mechanism).
- DEVIATION — `etag` CORS `exposedHeaders` entry KEPT: the F4 premise "nothing emits ETags" is factually wrong. `product-render.routes.ts` emits a real `ETag` and answers `If-None-Match` with 304; removing the exposure would strip browser readability of that live contract, and `cors-configuration.spec.ts` pins the exposure.
- DEVIATION — `Vary: Authorization, X-Surface` (not `Cookie`): the anonymous storefront carries a guest `sessionId` cart cookie, so `Vary: Cookie` would fragment the edge cache per visitor and silently kill `s-maxage` for cart users. The only cookie-authenticated client (web-admin) sends `X-Surface: admin` on every request, so elevated traffic is separated; credentialed responses are no-store anyway and can never populate a shared cache.

**Verification**

- Targeted: cache-policy + tenant-isolation 19/19; new HTTP boundary spec 3/3.
- Full product module + rbac + product-lifecycle: 26 files / 200 tests green.
- Broader batch (product, storefront, security cache, cors, health): 100/101. The single failure is a PRE-EXISTING stale expectation in `tests/security/access-matrix.spec.ts` (it calls legacy `POST /products/:id/archive` while the canonical route is `DELETE /:id` per §10 conventions) — no route files were touched in this diff.
- Typecheck: app 30 errors (baseline), spec 37 (≤ baseline 38), none in touched files.
- Appendix B checklist recorded: remaining `req.query.vendorId` consumers (finance, fulfillment) use their own scope helpers (`resolveTargetStoreId`, `earnings-scope`, `vendorScope`) — deferred to the Phase 3 audit pass.

**Deferred (not in Phase A):** Phase 3 (auth-cache invalidation audit, shortcut cache), Phase 4 (client interplay verification), Phase 5/6 (hygiene + e2e acceptance gate).
