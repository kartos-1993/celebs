# Seed Data: Festival Campaigns, Combo Bundles, and Catalogue Parity

**Date:** 2026-10-19
**Branch:** `feat/seed-data-parity` (stacked on `feat/storefront-shortcut-cache`)
**Origin:** corrected execution order — runbook PHASE 2 ("High-Quality Real Seed Data") with
the C10 corrections from `docs/plans/2026-10-18-runbook-review-verdict-and-corrections.md`.

## Problem

1. **Zero rows where the storefront needs content.** Live dev-DB check (2026-10-19):
   `Campaign=0`, `CampaignProduct=0`, `ComboBundle=0`, `ComboBundleItem=0`. The combo
   cart endpoint (C2, shipped `c7c07f44`) and the Phase 4 UI work have nothing to
   exercise.
2. **The runbook's Phase 2 samples target a schema that no longer exists** (see
   Corrections below) and are superseded by C10: no fixed UUIDs, no name-scanning,
   upserts by unique slug.
3. **C10 parity:** `products.json` holds 36 items (24 platform + 12 Brothers); the dev
   DB has **37 published**. The extra row — `Men's Autumn/Winter Fashion Casual Crew
Neck Solid Color Thermal Lined Pullover Long Sleeve Sweatshirt`
   (slug `...-029795-mwaa`, 3585, created 2026-10-18T15:23:49Z) — has **3 inventory
   rows, 0 cart items, 0 order items**. Re-seeds are not reproducible while it exists.
4. **`purgeAllTestData` deletes campaign/combo children but never the parents**
   (`purge-catalog.ts:47-48`): a `--reset` leaves slug-renamed, child-less husks of
   bundles/campaigns behind forever.

## Verified anchors (live DB + source)

- Dev DB (Supabase, `.env.development`): published `37`; all 36 dataset names present;
  `comboBundleItem/campaignProduct` counts `0`; the extra row's reference counts as
  above; the full catalogue (names, slugs, prices) captured for authoring.
- `db/schema.prisma`: `ComboBundle` 565-583, `ComboBundleItem` 585-595
  (`@@unique([bundleId, productId])`), `Campaign` 602-618, `CampaignProduct` 620-633
  (`@@unique([campaignId, productId])`, optional `discountType`/`discountValue` — the
  campaign's own override mechanism, "null means the product's own discountedPrice
  rules").
- `product.service.ts:772-785` — `generateUniqueSlug` appends `-<6 time digits>-<4
random chars>`. **DB product slugs are not reproducible from names**, so C10's
  "resolve products by slug" cannot mean authored slugs: resolve at runtime by
  **name** — the importer's own uniqueness contract (`seed-products.ts:284-292`
  skips by `name`, case-insensitive) — and upsert campaign/combo rows by **their own**
  unique slugs. Documented deviation.
- `readProductDataset()` is exported (`seed-products.ts:101`): the pure reference test
  validates against the exact dataset the importer writes.
- `ProductInventory.product` is `onDelete: Cascade` (`schema.prisma:196`);
  `CartItem.comboBundleId` is `onDelete: SetNull` (`schema.prisma:231-232`) and purge
  clears carts before anything else — parent deletes are FK-safe.
- Seed conventions: functions import the `prisma` singleton (no client parameter),
  use `resolve*` helpers that throw actionable errors (`seed-catalog-refs.ts`), guard
  runnable scripts with `require.main === module` (`seed-brands.ts` tail).

### Corrections applied to the runbook samples

- `Campaign` has no `description` / `displayPriority` → omit.
- `CampaignProduct` uses `discountType: 'PERCENTAGE'` + `discountValue` (Decimal),
  not `discountOverride` / `sortOrder`.
- `ComboBundleItem` fields are `bundleId` / `defaultQuantity` / `isRequired` — not
  `comboBundleId` / `quantity` / `sortOrder`; `ComboBundle` has no `sortOrder`.
- Product selection by `name contains 'Jacket'` is replaced by authored, validated
  product lists (C10).
- "Fewer than 5 products → warn and skip" is replaced by fail-loud resolution: a
  campaign/combo referencing an absent product is a silent storefront break; the
  error names the missing products (repo `resolve*` contract).

## Design

**A. `seed-campaigns.ts`** — authored `CAMPAIGN_SEED_SPECS` + pure
`buildCampaignRows(now)` (relative, evergreen windows; both campaigns active on every
seed run):

| slug                      | title                   | type     | theme   | window            | products                     | discount |
| ------------------------- | ----------------------- | -------- | ------- | ----------------- | ---------------------------- | -------- |
| `dashain-festive-dhamaka` | Dashain Festive Dhamaka | FESTIVAL | #D92525 | now−10d … now+14d | 8 outerwear/statement pieces | 20 %     |
| `tihar-lights-sale`       | Tihar Lights Sale       | FESTIVAL | #D97706 | now−4d … now+21d  | 6 layering/sweats pieces     | 15 %     |

Runtime: resolve names → `prisma.product.findMany({ where: { name: { in }, status:
'published' } })`; any missing name → throw one actionable error listing them; upsert
Campaign by slug, upsert `campaignProduct` by `[campaignId, productId]` with
`discountType: 'PERCENTAGE'`, `discountValue`.

**B. `seed-combos.ts`** — 4 authored combos, 2 items each, both discount branches
exercised (the C2 cart supports `PERCENTAGE` and `FIXED_AMOUNT`):

