# Implementation Plan — Seed Pipeline Service-Parity & Safe Reset

**Date:** 2026-10-16
**Status:** Approved for implementation
**Branch:** `fix/seed-service-parity` (from `feat/phase-5-envelope-normalization-and-read-hygiene`)
**Decision (user-confirmed):** `ProductService` is the **single source of truth** for every seeded
product. Raw-Prisma product writes are eliminated from the master seed; all seeding tools share the
same payload builders.

---

## §0 — Audited findings driving this branch

| #   | Finding                                                                                                                                                                                                                                                                            | Status    |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| F1  | `seed-products-denim-{jackets,jeans}.ts` and `seed-products-mock-catalog.ts` write products with `prisma.product.upsert()` — `vendorId`/`brandId`/`createdBy` never set (`schema.prisma` 1294/1342/1346)                                                                           | Confirmed |
| F2  | Master seed creates **no `ProductInventory` rows**; cart lazy-materializes them (`cart.service.ts` 336, 647–662; CTE 369–394), inventory service is not conflict-safe                                                                                                              | Confirmed |
| F3  | `seed-products-jackets-coats.ts` already demonstrates the correct service path but is standalone                                                                                                                                                                                   | Confirmed |
| F4  | `ensurePlatformVendor()` silently returns `null` pre-superadmin (platform-vendor.ts:48); `createProduct`/`checkout` blindly default to `PLATFORM_VENDOR_ID`, so a missing vendor surfaces as FK P2003, not a domain error                                                          | Confirmed |
| F5  | Web Admin guards (publish downgrade, brand LOA/hijack screening, publish floor) + deadlock-aware inventory sync are skipped by raw seeds                                                                                                                                           | Confirmed |
| N1  | `npm run seed:reset` is FK-broken from the 2nd run on: `seedCategoriesMen(true)` wipes categories **before** products (`Product_categoryId_fkey … ON DELETE RESTRICT`, baseline migration:1243); later `ProductInventory` cascade is pinned by `CartItem`/`OrderItem` RESTRICT FKs | Confirmed |
| N3  | `seedBrands()` retro-links products by name on re-runs (`seed-brands.ts` 166–185), while the product upsert keeps rewriting `brand` from the dataset → `brandId = Celebs Denim` with `brand = 'Manfinity'` drift                                                                   | Confirmed |

Full evidence: session audit (files, line numbers, call chains). New findings can be added to this
document as implementation proceeds.

---

## §1 — Platform-vendor provisioning policy (P0)

**Goal:** no path may produce an FK violation because the 1P store does not exist; failure must be a
typed, actionable domain error.

- `apps/api/src/db/seed/index.ts`
  - Fail fast when `ensurePlatformVendor` returns null (no superadmin can own the 1P store) before
    any other step runs.
- `apps/api/src/main.ts`
  - Log a boot warning when the 1P store is deferred (no superadmin) instead of staying silent.
- `packages/shared-utils/src/enums/error-code.enum.ts`
  - Add `PLATFORM_VENDOR_NOT_PROVISIONED`.
- `apps/api/src/modules/vendor/vendor.repository.ts`
  - Add `findById(id)` (id-only select).
- `apps/api/src/modules/product/product.service.ts`
  - Before writing, when the resolved vendor is the 1P store, verify it exists; otherwise throw
    `AppError(503, PLATFORM_VENDOR_NOT_PROVISIONED)` with setup instructions.
- `apps/api/src/modules/order/checkout/checkout.service.ts`
  - When any line falls back to `PLATFORM_VENDOR_ID` (legacy vendor-less product), verify the 1P
    store exists once; otherwise throw the same typed error instead of an order-write P2003.

**Acceptance:** fresh DB + no superadmin → `npm run seed` fails with the setup message; product
create and checkout return the typed error; after superadmin setup both succeed.

---

## §2 — FK-safe `seed:reset` (P0)

- New `apps/api/src/db/seed/purge-catalog.ts`: move `purgeAllTestData()` verbatim from
  `scripts/maintenance/clear-and-reseed-catalog.ts` (FK-safe order: notifications → finance →
  carts/reservations → orders/fulfilment → reviews/wishlist/marketing → inventories → products →
  outbox).
- `apps/api/src/db/seed/index.ts`
  - On `--reset`, run `purgeAllTestData()` **before** `seedCategoriesMen(isReset)`; remove the old
    late `prisma.product.deleteMany({})` block (and its redundant dynamic import).
- `apps/api/src/scripts/maintenance/clear-and-reseed-catalog.ts`
  - Import the shared purge instead of the local copy.

**Acceptance:** seed → use catalog (cart + order) → `npm run seed:reset` twice in a row succeeds.

---

## §3 — Service-path product seeding (P0, the single source of truth)

