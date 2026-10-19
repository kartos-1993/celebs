# Drop `Product.tags` — Phase 5 / C6

Date: 2026-10-19
Branch: `chore/drop-tag-column`
Status: done (local test DB migrated; shared Supabase deployment pending approval)

## Context

C6 makes the column drop the **last** step, after the validator/API, web-admin
and seed paths stop using it. The `tag` filter removal landed earlier (C4), but
the column's write/read path is still live. This branch finishes C6 steps 1-3,
proves the surface is clean, and only then drops the column.

`ComboBundle.tag` is a different field (used by `GET /combos?tag=`) and stays.
OpenAPI `tags` are route-grouping metadata and stay.

## Live evidence

- `schema.prisma:1303` still declares `tags String[]` on `Product`.
- 36 `"tags"` arrays remain in `src/db/seed/data/products.json`.
- Seed importer still maps them (`seed-products.ts:75,198`).
- API still writes and reads them:
  - `product-payloads.ts:59,128`
  - `product-response-shapes.ts:518-520`
  - `repositories/product-projections.ts:139`
  - `utils/product-audit.ts:52`
- Shared contracts still expose them:
  - `packages/shared-types/src/types/product.ts:140`
  - `packages/shared-types/src/validators/product.validator.ts:154`
- Web-admin create still injects them (`add-product-payload.ts:849`) and the
  review-queue type still carries them (`review-queue/types.ts:76`).
- Batch importer still accepts and emits them
  (`scripts/maintenance/merge-seed-batch.ts:60,223`).
- Search already falls back to name/brand only
  (`product-query.service.ts:269-277`), so dropping the column changes no search
  behavior. The verdict already accepts this fallback.

## Ordered work

### Commit 2 — remove every non-DB reference

**Shared contracts**

- Delete `tags` from `IProduct`.
- Delete `tags` from `createProductSchema` (the update schema derives from it).
- Rebuild `@celebs/shared-types` so `dist/` matches source.

**API**

- Stop writing `tags` on create/update (`product-payloads.ts`).
- Stop selecting, shaping and auditing it (`product-projections.ts`,
  `product-response-shapes.ts`, `product-audit.ts`).
- Stop importing it from seed data (`seed-products.ts`) and batch payloads
  (`merge-seed-batch.ts`).
- Update fixtures/specs that construct products with `tags`:
  `seed-products.spec.ts`, `product-payloads.spec.ts`,
  `product-controller.spec.ts`, `product-service-wiring.spec.ts`,
  `product-audit.spec.ts`, `merge-seed-batch.spec.ts`, plus the product
  fixtures in `campaign.repository.spec.ts`, `category-rbac.spec.ts` and
  `combo.repository.spec.ts`.
- In `product-payloads.spec.ts`, keep the update/audit coverage but drive it
  with a field that still exists instead of `tags`.

**Web-admin**

- Stop sending `tags` on create (`add-product-payload.ts`); keep the existing
  `featured` behavior unchanged.
- Remove `tags` from the review-queue product type.
- Update `payload-builders.spec.ts`: create no longer carries `tags`, update
  still omits it, `featured` behavior is unchanged.

**Seed data**

- Strip all 36 `tags` arrays from `products.json`.
- Keep the product count and every other field unchanged.

No schema change in this commit, so the column still exists and every test can
run against the current database.

### Commit 3 — drop the column (last)

- Remove `tags String[]` from the `Product` model.
- Generate the migration offline with `prisma migrate diff` (Prisma 7 uses
  `--from-schema` / `--to-schema`), named `drop_product_tags`.
- Expected SQL: `ALTER TABLE "Product" DROP COLUMN "tags";`
- Validate the SQL on a scratch local PostgreSQL database.
- Apply it to the local test DB (`localhost:5432/celebs_test`) with the repo's
  `db push --accept-data-loss` flow — the same flow used by `pnpm test` and CI.
  The existing local DB has migration drift and is not deploy-managed, so
  `migrate deploy` cannot be used there.
- Regenerate the Prisma client and re-run the targeted suites.
- Do **not** touch the Supabase development database. Deploy the migration
  there later with `prisma migrate deploy` after explicit approval and a
  snapshot. The drop is irreversible.

## Acceptance matrix

