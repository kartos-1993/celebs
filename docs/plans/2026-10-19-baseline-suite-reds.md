# Baseline suite reds: bootstrap logistics ids + legacy archive route

Date: 2026-10-19
Branch: `fix/baseline-suite-reds`
Status: done

## Why

Two failures had been carried as "known reds" while every other API suite was
made green, and the confirming full-suite run surfaced a third. None is flaky:
two are stale test contracts and one exposes a real data-ownership bug.

## Finding 1 — the seed stamps courier ids on reference data

`seedLogisticsLocations` currently gives Kathmandu, Lalitpur and Bhaktapur the
Pathao city ids 79/80/81 and default zone ids 1326/1327/1328
(`src/db/seed/seed-logistics-locations.ts:53-57`). That contradicts the
documented contract in four places:

- `prisma/schema.prisma:344` — "BOOTSTRAP rows come from our own reference data
  and have no courier id yet".
- `src/modules/logistics/courier-destination.repository.ts:63-71` — a bootstrap
  city with `externalId === null` is deliberately unpriceable: "quoting from our
  own guess is the thing this file exists to prevent".
- `src/modules/logistics/logistics-location-sync.service.ts:311-315` — bootstrap
  zones carry negative synthetic ids "precisely so [they] can never be mistaken
  for a courier id ... pricing waits for the courier rather than guessing".
- `src/db/seed/__tests__/seed-logistics-locations.spec.ts:90-95` — the seed
  contract asserts no bootstrap city has a courier id.

It is also a live bug. The courier sync upserts by `externalId` but its `update`
branch does not change `source` (`logistics-location-sync.service.ts:226-236`).
A pre-mapped bootstrap city is therefore updated in place, remains
`source: 'BOOTSTRAP'`, and `reconcile` then retires it because the courier now
serves a city of the same name (`:110-136`). One sync adopts the valley and
deactivates it in the same pass.

### Fix

- Delete the well-known Pathao mapping. Bootstrap cities are created with
  `externalId: null`; their default zones always use the negative synthetic id.
- Keep the seed non-destructive: an existing row is not rewritten.
- Make the sync's upsert `update` set `source: 'COURIER'`, so rows already
  pre-mapped in an existing database transition to courier ownership instead of
  being adopted and then retired. Add a regression test for that legacy state.

## Finding 2 — the access matrix calls a removed route

`tests/security/access-matrix.spec.ts:198-215` exercises archive as
`POST /products/:id/archive`. The canonical route is now
`DELETE /products/:id` (`src/modules/product/product.routes.ts:76-81`), per the
API route mandate ("Archive / Delist: `DELETE /:id` (never
`POST /:id/archive`)"). The 404 is correct; the matrix is stale.

### Fix

- Allow `'delete'` in the matrix case method union.
- Point the destructive own-listing case at `DELETE /products/:id`.
- Keep every expected cell unchanged: the guards, not the verb, are what the
  matrix pins.

## Finding 3 — the media rate-limit test predates user-scoped quotas

Found by the full-suite run, not the two known reds.
`src/middlewares/__tests__/rate-limit.spec.ts:35-45` posted 31 unauthenticated
requests to `/api/v1/media/upload` and expected 429; it now gets 401 on every
request. Commit `2c950fb9` deliberately moved `uploadRateLimiter` from before
`authenticateJWT` to after `requireStoreState` so the quota is keyed by the
authenticated user rather than a shared IP, and added
`upload-rate-limiter.spec.ts` for that contract. The older integration test was
left behind, and `/media/upload` no longer exists.

### Fix

- Build a real vendor session in the test (user, PENDING store, session, signed
  access token) and hit the live `POST /api/v1/media/presign` route with a
  Bearer token.
- The 31st request returns 429; the first 30 pass the limiter and fail later in
  the stack.

## Out of scope

- Phase 5 `tag` column drop.
- Parked 2026-10-17 plan Features 1-3.
- Any change to quote pricing or courier adapters.

## Verification

```bash
# apps/api
npx dotenv -e .env.test -- npx vitest run \
  src/db/seed/__tests__/seed-logistics-locations.spec.ts \
  src/modules/logistics/__tests__/logistics-location-reconciliation.spec.ts \
  tests/security/access-matrix.spec.ts \
  src/middlewares/__tests__/rate-limit.spec.ts
npx tsc --noEmit
npx tsc -p tsconfig.spec.json --noEmit   # 37-error baseline
```

## Execution log

- Deleted `WELL_KNOWN_PATHAO_CITY_IDS`. Bootstrap cities are created without an
  `externalId`; default zones always use the negative synthetic id. Existing
  rows are left untouched, preserving the seed's non-destructive contract.
- Added `source: 'COURIER'` to the sync's city upsert `update`, so a legacy
  pre-mapped bootstrap row transitions to courier ownership instead of being
  adopted and then retired. Added the "adopts a seeded district that already
  holds the courier id" regression test.
- Updated the access matrix to `DELETE /products/:id` and allowed `delete` in its
  method union. Expected cells are unchanged.
- Targeted verification: 18/18 across the two seed/reconciliation specs and the
  access matrix.
- Logistics + seed surface: 41 files, 333/333.
- Full API suite: 204 files, 203 passed / 1 failed, 1375/1376 tests. The single
  failure was Finding 3; after that fix the rate-limit spec is 4/4.
- `npx tsc --noEmit`: 0 errors.
- `npx tsc -p tsconfig.spec.json --noEmit`: 37 errors, exactly the recorded
  baseline, none in touched files.
- Consolidated run after Finding 3: 4 files, 22/22.

### Deviations

None from the plan for Findings 1 and 2. The full-suite run added Finding 3,
fixed on the same branch. Existing databases that already received the Pathao
ids are repaired lazily by the next courier sync (the new adoption test); no
destructive data migration was added.
