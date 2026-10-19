# Storefront Shortcuts: Truthful State, Titles, and a Redis Cache

**Date:** 2026-10-19
**Branch:** `feat/storefront-shortcut-cache` (stacked on `fix/stale-courier-cart-specs`)
**Origin:** corrected execution order item **C8** — `docs/plans/2026-10-18-runbook-review-verdict-and-corrections.md`; runbook Step 4.6.

## Problem

Three defects in `StorefrontShortcutService`, plus the missing cache:

1. **Deactivated shortcuts still render.** `formatFilter` reads
   `isActive` from a top-level row field that does not exist
   (`(qf as Record<string, unknown>).isActive !== false`, `service.ts:72`) — the
   schema has no such column, so the expression is always `true`. The real home is
   `filterConfig.isActive`, written by `createStorefrontShortcut` (`:204`),
   `updateStorefrontShortcut` (`:233`) and the seed (`seed-storefront-shortcuts.ts:44`).
   The same defect sits on line 71 for `displayOrder` — always `0`.
2. **The public config drops `title`.** The `shortcuts.push` at
   `service.ts:157-164` omits it; the runbook requires
   `title: shortcut.title || 'Subcategories'`, and the admin listing already
   carries it (the spread in `formatFilter`).
3. **No cache.** Every category screen open re-runs category + shortcut +
   (optional) child-category queries; runbook 4.6 specifies Redis with key
   `storefront:shortcuts:${categorySlug}`, TTL 300s, invalidated on CRUD.

## Verified anchors

- `storefront-shortcut.service.ts:58-74` — `formatFilter` config read (the two
  dead top-level reads).
- `storefront-shortcut.service.ts:76-178` — `getStorefrontConfigBySlug`: 404 →
  rows → temp synthesis when no rows → auto-populate → push (title dropped).
  The temp "Subcategories" row is only synthesized when **no row exists**, so a
  deactivated row must not fall back to it.
- `service.ts:180-183` — admin listing maps the same `formatFilter`; it must keep
  deactivated rows visible (that is where they are re-activated).
- `db/schema.prisma:1482-1493` — `StorefrontShortcut` has **no isActive /
  displayOrder columns**; both live in `filterConfig` JSON.
- `config/upstash.redis.ts:23-28,133` — `cacheRedis` surface `get/set/del/expire`;
  adapters **throw** on failure, so callers must swallow (pattern:
  `logistics/delivery-quote.cache.ts`).
- `category.routes.ts:69-75` — public mount `GET /categories/:slug/storefront`
  (`optionalAuthenticateJWT` + `searchRateLimiter`, no `publicCache`); the payload
  is actor-independent, so a service-level Redis cache is safe (C9 satisfied —
  F1/F2 landed in `b6d3daf1`).
- Clients: mobile `StorefrontShortcutConfig` has no `title` and its renderer
  reads only `displayAs`/`items` → the addition is additive. Admin
  (`StorefrontShortcut` schema in `category.validator.ts:117-127`) already
  declares `displayOrder`/`isActive`; those values now become truthful.

## Decision

1. **Read the fields from the config** in `formatFilter`:
   `displayOrder: config.displayOrder ?? 0`, `isActive: config.isActive !== false`
   (default-true, matching create/update/seed semantics).
