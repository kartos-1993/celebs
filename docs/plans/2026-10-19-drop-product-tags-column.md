# Drop `Product.tags` — Phase 5 / C6

Date: 2026-10-19
Branch: `chore/drop-tag-column`
Status: planned

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
- Generate the migration on the direct port-5432 URL per the `prisma-cli`
  runbook, named `drop_product_tags`.
- Expected SQL: `ALTER TABLE "Product" DROP COLUMN "tags";`
- Apply to the local test database, regenerate the Prisma client, and re-run the
  targeted suites.
- Do **not** deploy to the shared dev database without explicit approval. The
  drop is irreversible; take a snapshot first if it is ever deployed.

## Acceptance matrix

| Check                                      | Expected                                                         |
| ------------------------------------------ | ---------------------------------------------------------------- |
| `POST /products` with no tags              | product created; response has no `tags` key                      |
| `POST /products` with a stray `tags` value | Zod strips it (schema is non-strict); product created without it |
| `PATCH /products/:id`                      | stored product has no `tags`; response has no `tags` key         |
| `GET /products`                            | cards have no `tags` key                                         |
| Seed rerun                                 | 36 products, none carrying `tags`                                |
| Search by name or brand                    | still returns matches; no tag search existed                     |
| `GET /combos?tag=`                         | unaffected (`ComboBundle.tag` untouched)                         |
| Database                                   | `Product.tags` absent from `information_schema.columns`          |
| Reference audit                            | no `Product.tags` reads/writes left in code or seed data         |

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

- Pending.