- New `apps/api/src/db/seed/product-seed-payloads.ts` (pure):
  - `readSeedDataset`, `resolveSeedColorHex`, denim size/SKU/variant builders,
  - `buildDenimJacketPayload(item, index, refs)` and `buildDenimJeansPayload(item, index, refs)`
    extracted from `clear-and-reseed-catalog.ts` (now the canonical catalog definitions),
  - measurement columns aligned with the seeded category contract (`Shoulder, Bust, Length,
Sleeve Length` — matches `seed-categories-men.ts:291` and the men's-tops convention, replacing the
    drifting `Chest`).
- New `apps/api/src/db/seed/seed-catalog-refs.ts`: `resolvePlatformStore()`, `resolveBrandBySlug()`,
  `resolveCategoryBySlug()` — `findFirstOrThrow`-style guards with actionable errors.
- Rewrite `seed-products-denim-jackets.ts`, `seed-products-denim-jeans.ts`,
  `seed-products-mock-catalog.ts`:
  - resolve refs (`Celebs Official` vendor, `Celebs Denim` brand, `men-denim-jackets`/`men-jeans`
    categories),
  - skip-if-exists by name (idempotent re-runs; legacy rows are rebuilt via `npm run seed:reset`),
  - call `ProductService.createProduct(payload, vendor.userId, vendor.id, vendor.shopName, 'SUPERADMIN')`,
  - add `require.main === module` runners so the `seed:products-*` npm scripts actually execute,
  - drop one-off legacy migrations (orphan `Men Denim Jeans` re-link, ad-hoc category creation).
  - Mock catalog gains color variants + real stock (it was publish-floor-invalid before).
- `clear-and-reseed-catalog.ts` now consumes the shared builders (no duplicated payload logic).
- `seed-brands.ts`: delete the retro-link `updateMany` block (N3) — products carry `brandId` from
  creation.

**Acceptance:** after a seed, `vendorId`/`brandId`/`createdBy` are non-null on all seeded products;
`ProductInventory` row count equals Σ (colour variants × sizes); two consecutive seeds are stable.

---

## §4 — Inventory race hardening (P2)

- `apps/api/src/modules/inventory/inventory.repository.ts`: conflict-safe create
  (`createMany({ skipDuplicates: true })` + `findUniqueOrThrow` by the composite key) replacing the
  plain `create`, so concurrent cart fallbacks cannot raise P2002.
- `inventory.service.ts` calls the hardened method.
- New unit spec `apps/api/src/db/seed/__tests__/product-seed-payloads.spec.ts`: measurement-column
  contract, positive stock, SKU matrix completeness, refs propagation, brand/tags/status.

---

## §5 — Out of scope (deliberate)

- Review-summary parity between `npm run seed` and `npm run clean:reseed` (metadata only).
- `seed:products-jackets-coats.ts` and `seed:3p-jackets.ts` stay as-is (already service-path).
- Denim-jacket price/stock constants now follow the `clean:reseed` canonical values.

## §6 — Verification

```bash
pnpm --filter shared-utils build         # @celebs/* are consumed from dist by apps/api
pnpm --filter api typecheck
pnpm --filter api lint
pnpm exec vitest run src/db/seed/__tests__/product-seed-payloads.spec.ts

# Manual (needs local DB):
npm run seed            # fails fast without superadmin, works after setup
npm run seed:reset      # twice in a row, with cart/order history present
npm run seed:products-denim-jackets   # standalone runner now executes
```

## §7 — Execution log (2026-10-16)

Commits on `fix/seed-service-parity`:

| Commit     | Scope                                                               |
| ---------- | ------------------------------------------------------------------- |
| `72f1b88a` | this brief                                                          |
| `1444c3c3` | §1 — platform-store guards (`PLATFORM_VENDOR_NOT_PROVISIONED`, 503) |
| `8e88485e` | §2 — FK-safe purge before the category wipe                         |
| `8a150b80` | §3 — catalog through `ProductService`, shared builders, mock fix    |
| `d4ec1eed` | §4 — `createInventoryIfAbsent`, payload-builder spec                |

Verified:

- `pnpm exec vitest run src/db/seed/__tests__/product-seed-payloads.spec.ts` → 7/7 green.
- Every file touched by this branch typechecks clean in both `tsconfig.app.json` and
  `tsconfig.spec.json`; the removed jeans-seed `dynamicData` error is gone.
- `pnpm typecheck` as a whole is still red from **pre-existing** errors this branch does not touch:
  `brand.controller` ×8, `category.controller` ×14, `platform-settings.controller` ×7,
  `media.controller` ×1, `media-proxy-security.spec` ×4, `tests/support/http-headers` ×2,
  `private-endpoints-cache.spec` ×1, `conditional-get-revalidation.spec` ×1.
- Still to run manually against a live Postgres + Redis: the three commands in the "Manual" block
  above (fresh-DB fail-fast, double `seed:reset` with cart/order history, standalone runner).
