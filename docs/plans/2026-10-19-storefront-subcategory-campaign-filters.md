# Storefront Filter Params — Subcategory Chips, Campaign Filter, Count Skip

**Date:** 2026-10-19
**Branch:** `feat/storefront-subcategory-campaign-filters` (stacked on `fix/mobile-stock-availability`)
**Origin:** corrected execution order Phase 1 (Contracts) + Phase 2 (API), items C4 / C5 / C6-step-1 of `docs/plans/2026-10-18-runbook-review-verdict-and-corrections.md`.

## Problem

Category shortcut chips return 0 products. Mobile sends the chip value as the
`tag` filter (`use-category-filters.ts`), the shortcut service emits
`filterValue: child.slug` — a category slug is never a tag value, so
`where.tags = { has: slug }` matches nothing. The campaign param does not exist
at all, and anonymous page-1 list reads run a redundant `count(*)` that no
storefront client consumes.

## Verified anchors

- `packages/shared-types/src/validators/product.validator.ts:229` — `productFilterSchema` has `tag`, no `subcategory`/`campaign`.
- `apps/api/src/modules/product/product-query.service.ts:288-290` — `where.tags = { has: filters.tag }`; `:263` — search OR `{ tags: { has: search } }`.
- `:167-170` — count runs on every non-cursor read; `:96-98` — `isPublicScope = !isElevated && !actor && !storeId && !isStoreManagement`.
- `apps/mobile/src/features/categories/hooks/use-category-filters.ts:58` — `tag: selectedStorefrontShortcutValue || undefined`.
- `apps/mobile/src/app/category/[slug].tsx:52-57` — renderer receives `config` (has `type`); callback currently drops it.
- `packages/shared-types/src/validators/category.validator.ts:97-102` — shortcut type enum contains `'tag'`, no `'campaign'`.
- `apps/web-admin/src/features/category/components/storefront-hero-config.tsx:51` — type dropdown offers `tag` ("Marketing Tags").
- `apps/api/src/modules/campaign/campaign.repository.ts:27-34` — `findBySlug` returns the campaign with enrolled `CampaignProduct` rows (`productId`).

## Decisions

1. **`subcategory` param (slug, subtree)** — resolved like `category`:
   `findFilterMatch(slug)` → `findDescendantIds` → AND-clause
   `OR[{categoryId in ids}, {subcategoryId in ids}]`. Both params AND together
   (chip inside root browse). Unknown slug → no clause (same as `category`).
2. **`campaign` param (slug)** — resolved via `CampaignRepository.findBySlug`;
   enrolled product ids become `{ id: { in: ids } }`. Unknown/inactive →
   `in: []` → empty result (honest). Public scope still forces `status = published`.
3. **`tag` filter is removed, not rejected** — Zod strips unknown keys
   (non-strict), so stale clients degrade to unfiltered lists, never errors
   (C6 impact matrix). Search OR drops the `tags.has` branch. The `tags`
   _column_ stays until the final cleanup phase.
4. **Count skip** — `total` is computed only when `!isPublicScope` (elevated,
   admin, vendor, authed scopes) and never for cursor pages. Anonymous
   storefront reads (mobile category grid, storefront home) omit `total`;
   verified no mobile/web consumer reads it. `PaginatedProductResponse.total`
   is already optional.
5. **Typed chips (mobile)** — the hook stores `{ type, value }`; the screen
   passes `shortcut.type` from the renderer config into the select handler.
   Mapping lives in one pure helper `shortcutFilterParams`:
   `subcategory` → `subcategory` param; `campaign` → `campaign` param;
   `attribute` / `collection` → no param (their filtering happens elsewhere
   or is not implemented yet — never silently mapped to the wrong axis).
6. **Shortcut enum** — `['subcategory','attribute','campaign','collection']`
   (`tag` out, `campaign` in). Web-admin dropdown swaps the `tag` option for
   `campaign`. DB rows are all `subcategory` (seed-managed), so no data
   migration.

## Files

- `packages/shared-types/src/validators/product.validator.ts` — schema fields.
- `packages/shared-types/src/validators/category.validator.ts` — shortcut enum.
- `apps/api/src/modules/product/product-query.service.ts` — tag removal,
  subcategory clause, campaign filter (`CampaignRepository`), count skip.
- `apps/mobile/src/features/products/types.ts` — `ProductFilterParams`.
- `apps/mobile/src/features/categories/hooks/use-category-filters.ts` — typed
  selection + `shortcutFilterParams`.
- `apps/mobile/src/app/category/[slug].tsx` — pass `shortcut.type`.
- `apps/web-admin/src/features/category/components/storefront-hero-config.tsx` — option swap.

## Tests

- NEW `apps/api/src/modules/product/__tests__/product-subcategory-campaign-filters.spec.ts`:
  subtree match, category+subcategory intersection, campaign enrolled-only,
  unknown campaign → empty, schema strips `tag` / parses `subcategory`+`campaign`.
- `product-pagination.spec.ts` — anonymous page-1 omits `total`; elevated keeps it.
- `product-inventory-pruning.spec.ts` — drop stale public `.total` asserts.
- NEW `apps/mobile/src/features/categories/hooks/__tests__/use-category-filters.spec.ts`:
  `shortcutFilterParams` mapping for subcategory / campaign / null / other.

## Acceptance (from the review doc)

- Chip tap sends `subcategory`; button result count > 0.
- `GET /products?campaign=<slug>` → only enrolled ids.
- Page-1 public list: no count; cursor pages unchanged; elevated responses keep `total`.

## Execution Log (2026-10-19)

- RED first: 6 failing API cases (subcategory/campaign stripped → unfiltered lists, `tag` not stripped, anonymous `total` present) and 4 failing mobile cases (`shortcutFilterParams is not a function`).
- Shipped: schema swap in shared-types (`tag` out; `subcategory` + `campaign` in), shortcut enum swap (`tag` → `campaign`), subcategory subtree clause in `applyCategoryFilters`, campaign id-set filter in new `applyCampaignFilter` (via `CampaignRepository.findBySlug`), search drops the `tags.has` branch, count skip (`shouldCount = !isCursorMode && !isPublicScope`).
- Mobile: typed chip selection — screen passes `shortcut.type`, hook stores `{ type, value }`, one pure mapper `shortcutFilterParams`; renderer and filter components untouched. Web-admin shortcut dropdown swaps the `tag` option for `campaign`.
- GREEN: new API spec 5/5; pagination 4/4; pruning 2/2; broad batch (product + storefront + storefront-shortcut + category) 31 files / 229 tests; mobile full suite 24 files / 239 tests; shared-types 9 files / 95 tests; web-admin 818/819 (1 long-running render spec flaked under full-suite concurrency; passes 5/5 in isolation and is unrelated to this diff).
- Typechecks: api app 0 errors; api spec tsc 37 (at baseline); mobile 0; web-admin 0 (`tsc -b --noEmit`). `packages/shared-types` dist rebuilt so built-package consumers (mobile, web-admin) see the new schema/enum.
- Adaptations: `product-inventory-pruning.spec.ts` dropped two stale public `.total` asserts (anonymous reads no longer count); `product-pagination.spec.ts` gained the anonymous-vs-elevated total contract test.
- Deviation: none from the plan. `getProducts` cache keys already include all filters, so `subcategory`/`campaign` reads cache per signature as before.