2. **Skip deactivated rows when rendering** in `getStorefrontConfigBySlug`
   (`if (!formatted.isActive) continue`). Deliberately **not** a repository
   JSON-path filter (the review's pointer at `repo:34-39`): a Postgres/Prisma
   `isActive = false` JSON condition excludes rows _missing_ the key (three-valued
   `NULL`), which would invert the default-active semantics the writers depend
   on. Deviation noted; semantics live with the writers.
3. **Carry `title`** in the pushed shortcut: `title: formatted.title || 'Subcategories'`.
4. **New `storefront-shortcut.cache.ts`** mirroring `delivery-quote.cache.ts`:
   swallow-with-`logger.warn`, payload shape validation on read, key
   `storefront:shortcuts:${category.slug}` (canonical slug — slug/id/name/path
   requests share one key), TTL 300s. Miss → build → set; 404s are not cached.
   Injected via `StorefrontShortcutServiceDeps.storefrontShortcutCache` so unit
   specs never touch Redis; the singleton keeps the real cache.
5. **Invalidate on CRUD**: create already holds the category (uses its slug);
   update/delete look the slug up via `findCategoryById`. A category rename or
   child-category edit is bounded by the TTL — documented trade-off.
6. **Refactor-first**: `getStorefrontConfigBySlug` becomes
   resolve-category → cache-get → `buildStorefrontConfig(category)` → cache-set.

## Test plan — new `storefront-shortcut-config.spec.ts` (integration, real DB + Redis)

1. **RED** — a deactivated stored row does not render, and does **not** get
   replaced by the synthetic "Subcategories" row (child category present).
2. **RED** — `title` carried through; empty title falls back to
   `'Subcategories'`; config `displayOrder` flows.
3. **RED** — cache lifecycle: read → outside DB edit → read returns the cached
   copy (proves Redis served it) → service update invalidates → next read shows
   the outside edit.
4. **RED** — admin listing still returns the deactivated row, now with truthful
   `isActive: false` / real `displayOrder`.
5. Update the existing DI spec to inject a no-op cache (unit specs must not
   touch Redis) and assert the carried title.

Unique `Date.now()` slugs per run; Redis keys invalidated in `afterAll` (DB rows
are covered by the suite's per-test truncation).

## Acceptance

- Shortcut module specs green; category module untouched-green.
- `apps/api` app `tsc` 0; spec `tsc` at the 37-error baseline (none in touched files).
- No mobile/web-admin changes required: the payload addition is additive and no
  current consumer reads `title`; admin fields become truthful, not reshaped.

## Execution log (2026-10-19)

### RED first

New `storefront-shortcut-config.spec.ts` failed **4/4** against the untouched
service:

- `expected [ { …(6) } ] to have a length of +0 but got 1` — a deactivated row rendered.
- `expected [ undefined, undefined ] to include 'Shop by Brand'` — titles dropped.
- `expected undefined to be 'Before'` — no cache read path existed.
- `expected true to be false` — the admin listing reported `isActive: true` for a
  deactivated row.

### Fix

- `formatFilter` reads `displayOrder` / `isActive` from `filterConfig`. The
  `displayOrder` line was the identical defect directly above the reviewed
  `isActive` line and is fixed with it.
- The public render skips deactivated rows; the stored row still suppresses the
  no-rows fallback, so a deliberate deactivation is not resurrected.
- `title: shortcut.title || 'Subcategories'` now travels in the payload.
- `storefront-shortcut.cache.ts` — key `storefront:shortcuts:${category.slug}`,
  TTL 300s, shape-validated reads, swallow-with-`logger.warn`; injected through
  `StorefrontShortcutServiceDeps` so unit specs never touch Redis. Invalidation
  on create/update/delete (create reuses the category it already resolved).
- `getStorefrontConfigBySlug` is now resolve → cache-get → `buildStorefrontConfig`
  → cache-set.

### GREEN

- `storefront-shortcut-config.spec.ts` 4/4; existing repository/DI spec 5/5 (the
  DI test now injects a no-op cache and asserts the carried title) → module **9/9**.
- No other spec in `apps/api` references `getStorefrontConfigBySlug` (grep) and
  `category.routes.ts` is untouched.
- `apps/api` app `tsc` **0**; spec `tsc` **37** (baseline set; none in touched files).
- Mobile / web-admin: no code change needed — `title` is additive and no current
  consumer reads it (the mobile renderer reads `displayAs` / `items`); the admin
  field names are unchanged, their values become truthful.

### Notes

- **Deviation** from the review's wording (Decision 2): the `isActive` filter is
  service-level, not a repository JSON-path clause — a JSON `equals: false`
  condition excludes rows _missing_ the key (three-valued `NULL`), which would
  invert the default-active semantics the writers rely on.
- `drawerFilters` stays `[]` (unchanged). The 300s TTL bounds staleness of
  category renames and edits made outside this API.