| Check                                      | Expected                                                                              |
| ------------------------------------------ | ------------------------------------------------------------------------------------- |
| `POST /products` with no tags              | product created; response has no `tags` key                                           |
| `POST /products` with a stray `tags` value | Zod strips it (schema is non-strict); product created without it                      |
| `PATCH /products/:id`                      | stored product has no `tags`; response has no `tags` key                              |
| `GET /products`                            | cards have no `tags` key                                                              |
| Seed rerun                                 | 36 products, none carrying `tags`                                                     |
| Search by name or brand                    | still returns matches; no tag search existed                                          |
| `GET /combos?tag=`                         | unaffected (`ComboBundle.tag` untouched)                                              |
| Database                                   | `Product.tags` absent in the local test DB after sync; shared Supabase pending deploy |
| Reference audit                            | no `Product.tags` reads/writes left in code or seed data                              |

## Verification

```bash
# contracts
pnpm --filter @celebs/shared-types build
pnpm --filter @celebs/shared-types typecheck

# API targeted specs
cd apps/api
npx dotenv -e .env.test -- npx vitest run \
  src/modules/product/__tests__/product-payloads.spec.ts \
  src/modules/product/__tests__/product-response-shapes.spec.ts \
  src/modules/product/__tests__/product-controller.spec.ts \
  src/modules/product/__tests__/product-service-wiring.spec.ts \
  src/modules/product/__tests__/product-audit.spec.ts \
  src/modules/product/__tests__/product-category-tree-search.spec.ts \
  src/db/seed/__tests__/seed-products.spec.ts \
  src/scripts/maintenance/__tests__/merge-seed-batch.spec.ts
npx tsc --noEmit
npx tsc -p tsconfig.spec.json --noEmit   # 37-error baseline

# web-admin
cd apps/web-admin
npx vitest run src/features/product/utils/__tests__/payload-builders.spec.ts
npx tsc -b --noEmit
```

## Out of scope

- `ComboBundle.tag` and `GET /combos?tag=`.
- OpenAPI route `tags`.
- Barcode-copy references to "garment tags".
- Re-running the full 204-file API suite; the targeted product/seed surface plus
  the typecheck baselines are the gate for this cleanup.

## Execution log

### Commit 2 — `84cf83e0 refactor(product): remove tags from contracts, payloads and seeds`

- 21 files: shared contracts, API write/read path, web-admin create payload,
  and the 36 seed arrays. `ComboBundle.tag` and OpenAPI route `tags` untouched.
- API targeted: 7 files, 94/94.
- Web-admin payload builder: 33/33.
- `tsc --noEmit` (API): 0; web-admin `tsc -b --noEmit`: 0.
- Spec `tsc`: 37 errors, the recorded baseline; none in touched files.

### Commit 3 — migration `20261019141759_drop_product_tags`

- `.env.test` targets the local database `localhost:5432/celebs_test`
  (the same target CI uses). The Supabase development database is separate and
  was not touched.
- Generated the migration offline:
  `prisma migrate diff --from-schema <HEAD> --to-schema <working> --script`.
- SQL: `ALTER TABLE "Product" DROP COLUMN "tags";`
- Validated on a scratch local PostgreSQL 15 database at `localhost:5432`:
  `tags` column count went 1 → 0 and the product row survived. Scratch DB
  dropped afterwards.
- `migrate deploy` was attempted on `celebs_test` and stopped on pre-existing
  drift (`20261010000000_seller_statements`: the `SellerStatementStatus` enum
  already exists). The failed attempt was marked rolled back; no part of this
  branch's migration was applied by that command.
- Applied through the repo's test/CI flow instead:
  `prisma db push --accept-data-loss` against `.env.test`. The local `tags`
  column went 1 → 0, with all 3 product rows preserved.
- Regenerated Prisma Client v7.2.0; the generated types contain no `tags`.
- Post-drop gates: 8 files / 97 tests (includes category-tree search),
  API `tsc` 0, spec `tsc` 37-error baseline.
- The Supabase development database still has the physical column; it is
  nullable and unused, so the new client is compatible. Deployment there is
  pending explicit approval: `prisma migrate deploy` on the direct 5432 URL,
  after a snapshot. The drop is irreversible.