| slug                      | items                                                 | discount  |
| ------------------------- | ----------------------------------------------------- | --------- |
| `streetwear-duo-pack`     | fleece-lined denim jacket + distressed straight jeans | 25 %      |
| `winter-layering-bundle`  | oversized heavy hoodie + thermal-lined jeans          | 20 %      |
| `street-essentials-combo` | relaxed graphic tee + minimalist jeans                | FIXED 400 |
| `earth-tone-layers`       | old-money brown jacket + coffee-brown denim pants     | 15 %      |

Upsert bundle by slug; items via `deleteMany` + `createMany` (nothing references
`ComboBundleItem` rows — cart lines reference the bundle; no FK survives the swap).

**C. Wiring & reset**

- `seed/index.ts`: Step 6 `seedCampaigns()`, Step 7 `seedCombos()` — after Step 4
  products so references resolve.
- `package.json`: `seed:campaigns`, `seed:combos` following the existing script style.
- `purge-catalog.ts`: delete `comboBundle` and `campaign` **parents** after their
  children (carts are already purged by then).

**D. Catalogue parity (C10)**

Delete the one stray dev row (evidence above: not in the dataset, zero cart/order
references, 3 inventory rows cascade) so the dev DB equals the dataset equals what a
`--reset` reproduces. Recorded here before execution; the row is fully identified
above in case it needs recreating.

## Test plan — new `seed/__tests__/seed-campaigns-combos.spec.ts` (pure + integration)

1. **RED (pure)** — every product name referenced by any campaign or combo exists in
   `readProductDataset()` (typo/drift catcher).
2. **RED (pure)** — authored data sane: unique slugs across campaigns/bundles; each
   combo ≥ 2 items with distinct products; `PERCENTAGE` in (0,100), `FIXED_AMOUNT`
   > 0; `buildCampaignRows(now)` windows ordered `end > start` and covering `now`.
3. **RED (integration, test DB)** — fixture products for every referenced name →
   `seedCampaigns()` + `seedCombos()` → counts (2 campaigns / 14 links / 4 bundles /
   8 items) → run again → **identical counts** (idempotent upsert), discounts
   persisted.
4. **RED (integration)** — a missing product reference rejects with an actionable
   error naming it.
5. **RED (integration, reset path)** — seed → `purgeAllTestData()` → campaign, bundle,
   item, link **and product** counts all 0 (no FK error; parent delete is the new
   part) → re-run → counts restored.

## Acceptance

- New spec green; existing seed specs (`seed-products`, `seed-storefront-shortcuts`,
  `seed-logistics-locations`) unaffected; `apps/api` app tsc 0; spec tsc at the
  37-error baseline.
- Live (dev DB): both seeds run individually against the real 37-product catalogue —
  `Campaign > 0`, `ComboBundle > 0`; re-run leaves counts unchanged; stray product
  removed.
- No API/route changes; Phase 4 mobile UI consumes these rows later.

## Execution log (2026-10-19)

### RED first

`seed-campaigns-combos.spec.ts` against stubbed runners (authored data + pure
builders present; `seedCampaigns` / `seedCombos` throwing "not implemented"):

- 3/3 pure guards green from the start (dataset references, slug/discount sanity,
  campaign windows) — they guard authored data, not behavior.
- 3/3 behavioral tests failed on the missing DB path: `seedCampaigns is not
implemented yet.` (idempotency, reset path, and the missing-reference test —
  the last showed the stub message instead of the product-naming error).

### Fix

- `seed-campaigns.ts` / `seed-combos.ts`: authored specs + pure builders
  (`buildCampaignRow(s)`) + idempotent runners — Campaign upsert by slug,
  `campaignProduct` upsert by `[campaignId, productId]`; ComboBundle upsert by
  slug, items replaced wholesale (cart lines reference the bundle, never its item
  rows). Each runner has a `require.main` entrypoint like the other seeds.
- `seed-catalog-refs.ts`: `resolveProductsByNames` (one query; fails loud with
  every missing/unpublished name) + `requireResolvedProduct`.
- `purge-catalog.ts`: deletes the `comboBundle` / `campaign` **parents** after
  their children — a reset no longer leaves child-less husks.
- `index.ts` Steps 6/7 (after products, so references resolve) +
  `seed:campaigns` / `seed:combos` scripts.

### GREEN

- New spec **6/6**; whole `src/db/seed/__tests__` **49/50** (9 files) — the one red
  is the known pre-existing `seed-logistics-locations.spec.ts` case.
- `apps/api` app tsc **0**; spec tsc **37** (baseline — an intermediate run caught
  four strict-index accesses in the new spec at 41; fixed with a `seedSpecAt`
  guard, no non-null assertions).
- Live dev DB: stray product deleted (refs re-checked in-script: 0 cart / 0 order)
  → published **36 == dataset**; `npm run seed:campaigns` + `seed:combos` resolved
  every authored name against the real catalogue; **counts identical after the
  second run** (campaigns 2 / links 14 / combos 4 / items 8 / published 36); both
  campaigns verifiably open at run time; all four bundles active with the intended
  discount branches (25% / 20% / FIXED 400 / 15%).

### Notes

- **Deviation from C10's wording** (Design): "resolve products by slug" is not
  possible — `generateUniqueSlug` salts every slug at insert time. The stable
  authorable key is the dataset's unique `name` (what `seedProducts` is idempotent
  on); campaign/combo rows themselves upsert by their own unique slugs.
- **Deviation from the runbook sample**: warn-and-skip on missing products became
  one fail-loud error naming every absent product — a campaign that silently
  drops its content is worse than a failed seed.
- Runbook schema drifts corrected in-flight (`Campaign.description` /
  `displayPriority`, `CampaignProduct.discountOverride` / `sortOrder`,
  `ComboBundleItem.quantity` / `comboBundleId` / `sortOrder` do not exist).
