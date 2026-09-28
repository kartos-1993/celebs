# Code Review — Product Shipping & Warranty Feature

**Branch:** `feat/product-shipping-and-warranty`
**Date:** 2026-09-25 (audit) · remediation completed 2026-09-28
**Scope:** 51 changed files — 34 modified (`982 + / 168 −`) + 17 untracked (`1,356 lines`)
**Mode:** Review only. No source file was modified. This document is the sole artifact produced.

---

## 0. Remediation Status (added after remediation)

Everything below sections 1–10 describes the branch **as it was on 2026-09-25**. It is preserved unchanged as the historical baseline. This section records what the remediation waves actually changed, so the findings are not read as current defects.

### Verification after remediation

| Check                                      | Before                                            | After                                                                   |
| ------------------------------------------ | ------------------------------------------------- | ----------------------------------------------------------------------- |
| `web-admin` tests                          | 149 passing (shared pkgs never ran)               | **751 passing / 84 files**                                              |
| `api` tests                                | 536 passing / **20 failing**                      | **632 passing / 108 files**                                             |
| `mobile` tests                             | 2 spec files total                                | **204 passing / 19 files**                                              |
| `shared-types` / `shared-utils` tests      | not executed by any pipeline task                 | **29 / 5 files** and **47 / 5 files**, both wired into `turbo run test` |
| Typecheck                                  | never performed (`*.spec.ts` excluded everywhere) | **0 errors across all five packages**; 66 latent spec errors fixed      |
| Lint errors (`web-admin`, `api`, `mobile`) | 11 + 1                                            | **0**                                                                   |
| Prettier (changed files)                   | 16 of 50 failing                                  | **0 failing** (enforced by the pre-commit hook)                         |

### Resolved

- **B1** — `sku-generator.spec.ts` parses; both shared packages now have `test` scripts, so `turbo run test` executes them.
- **B2** — the unreachable shipping-validation block was removed.
- **B3** — migration `20260926000000_product_shipping_warranty_and_vendor_store_code` added and applied.
- **H1** — lint is clean; dead code removed (`generate-sku-helpers.ts`, duplicate `sanitize()`, dead re-exports, the two dead inventory branches).
- **H2** — all presenter paths route through one shared `validDiscount`; the API also re-checks against the stored price on update.
- **H3/H5** — payload paths, cover derivation, and barcode item building are single-sourced; the two barcode hooks now share one builder and one gate function.
- **H4** — one `ProductFormValues` definition, derived from the shared Zod schema.
- **H6** — dead inventory branches removed, duplicate-SKU guard throws, structured `errors[]` returned.
- **H7** — client collectors aligned to the Zod contract (name length, numeric coercion, integer checks, per-row discount, weight defaulting).
- **H8** — min-3-specifications hardened against trivial fills.
- **H9** — one `canPrintBarcodes(product, { isEditMode })` gate, preserving both original behaviors.
- **D1–D4 / §6.7–6.8** — shared action-contract type, shared variant helpers, `useSkuTable` decomposed (CC 31 → small units), the 200–330-line payload/hydrate functions decomposed, `.tsx` cap breaches split.
- **Mobile audit** — selection staleness, out-of-stock defaults, placeholder sentinels, discount math duplication, cart/checkout, wishlist fabrication, response-envelope error loss, query keys, and token/style/a11y sweeps.
- **20 API failures** — root cause was the CSRF origin guard (not RBAC) plus a hardcoded setup secret in a test; fixed in fixtures with zero assertion changes.

### Resolved in the second remediation pass (product journey + image pipeline)

- **Form value encoding was ambiguous** — hydration wrote flat dotted keys while React Hook Form always wrote nested, so the form held two representations of one field and the winner depended on key insertion order. All hydration now goes through one shared dotted-path writer: nested-only in the form, flat-only in the payload, one conversion at the boundary.
- **SKU cells rendered blank in edit mode for non-default axis names** — variant path prefixes were hardcoded to `Color`/`Size` instead of being resolved from the real axis keys (sanitised the same way the cells sanitise).
- **Sections reported "done" when merely error-free** — an empty Shipping & Warranty section read as complete. Replaced with a tri-state (`untouched` / `incomplete` / `complete`); Terms no longer hardcodes "never complete"; loading no longer renders as a user error; the completion percentage counts only genuinely finished sections.
- **Error storm on first load** — inline errors are now gated per field rather than per form, so touching one field no longer surfaces errors across unrelated sections.
- **Category switch left stale errors and a resurrected draft** — programmatic `shouldTouch` and the unawaited old-schema validation are gone, the draft autosave can no longer undo the discard, and a failed draft save is reported instead of failing silently.
- **Refetch discarded unsaved edits** — routine refetch no longer re-hydrates over the seller's in-progress changes.
- **Cover computed three different ways** — one exported `resolveCover` is now the single rule (`mainImages[0] ?? first colour image`), used by the presenters, order images, review tiles and the cart.
- **Gallery lost one image per save** — the admin view strips a duplicate swatch for display but was saving the stripped list; the payload now restores exactly the URL the view hides, and a round-trip test asserts byte-for-byte equality.
- **Colourless products could never publish** — the internal `Default` size-only carrier is no longer presented as a colour, the API reports an explicit `hasColorAxis`, and the publish floor requires a cover only when there is no colour axis. Colourless products create one inventory row per size and work for stock, checkout and in-stock.
- **Cart rows could show a different picture than the storefront** — the cart overwrote the canonical cover with the line's own colour gallery (the inverse of the canonical order). The cart now resolves one canonical cover live from the current product, declared on the shared `CartItemHydrated` type as `cover?: string`.
- **Layout shift and focus defects** — the SKU matrix no longer reserves global error height; errors are announced accessibly; `subcategoryId`, cover, SKU paths and nested dynamic fields focus correctly.
- **Misc** — CM/IN conversion precision and copy, fake `Rs. 0` / "in stock" placeholders, the dead colour-rename control, a duplicated shipping anchor, and the colour-overflow notice vanishing under its own validation.

### Known remaining (deliberate, documented in code)

| Item                                               | Where                                                             | Why it remains                                                                                                                                                     |
| -------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Canonical SKU key-builder unification              | `inventory.repository.ts`                                         | Two key dialects coexist (canonical for SKU matching, raw lowercase for row identity). Verified they never compare across, so it is consolidation, not a live bug. |
| `dynamic-product-form.tsx` at 430 lines            | web-admin §4 150-line cap                                         | Pre-existing. Decomposition needs new sub-component files and its own test wave.                                                                                   |
| Two active presenters                              | `product.presenter.ts` (222) + `product-presenters.ts` (537)      | Outputs are aligned and both route through the same image resolver, but the split is structural duplication that a future change can still desynchronise.          |
| Hardcoded hex colors in mobile                     | ~19 files, e.g. `order-card-badge.tsx`, `payment-method-card.tsx` | Pre-existing and app-wide. The product-journey files are clean, but the mobile-wide token sweep is a separate mechanical change.                                   |
| `freeItems` field removed                          | SKU matrix tables                                                 | The field was collected and validated but never persisted; it is now removed rather than silently discarded. **User-visible change.**                              |
| Free-shipping threshold `999` vs `3000`            | mobile cart vs checkout                                           | Both surfaces keep their current value in one shared location; the single correct number is a product decision.                                                    |
| Thermal sticker print CSS                          | `barcode-sticker.tsx`                                             | `text-[7pt]` / `font-black` are physical 50×30mm print constraints and need a documented §7 exemption, not a token swap.                                           |
| Crop output format and quality                     | `media-crop/crop-canvas.ts`                                       | A product + infra decision (format, quality, max dimensions), not a code defect.                                                                                   |
| Strict Zod rules                                   | `colorCode`, `url()`-only images, required category UUIDs         | Deliberately not tightened — the client does not yet satisfy them; changing them would reject current payloads.                                                    |
| Zod resolver migration                             | `use-product-form.ts`                                             | The form still uses manual client-side collectors aligned to the schema; migrating to `@hookform/resolvers` is a structural change with its own wave.              |
| `index.tsx` barrel under the add-product component | web-admin FSD layer rule                                          | FSD disallows barrels; `add-product/index.tsx` (151 lines) still needs renaming and folding.                                                                       |

---

## 1. Executive Summary

The feature is functionally delivered and the visible test suites are green, but the change set is **the clearest multi-agent artifact in this repository**: the same business rules were independently re-implemented in as many as six layers, and the resulting copies have already drifted apart.

The headline numbers:

| Signal                                                  | Result                                         |
| ------------------------------------------------------- | ---------------------------------------------- |
| Typecheck (`web-admin`, `api`, `mobile`, 2 shared pkgs) | ✅ all pass                                    |
| Unit tests (`web-admin`)                                | ✅ 149 / 149                                   |
| Unit tests (`api`, new specs)                           | ✅ 7 / 7                                       |
| Unit tests (`shared-utils`)                             | ❌ **fails to compile** — never executed by CI |
| ESLint (`web-admin`)                                    | ❌ **11 errors**, 11 warnings                  |
| ESLint (`api`)                                          | ❌ **1 error**                                 |
| Prettier (50 TS files in scope)                         | ❌ **16 of 50 fail**                           |
| DB migration for 11 new columns                         | ❌ **absent** (acknowledged)                   |

**Why "tests pass" is misleading here:** `pnpm test` runs `turbo run test`, and only `packages/rbac` declares a `test` script. Neither `packages/shared-types` nor `packages/shared-utils` declares one — so the rewritten `sku-generator.spec.ts` and the brand-new `shipping-warranty.validator.spec.ts` are **never executed by any CI command**. When run manually, `sku-generator.spec.ts` fails immediately with a parse error (stray `}` at line 44). Separately, `tsconfig.base.json` sets `"exclude": ["**/*.spec.ts"]`, so no typecheck anywhere in the monorepo looks at spec files. The result is a file that is simultaneously broken, untypechecked, and invisible to the test runner.

### The three architectural failures

1. **Every business constant was copied, not imported.** `0.3`, `'FLYER_SMALL'`, `'NO_WARRANTY'` appear as raw literals in **9, 9 and 12 places respectively** across 7–9 files spanning Prisma schema, Zod, controller payloads, presenter, form payload builder, form hydrator, form validator and two UI components. There is no single source of truth.

2. **Validation exists twice and the two copies disagree.** `shippingDetailsSchema` / `warrantyDetailsSchema` in `@celebs/shared-types` are correct, tested — and **dead code** (only their own test imports them). The live path uses a hand-rolled `collectShippingErrors()`. Because the API controller really does call `createProductSchema.parse(req.body)`, the Zod side is the actual contract — meaning the UI enforces _different_ rules than the server and will happily accept payloads the server rejects.

3. **Two agents solved the same problem twice and got different answers.** The barcode feature has two independent hooks that both convert a product into print items. They disagree on the store name, on `'default'` filtering, and on the fallback SKU format. Printing the same product from the edit page and from the product list yields **different stickers**.

### Verdict

Not shippable as-is — not because of functional breakage, but because the duplication is now load-bearing. Every future edit to shipping/warranty rules requires touching 6–9 files in lockstep, and half of them are invisible to both the compiler and the test runner. The good news: the decompositions that were done (`collectSkuItems`, `sync-dynamic-values`, `showErrors` gating, the mobile `'Standard'` → `'Default'` fix) are genuinely well-executed and should be kept.

**Findings:** 3 BLOCKER · 9 HIGH · 25 MEDIUM · 19 LOW/NIT (56 findings)

Of those, 6 were added by the function-duplication and readability measurements in §6.7–6.8; the rest of the measured smells were checked against `HEAD` and found to **predate this branch**, so they are recorded as context rather than charged to the change set.

---

## 2. Baseline Evidence

Commands actually executed during this review:

| Command                                    | Result                                     |
| ------------------------------------------ | ------------------------------------------ |
| `pnpm --filter web-admin typecheck`        | ✅ exit 0                                  |
| `pnpm --filter web-admin test`             | ✅ 18 files, 149 tests                     |
| `pnpm --filter web-admin lint`             | ❌ 22 problems (11 errors / 11 warnings)   |
| `pnpm --filter api typecheck`              | ✅ exit 0                                  |
| `pnpm --filter api lint`                   | ❌ 1 error                                 |
| `pnpm --filter api` → new specs via vitest | ✅ 2 files, 7 tests                        |
| `pnpm --filter mobile typecheck`           | ✅ exit 0                                  |
| `packages/shared-types` → `npx vitest run` | ✅ 5 files, 29 tests (manual only)         |
| `packages/shared-utils` → `npx vitest run` | ❌ **1 file failed to parse, 0 tests ran** |
| `npx prettier --check` (50 TS files)       | ❌ 16 failed                               |

Graph: `C-celebs-celebs` re-indexed in full before review (9,087 nodes / 37,840 edges, 0 skipped, 38 `parse_partial` files — none in scope).

---

## 3. File Verdict Table (all 51 files)

| #   | File                                                              | Verdict      | Top finding                                                                  |
| --- | ----------------------------------------------------------------- | ------------ | ---------------------------------------------------------------------------- |
| 1   | `apps/api/src/db/schema.prisma`                                   | ISSUE        | 11 Product columns + `storeCode @unique` with no migration                   |
| 2   | `apps/api/src/modules/inventory/inventory.repository.ts`          | **CRITICAL** | Provably dead lookup branches; fallback chain silently mints a random SKU    |
| 3   | `apps/api/src/modules/product/product-payloads.ts`                | ISSUE        | 11 consecutive conditional spreads; Prettier fails                           |
| 4   | `apps/api/src/modules/product/product-presenters.ts`              | **CRITICAL** | SKU `discountedPrice` falls back to product-level discount with no clamp     |
| 5   | `apps/api/src/modules/product/repositories/product.repository.ts` | PASS         | —                                                                            |
| 6   | `apps/api/.../__tests__/inventory-sku-resolution.spec.ts`         | ISSUE        | Lint + Prettier fail; random-SKU path untested                               |
| 7   | `apps/api/.../__tests__/product-shipping-warranty.spec.ts`        | PASS         | —                                                                            |
| 8   | `packages/shared-types/src/types/product.ts`                      | ISSUE        | 11 fields all optional though DB/Zod both carry defaults                     |
| 9   | `packages/shared-types/src/validators/product.validator.ts`       | ISSUE        | Shipping rules defined twice within the same file; Prettier fails            |
| 10  | `packages/shared-types/.../shipping-warranty.validator.spec.ts`   | ISSUE        | Tests dead production code; never run by CI                                  |
| 11  | `packages/shared-utils/src/utils/sku-generator.ts`                | ISSUE        | Unreachable `STD` branch; third SKU generator added                          |
| 12  | `packages/shared-utils/.../sku-generator.spec.ts`                 | **BLOCKER**  | Syntax error (line 44); never executed                                       |
| 13  | `apps/web-admin/.../utils/hydrate-product-form.ts`                | **CRITICAL** | Writes unsanitized paths readers never read; 12-line no-op block             |
| 14  | `apps/web-admin/.../utils/add-product-payload.ts`                 | ISSUE        | `as` casts bypass Zod; 3-level nested ternary; import-sort error             |
| 15  | `apps/web-admin/.../utils/add-product-validation.ts`              | ISSUE        | Parallel hand-rolled validator; hardcoded business rule `3`                  |
| 16  | `apps/web-admin/src/features/product/types.ts`                    | **HIGH**     | Duplicate `ProductFormValues` definition                                     |
| 17  | `apps/web-admin/.../hooks/use-submission-state.ts`                | PASS         | —                                                                            |
| 18  | `apps/web-admin/.../fields/components/sku-table-utils.ts`         | PASS         | Clean `collectSkuItems` decomposition                                        |
| 19  | `apps/web-admin/.../fields/components/use-sku-table.ts`           | ISSUE        | Lint error (dead import); collision-prone SKU style ref                      |
| 20  | `apps/web-admin/.../add-product/index.tsx`                        | ISSUE        | Double `isEditMode` guard; barcode wiring                                    |
| 21  | `apps/web-admin/.../add-product/add-product-form-body.tsx`        | ISSUE        | Section render gate not shared with validation gate                          |
| 22  | `apps/web-admin/.../add-product/add-product-header.tsx`           | ISSUE        | Barcode gating differs from list page; import-sort error                     |
| 23  | `apps/web-admin/.../add-product/product-submission-sidebar.tsx`   | PASS         | —                                                                            |
| 24  | `apps/web-admin/.../add-product/use-add-product-submit.ts`        | **BLOCKER**  | 12-line shipping block is unreachable dead code                              |
| 25  | `apps/web-admin/.../add-product/sync-dynamic-values.ts`           | ISSUE        | Imports the wrong duplicate `ProductFormValues`; import-sort error           |
| 26  | `apps/web-admin/.../components/product-form-sidebar.tsx`          | PASS         | —                                                                            |
| 27  | `apps/web-admin/.../components/submission-progress-checklist.tsx` | PASS         | Dual named + default export (NIT)                                            |
| 28  | `apps/web-admin/.../components/shipping-warranty-section.tsx`     | ISSUE        | Prettier fails; magic anchor id shared with submit hook                      |
| 29  | `apps/web-admin/.../components/shipping-dimensions-card.tsx`      | ISSUE        | Magic `0.3` and `/5000` inline; Prettier fails                               |
| 30  | `apps/web-admin/.../components/warranty-policy-card.tsx`          | ISSUE        | Raw `<select>` ×2 (Radix mandate); Prettier fails                            |
| 31  | `apps/web-admin/.../barcode/barcode-print-modal.tsx`              | ISSUE        | Raw `<select>`; `text-[10px]` below `text-xs` floor; Prettier fails          |
| 32  | `apps/web-admin/.../barcode/barcode-sticker.tsx`                  | ISSUE        | `pt`-scale type below documented floor; render-time mutation; Prettier fails |
| 33  | `apps/web-admin/.../barcode/barcode-utils.ts`                     | ISSUE        | Table verified correct; silent char-skip hazard; Prettier fails              |
| 34  | `apps/web-admin/.../barcode/thermal-print-batch.tsx`              | ISSUE        | Injects global `body *` print CSS; duplicate item type                       |
| 35  | `apps/web-admin/.../barcode/use-barcode-items.ts`                 | **HIGH**     | Divergent clone of `use-product-barcode-modal`; import-sort error            |
| 36  | `apps/web-admin/.../barcode/index.ts`                             | ISSUE        | Banned barrel file with **zero importers**; export-sort error                |
| 37  | `apps/web-admin/.../barcode/__tests__/barcode-print.spec.tsx`     | ISSUE        | Import-sort error                                                            |
| 38  | `apps/web-admin/.../hooks/use-product-barcode-modal.ts`           | **HIGH**     | Second, disagreeing barcode item builder; Prettier fails                     |
| 39  | `apps/web-admin/.../components/manage-product.tsx`                | ISSUE        | **Fails Prettier** — committed bypassing lint-staged; unrelated churn        |
| 40  | `apps/web-admin/.../manage-product-dialogs.tsx`                   | ISSUE        | Second barcode modal wiring path                                             |
| 41  | `apps/web-admin/.../manage-product-row-actions.tsx`               | ISSUE        | Barcode gated on `published` here, `isEditMode` on edit page                 |
| 42  | `apps/web-admin/.../manage-product-table-row.tsx`                 | PASS         | —                                                                            |
| 43  | `apps/web-admin/.../manage-product-table.tsx`                     | PASS         | —                                                                            |
| 44  | `apps/web-admin/.../__tests__/product-form-sidebar.spec.tsx`      | ISSUE        | Import-sort error                                                            |
| 45  | `apps/mobile/.../product-variant-selector.tsx`                    | PASS         | Redundant `?.` after a truthiness guard (NIT)                                |
| 46  | `apps/mobile/.../use-product-detail-cart.ts`                      | PASS         | Correct `'Standard'` → `'Default'` inventory-key fix                         |
| 47  | `apps/mobile/.../utils/stock.ts`                                  | PASS         | Correct dummy-size filtering with fallthrough                                |
| 48  | `apps/mobile/.../stock-sizes.spec.ts`                             | PASS         | —                                                                            |
| 49  | `apps/web-admin/.../__tests__/add-product-payload.spec.ts`        | ISSUE        | Prettier fails                                                               |
| 50  | `apps/web-admin/.../__tests__/add-product-validation.spec.ts`     | PASS         | —                                                                            |
| 51  | `apps/web-admin/.../__tests__/hydrate-product-form.spec.ts`       | ISSUE        | Pins two contradictory path conventions; Prettier fails                      |

**Roll-up:** 14 PASS · 29 ISSUE · 3 HIGH · 3 CRITICAL · 2 BLOCKER = **51**. (Both the table above and the per-file headings in §8 are counted independently and agree.)

---

## 4. Blockers

### B1 — `sku-generator.spec.ts` does not compile and no CI command ever runs it

`packages/shared-utils/src/utils/__tests__/sku-generator.spec.ts:44`

```ts
43:   });
44: });      // ← stray closing brace, leftover from deleting the old describe block
```

Manual run confirms:

```
Unexpected "}"  ... File: sku-generator.spec.ts:44
Test Files  1 failed (1)   Tests  no tests
```

Two independent escape hatches let this through:

1. `packages/shared-utils/package.json` declares only `build` / `lint` / `typecheck` — **no `test` script**. Root `"test": "turbo run test"` therefore skips it. Same for `packages/shared-types`.
2. `tsconfig.base.json` → `"exclude": ["node_modules", "**/*.spec.ts", "dist"]`, so `npx tsc --noEmit` inside the package also exits 0.

**Impact:** `cleanVariantCode` and `generateRetailSku` — code invoked from the SKU auto-generate button — have **zero effective test coverage**, and the coverage you believe you have does not exist. The 48 added lines of test are decorative.

**Fix:** delete line 44; add `"test": "vitest run"` to both shared packages; remove `**/*.spec.ts` from the typecheck exclude (or add a dedicated `tsconfig.spec.json`).

---

### B2 — Dead validation block in `use-add-product-submit.ts`

`apps/web-admin/src/features/product/components/add-product/use-add-product-submit.ts:146-157`

```ts
const shippingErrors = collectShippingErrors({ values: currentValues });
if (shippingErrors.length > 0) {
  toast({ title: 'Shipping & Warranty Required', description: shippingErrors[0], ... });
  document.getElementById('product-section-package')?.scrollIntoView(...);
  return;
}
```

This is unreachable. The evidence chain:

1. `buildSidebarSections()` (called at line 100) already folds `collectShippingErrors({ values })` into the `shipping` section — `add-product-validation.ts:411-415`.
2. That section's status is `shippingErrors.length === 0` — `add-product-validation.ts:454-455`.
3. Line 107 finds `firstInvalidSection = activeSections.find(s => !s.status)`; line 109 returns at line 143 when one exists.

So if `collectShippingErrors` returns anything, control has **already returned at line 143**. By the time line 146 executes, every section including `shipping` is valid, so `shippingErrors` is always `[]`.

**Impact:** `collectShippingErrors` runs **twice** per submit for zero benefit; the dedicated toast, the distinct error title, and the scroll-into-view are all dead. Anyone "fixing" a shipping bug at line 146 will see no effect and waste time.

**Fix:** delete lines 146-157 entirely. The sidebar path already reports shipping errors with an anchor of `product-section-package`.

---

### B3 — No database migration for the schema change

`apps/api/src/db/schema.prisma:91` and `:710-725`

11 new `Product` columns (`package_weight_kg` … `is_non_returnable`) plus `VendorProfile.store_code` (`@unique`) were added. `apps/api/src/db/migrations/` contains nothing newer than `20260922000000_session_refresh_leeway`, and a grep for `package_weight_kg` / `store_code` across all migration SQL returns zero hits.

_Acknowledged by the author — recorded here for completeness, no action requested in this review._

---

## 5. High-Severity Findings

### H1 — Both linters fail; the refactor left dead code behind

```
web-admin:  11 errors (10 × simple-import-sort, 1 × unused-imports)
api:         1 error  (simple-import-sort)
```

The substantive one is not cosmetic:

```
apps/web-admin/src/features/product/fields/components/use-sku-table.ts
  16:3  error  'collectSkuPaths' is defined but never used  unused-imports/no-unused-imports
```

`use-sku-table.ts:165` switched to `collectSkuItems`, but the old `collectSkuPaths` import was left on line 16. The function itself is now only consumed by its own test (`sku-table-utils.spec.ts:111-123`) — i.e. **the test suite exclusively tests a function production no longer uses**, while the linter is red.

Additionally, **16 of 50 in-scope TS files fail `prettier --check`** — including `manage-product.tsx`, `product-payloads.ts`, `hydrate-product-form.ts`, and every barcode component. `lint-staged` is configured (`package.json:180-187`) to run `prettier --write` + `eslint --fix` on commit, so this state proves commits were made bypassing the hook. That is the direct cause of the import-order errors.

**Fix:** run `prettier --write` + `eslint --fix` across the change set; remove the unused import; either delete `collectSkuPaths` (and its test block) or keep it as the public API and drop the `use-sku-table` duplication.

---

### H2 — Admin detail can emit `discountedPrice > price` per SKU

`apps/api/src/modules/product/product-presenters.ts:351-355`

```ts
price: typeof matched?.price === 'number' ? matched.price : price,
discountedPrice:
  typeof matched?.discountedPrice === 'number'
    ? matched.discountedPrice
    : optNum(formatted.discountedPrice),   // ← product-level discount
```

Two problems:

1. **No clamp.** The list presenter guards this with `validDiscount(price, record.discountedPrice)` (`product-presenters.ts:69`); `formatAdminDetail` has no equivalent. A SKU priced 500 on a product with `price = 1000` and `discountedPrice = 800` returns `price: 500, discountedPrice: 800`.
2. **Discount is inherited, not per-SKU.** A SKU with no discount of its own is rendered as discounted because the product-level value is substituted. Every row in the admin SKU table then shows a strikethrough price that does not exist.

**Fix:** reuse `validDiscount()` here, and decide explicitly whether product-level discounts should cascade to SKUs. If they should, apply it deliberately with a documented rule — not as a `??` fallback on a read path.

---

### H3 — `hydrateProductForm` writes paths that nothing reads

`apps/web-admin/src/features/product/utils/hydrate-product-form.ts:238-285`

Every reader builds paths with `pathFor()`:

```ts
// sku-table-utils.ts:10-12
export function pathFor(...parts: string[]): string {
  return ['sku', 'variants', ...parts.map(sanitize)].join('.');
}
```

where `sanitize` = `sanitizeVariantKey`, which rewrites `.` → `_`, `[` → `(`, `]` → `)` (`add-product-helpers.ts:53-60`). Validators build paths the same way (`add-product-validation.ts:163,174`).

`hydrateProductForm` instead interpolates **raw, unsanitized** values and **guesses the axis key** by writing several prefixes:

| Branch       | Prefixes written | Keys used                                         |
| ------------ | ---------------- | ------------------------------------------------- |
| color + size | 2                | `${color}.${size}`, `Color.${color}.Size.${size}` |
| color only   | 3                | `${color}`, `color.${color}`, `Color.${color}`    |
| size only    | 3                | `${size}`, `size.${size}`, `Size.${size}`         |
| default      | 1                | `sku.default.*`                                   |

Three separate defects:

1. **No sanitization.** A colour or size label containing `.` or `[` produces `sku.variants.Color.Red.Blue` on write and `sku.variants.Color.Red_Blue` on read. The hydrated value is silently dropped — the admin opens an existing product and sees an empty cell.
2. **Branch asymmetry.** The two-axis branch has **no lowercase `color…size` variant** while both one-axis branches do. If the schema's colour field key is lowercase, single-axis hydration works and two-axis hydration silently writes only into a never-read key.
3. **Axis-less prefix** (`sku.variants.${color}.${size}`) can never match `sku.variants.Color.Red.Size.M`, and `pruneOrphanVariantPaths` (`add-product-payload.ts:26-58`) deletes anything not in its `allowed` set built from real axis keys — so it is written, then discarded on submit.

The three copies per branch are also a maintenance trap: the five assignment lines (`price`, `specialPrice`, `stock`, `sellerSku`, `available`) are duplicated verbatim **four times** in this file (lines 244-248, 257-261, 270-274, 278-284).

**Fix:** derive `pathFor(axisKey, value)` from the same `variantMeta` the reader uses; delete the prefix lists; collapse the 4 × 5 assignments into one small helper taking the canonical prefix.

---

### H4 — `ProductFormValues` is defined twice

```ts
// hooks/use-product-form.ts:13
export type ProductFormValues = Partial<z.infer<typeof baseProductSchema>> &
  Record<string, unknown>;

// types.ts:12   ← identical text, different module
export type ProductFormValues = Partial<z.infer<typeof baseProductSchema>> &
  Record<string, unknown>;
```

Imports are split: `sync-dynamic-values.ts:2` takes the `types.ts` copy; `use-add-product-submit.ts`, `use-product-form.ts`, `use-product-draft.ts`, `dev-autofill.ts`, `add-product-form-body-types.ts` take the hook copy.

`apps/web-admin/AGENTS.md` §1 is explicit: _"`types.ts`: Feature-specific UI state types (**never duplicate** `@celebs/shared-types`)"_.

**Impact:** the two are currently structurally identical, so TypeScript is satisfied. The moment either drifts, `sync-dynamic-values.ts` will typecheck against a different `ProductFormValues` than every caller — and nothing will fail loudly.

**Fix:** delete `types.ts:12`; import from `hooks/use-product-form` (or move the type to `types.ts` and re-export from the hook — but keep exactly one definition).

---

### H5 — Two barcode item builders that disagree

|                        | `use-product-barcode-modal.ts` (edit page)   | `use-barcode-items.ts` (list page)                       |
| ---------------------- | -------------------------------------------- | -------------------------------------------------------- |
| storeName              | `product.brand \|\| 'CELEBS • NEW ROAD HUB'` | `product.vendorName \|\| 'CELEBS • NEW ROAD HUB'`        |
| `'default'` filter     | ✅ filters `val.toLowerCase() !== 'default'` | ❌ no filter                                             |
| empty-options fallback | `` `CLB-${brand.slice(0,3)}-STD` ``          | `` `CLB-${vendor.slice(0,3)}-${product.id.slice(-6)}` `` |
| data source            | passed-in `AdminProductDetail`               | fetches detail via `useQuery`                            |
| private `SkuEntry`     | declared at line 7                           | declared at line 10 (duplicate)                          |

Consequences:

- A product with a `Default` colour variant prints `Red / M` from the list but `Default / Red / M` (or a joined junk label) from the edit page.
- The fallback SKU differs **for the same product**, so barcode scans resolve to different codes depending on the print origin.
- `product.brand` vs `product.vendorName` puts different text in the sticker header.

Both live in the same feature, ~80 lines apart. This is the single clearest "two agents, two answers" artifact in the change set.

**Fix:** extract one `buildBarcodeItems(product, detail)` pure function into `barcode/`, have both hooks delegate to it, and delete both private `SkuEntry` declarations (use `AdminProductDetail['skus']`).

---

### H6 — Inventory SKU resolution contains provably dead logic and a silent random-SKU path

`apps/api/src/modules/inventory/inventory.repository.ts:141-196`

**Dead branch #1 — lines 154-158:**

```ts
const valueKey = values.join(':::');
skuMap.set(valueKey, code);

// Also index individual values for single-axis lookups
const firstVal = values[0];
if (values.length === 1 && firstVal) {
  skuMap.set(firstVal, code); // ← values.length===1 ⇒ join === values[0]
}
```

When `values.length === 1`, `values.join(':::')` **is** `values[0]`. This block re-writes the identical key. It can never add an entry.

**Dead branch #2 — line 193:**

```ts
const sku =
  skuMap.get(rowKey) ||
  (rowVals.length === 1 && firstRowVal ? skuMap.get(firstRowVal) : undefined) ||
  ...
```

When `rowVals.length === 1`, `rowKey === rowVals[0] === firstRowVal`. If line 192 returned falsy, line 193 queries the same key and returns falsy again. Unreachable in effect.

**Silent data corruption — line 196:**

```ts
skuMap.get('') ||
  singleFallbackSku ||
  generateSku({ brandPrefix: 'c', department: departmentHint });
```

When nothing matches, a **random 18-character SKU is minted** and written into `ProductInventory`, while the real `skuCode` stays in the `Product.skus` JSON array. No error, no log, no reconciliation. The two SKU stores diverge permanently for that row, and the admin detail presenter will read `inv.sku` (the random one) as the authoritative code.

**Five-deep implicit precedence** (`rowKey` → `firstVal` → `''` → `singleFallbackSku` → random) with no named constants, no comments explaining the intended order, and no test covering anything below level 2.

**Also:** `singleFallbackSku` (`:137-139`) — `if (!singleFallbackSku || s.isDefault) singleFallbackSku = code` — resolves to _last default, else first SKU_, an order-dependent rule stated nowhere.

**Also:** `if (rows.length === 0) return;` at line 224 executes **after** the published-removal guard but before any delete. Removing every variant from a draft therefore leaves all old `ProductInventory` rows in place.

**Fix:** delete the two dead branches; replace the chain with a named 2-step resolution and **throw** (or log loudly) on no-match instead of minting; extract the `':::'` key builder to a single shared helper (see §6.2).

---

### H7 — Validation implemented twice with divergent rules

| Rule                      | Zod (`shippingDetailsSchema`) — **dead** | `collectShippingErrors()` — **live**                 |
| ------------------------- | ---------------------------------------- | ---------------------------------------------------- |
| `packageWeightKg` missing | `.default(0.3)` → **passes**             | → **error**                                          |
| `packageWeightKg` type    | must be `number` (string fails)          | `Number()` coerces strings                           |
| dimensions                | `.positive().optional().nullable()`      | positive check, but **`break`s after first bad dim** |
| `packagingType`           | **enum-validated**                       | **not validated at all**                             |
| `warrantyPeriod`          | `.max(100)`                              | **no length check**                                  |
| `warrantyPolicy`          | `.max(2000)`                             | **no length check**                                  |
| warranty period required  | not expressed                            | ✅ required when warranty offered                    |

The API controller does `createProductSchema.parse(req.body)` (`product.controller.ts:39`) and `updateProductSchema.parse` (`:198`), both built on `baseProductSchemaFields`, which carries the same 11 fields. So **Zod is the real contract** and the UI is a second, weaker opinion. A user can type a 5,000-character warranty policy, pass the UI, and receive a 400 from the server with a Zod path the error mapper may not map to a field.

Note the recursion problem: `product.validator.ts` defines the rules **twice in the same file** — once in `shippingDetailsSchema`/`warrantyDetailsSchema` (lines 88-106, unused) and again inline in `baseProductSchemaFields` (lines 149-157, used). Three copies total including the UI.

**Fix:** delete `shippingDetailsSchema` / `warrantyDetailsSchema` (or compose `baseProductSchemaFields` from them), and have `collectShippingErrors` be a thin wrapper that calls `shippingDetailsSchema.safeParse` / `warrantyDetailsSchema.safeParse` and maps issues to messages — one source of truth, one test suite.

---

### H8 — The `"min 3 specifications"` rule exists only in the browser

`apps/web-admin/src/features/product/utils/add-product-validation.ts:379-388`

```ts
const minSpecsRequired = Math.min(3, groupedFields.details.length);
```

A magic `3`, defined nowhere else in the repo — not in Zod, not in the API, not in a config. The API will accept a product with 0 specification attributes that the UI refuses to submit. The rule also lives inside a 479-line function, so it cannot be unit-tested in isolation.

**Fix:** promote to a named exported constant (or schema-level refinement) shared with the API; extract the computation into a pure function.

---

### H9 — Barcode gating rules contradict each other

| Surface                                                                     | Condition                |
| --------------------------------------------------------------------------- | ------------------------ |
| Product list (`manage-product-row-actions.tsx:65`)                          | `status === 'published'` |
| Edit page (`add-product-header.tsx:36` + `use-product-barcode-modal.ts:11`) | `isEditMode` only        |

A draft product's barcodes are printable from its own edit page but the menu item is absent from the list. Additionally `index.tsx:60` calls `useProductBarcodeModal(product, isEditMode)` while the button at `index.tsx:106` is already guarded by `isEditMode &&` in the header — the same condition enforced twice at two layers, which is how the two rules drifted apart in the first place.

**Fix:** one exported predicate, e.g. `canPrintBarcodes(product)`, used by both surfaces.

---

## 6. Cross-Cutting Analysis

### 6.1 Constant duplication map

| Literal                | Occurrences | Files                                                                                                                                                                                                                                                    |
| ---------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0.3` (default weight) | **9**       | `schema.prisma:713` · `product.validator.ts:89,149` · `product-payloads.ts:49` · `product-presenters.ts:403` · `add-product-payload.ts:401` · `hydrate-product-form.ts:293` · `shipping-dimensions-card.tsx:14,24`                                       |
| `'FLYER_SMALL'`        | **9**       | `schema.prisma:717` · `product.validator.ts:93,153` · `product-payloads.ts:53` · `product-presenters.ts:407` · `add-product-payload.ts:405` · `hydrate-product-form.ts:306` · `warranty-policy-card.tsx:26,29`                                           |
| `'NO_WARRANTY'`        | **12**      | `schema.prisma:722` · `product.validator.ts:100,156` · `product-payloads.ts:56` · `product-presenters.ts:411` · `add-product-payload.ts:408` · `hydrate-product-form.ts:309` · `add-product-validation.ts:315,316` · `warranty-policy-card.tsx:41,44,51` |

**30 raw literals for 3 business decisions**, spread across all four layers of the stack. Changing the default package weight from 0.3 kg to 0.5 kg requires a 9-file sweep, and a missed file produces a silent, per-layer inconsistency.

`shippingPackagingTypeSchema` and `warrantyTypeSchema` already exist as Zod enums — they should be imported everywhere instead of re-typed as string literals.

### 6.2 The `':::'` algorithm — 3 independent implementations

```
inventory.repository.ts:151   values.join(':::')     (build SKU index)
inventory.repository.ts:188   rowVals.join(':::')    (build inventory row key)
product-presenters.ts:341     expected.join(':::') === optValues.join(':::')   (match inventory → SKU)
```

Plus 4 template-literal uses of the same separator in the same file (`inventory.repository.ts:209, 213, 234, 249`).

The three implementations normalize differently: the repository filters dummies _before_ sorting (`:146`), the presenter filters via `isColorDummy`/`isSizeDummy` flags and pushes only non-dummies (`:336-338`), and neither shares code. **If the two ever disagree, the API writes SKU A to inventory while the admin UI displays SKU B's price.**

**Fix:** one exported `buildVariantKey(values: string[]): string` (normalization + sort + join) used by repository, presenter, and the published-variant guard.

### 6.3 The `'default'` sentinel — 5 comparison styles

```
inventory.repository.ts:125     isDummy = !val || val === 'default'          (input pre-lowercased)
product-presenters.ts:326-327   color.toLowerCase() === 'default'
hydrate-product-form.ts:219,225 rawColor.toLowerCase() !== 'default'
add-product-payload.ts:182,217,231   colorValue === 'default'   ← CASE-SENSITIVE
mobile/stock.ts:22              s.trim().toLowerCase() !== 'default'
use-product-barcode-modal.ts:42 val.toLowerCase() !== 'default'
```

`add-product-payload.ts` is the outlier: it compares **without lowercasing**. A stored colour variant named `Default` (which the presenter and repository both treat as dummy) is treated as a _real_ colour by the payload builder — so it gets `resolveColorCode`, its own gallery handling, and a non-default label. The three layers disagree about whether a value is a placeholder.

**Fix:** export `isPlaceholderVariant(value: string): boolean` from `@celebs/shared-types` and use it in all 6 places.

### 6.4 Contract flow for the 11 new fields

```
UI input (RHF register, no zodResolver)
  → collectShippingErrors()          [copy A: hand-rolled]
  → buildProductPayload()            [cast: `as ShippingPackagingType`, `?? 0.3`]  [copy B]
  → HTTP body
  → createProductSchema.parse()      [copy C: baseProductSchemaFields]  ← the real gate
  → buildProductCreateData()         [copy D: `?? 0.3` again]
  → Prisma (@default(0.3))           [copy E: schema]
  → formatAdminDetail()              [copy F: `?? 0.3`]
  → hydrateProductForm()             [copy G: `?: 0.3`]
```

Seven hops, four of them re-asserting a default. Note the casts at copy B — `values.packagingType as ShippingPackagingType` — which defeat the compiler rather than parsing the value. Since `shippingPackagingTypeSchema` is already imported into this file's package, `shippingPackagingTypeSchema.safeParse(values.packagingType)` costs one line and removes the cast.

Also note **`useProductForm` intentionally has no `zodResolver`** (documented at `use-product-form.ts:16-21` for a legitimate reason — a resolver suppressed dynamic-field errors). The consequence is that _nothing_ on the client parses with Zod, so every Zod schema in `product.validator.ts` is either dead (the two composite objects) or only enforced server-side. That makes `collectShippingErrors`'s existence understandable — but it should still delegate to the Zod schema rather than restate its rules.

### 6.5 Type-safety audit

| Location                          | Issue                                                                                           |
| --------------------------------- | ----------------------------------------------------------------------------------------------- |
| `add-product-payload.ts:405`      | `values.packagingType as ShippingPackagingType`                                                 |
| `add-product-payload.ts:408`      | `values.warrantyType as WarrantyType`                                                           |
| `hydrate-product-form.ts:306`     | `product.packagingType as ShippingPackagingType`                                                |
| `hydrate-product-form.ts:309`     | `product.warrantyType as WarrantyType`                                                          |
| `add-product-payload.ts:77`       | `values: Record<string, unknown>` — whole payload builder untyped                               |
| `product-presenters.ts:317,323`   | `as Array<Record<string, unknown>>` on both branches                                            |
| `product-presenters.ts:362`       | `skus = rawSkus as AdminProductDetail['skus']` — unsound upcast                                 |
| `use-product-barcode-modal.ts:35` | `product.skus as SkuEntry[]`                                                                    |
| `use-barcode-items.ts:34`         | `detail?.skus as SkuEntry[]`                                                                    |
| `product.service.ts:384-390`      | inline structural SKU type, omits `isDefault` from the type though the runtime value carries it |

Every `as` on a Zod-derived type is a place where an invalid value passes silently until the server rejects it.

### 6.6 AGENTS.md compliance (web-admin)

| Mandate                                     | Status                                                                                                                                                                                     |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| §1 No barrel files                          | ❌ `barcode/index.ts` exists (and has **zero importers**)                                                                                                                                  |
| §1 `types.ts` never duplicates shared-types | ❌ `types.ts:12`                                                                                                                                                                           |
| §3 Zod schemas from `@celebs/shared-types`  | ⚠️ schemas exist but UI doesn't use them (§6.4)                                                                                                                                            |
| §4 `.tsx` max 150 lines                     | ✅ all pass (largest `.tsx` = 148)                                                                                                                                                         |
| §4 `.tsx` exports only components           | ✅ (interface exports are type-only)                                                                                                                                                       |
| §5 Radix primitives, no raw controls        | ❌ 3 raw `<select>`: `warranty-policy-card.tsx:23,38`, `barcode-print-modal.tsx:84`                                                                                                        |
| §7 no text below `text-xs`                  | ❌ `barcode-print-modal.tsx:102` → `text-[10px]`                                                                                                                                           |
| §7 no arbitrary size classes                | ⚠️ `barcode-sticker.tsx` uses `text-[6pt]`, `[6.5pt]`, `[7pt]`, `w-[50mm]`, `h-[9.5mm]` — print-specific, **needs a documented exemption** under §7's exemption clause rather than silence |
| §11 no nested JSX ternaries                 | ✅ none in new code (the 3-level ternary in `add-product-payload.ts:230-237` is in TS, not JSX — still a readability problem)                                                              |
| §11 zero magic numbers                      | ❌ `shipping-dimensions-card.tsx:22` → `/5000` volumetric divisor; `add-product-validation.ts:381` → `3`                                                                                   |

### 6.7 Function & block duplication (measured)

Method: 40 non-test source files normalised (whitespace collapsed, string bodies masked to `'S'`), scanned for runs of 3–4 identical lines repeated within a file and 4-line runs shared across files; top-level symbol names cross-checked for collisions. **Every cluster below was then checked against `git show HEAD:<file>` to establish whether this branch introduced it** — several apparent findings turned out to predate the change set.

**Attribution legend:** `NEW` = introduced by this branch · `GROWN` = pre-existing but amplified by this branch · `PRE` = pre-existing, unchanged (out of scope).

| #   | Duplication cluster                                  | Origin                              |
| --- | ---------------------------------------------------- | ----------------------------------- |
| D1  | 8-prop row-action contract in 5 interfaces           | `PRE` — **pre-existing, unchanged** |
| D2  | 4 presenter return blocks rebuild the same fields    | `PRE` — structure pre-existing      |
| D3  | `syncDynamicTitleAndBrand` = same 6-line block twice | `NEW` — new file                    |
| D4  | `SkuEntry` interface declared in 2 barcode hooks     | `NEW` — both files new              |

**D1 — 8-prop row-action contract declared in 5 interfaces (measured, but NOT this branch's doing).**

`onToggleActivation: (id: string) => void` appears in 5 separate `interface …Props` blocks:

| Interface                      | File                               | In change set? |
| ------------------------------ | ---------------------------------- | -------------- |
| `ManageProductCardProps`       | `manage-product-card.tsx:21`       | no             |
| `ManageProductCardsProps`      | `manage-product-cards.tsx:11`      | no             |
| `ManageProductRowActionsProps` | `manage-product-row-actions.tsx:9` | yes            |
| `ManageProductTableProps`      | `manage-product-table.tsx:20`      | yes            |
| `ManageProductTableRowProps`   | `manage-product-table-row.tsx:22`  | yes            |

Across those 5 interfaces there are only **19 distinct prop names, 17 declared in ≥2 interfaces**; 8 are declared in **all five**: `isSellerOrStaff`, `canCreate`, `canEdit`, `onSubmit`, `isSubmitPending`, `onToggleActivation`, `isTogglePending`, `onSetArchiveTarget`.

**Why this is recorded but not counted as a finding of this review:** `git diff HEAD` on all three in-scope files contains **zero `+` lines adding any of these props** — the contract predates the branch and the branch neither added to nor refactored it. The 2 untouched files confirm it. The smell is real (adding a 9th row action needs 5 edits, and each interface independently permits the prop to be absent, so a missed edit is invisible), and `extends ManageProductActions` is the right fix — but filing it against this change set would be misattribution. Listed in P4 as an optional, out-of-scope cleanup.

**D2 — `product-presenters.ts` rebuilds the same 4 field mappings (structure pre-existing; growth is not).**

Four return blocks (`formatStorefrontCard` :199, `formatStorefrontDetail` :249, `formatAdminProductListItem` :279, `formatAdminDetail` :365) total **104 lines, of which 16 lines are duplicated across ≥2 blocks**. Present in all four:

```ts
id: str(formatted.id),
name: str(formatted.name),
discountedPrice: optNum(formatted.discountedPrice),
```

Also in ≥2: `brand: nullStr(formatted.brand)`, `cover: resolveCover(...)`, `ratingAverage`, `ratingCount`, `inStock`, the `category`/`subcategory` fallback pairs, `status`, `vendorId`, `vendorName`.

`git show HEAD:…/product-presenters.ts` already contained **4 occurrences of `id: str(formatted.id)`** — the four-block shape is pre-existing. What the branch added is **63 lines to `formatAdminDetail` (57 → 120 lines, CC16 → CC36)**, i.e. it grew the largest of the four blocks and did so by extending them independently rather than through a shared extractor.

This matters beyond tidiness: **H2's unclamped `discountedPrice` lives inside this repeated block**, so a fix applied to one presenter silently misses the other three.

**D3 — `syncDynamicTitleAndBrand` is the same 6-line block twice. (`NEW`)**

`sync-dynamic-values.ts` is a **new file** in this change set. Its `:13-18` and `:21-26` differ only in the target field name:

```ts
if (form.getValues('name') !== newValue) {
  form.setValue('name', newValue, { shouldDirty: true, shouldValidate: true });
}
```

Trivially a `syncField(field, candidateKeys)` helper. It is also **unbounded by design** — `['name','productname','title']` and `['brand','productbrand']` are hand-maintained alias lists with no shared definition, so a third synced field means a third copy-paste.

**D4 — `SkuEntry` interface declared twice with an identical shape. (`NEW`)**

`use-barcode-items.ts` and `use-product-barcode-modal.ts` **are both new files**, and both declare `interface SkuEntry { skuCode?: string; code?: string; selectedOptions?: Record<string,string>; price?: number; … }` (3 shared 4-line runs found). This is the same divergence already recorded as **H5** — the duplication is the _cause_, not a separate symptom.

**D5 — Negative results (recorded so they aren't re-litigated).**

- **No duplicated top-level symbol names** across the 51 files — zero name collisions, no shadowing.
- **No `.tsx` exceeds the 150-line cap** (largest = 148, `add-product/index.tsx`).
- Beyond D1–D4 there is no cross-file duplicate of genuine _logic_. The 8 shared 4-line runs in `manage-product/*` are prop-interface blocks (D1) and the barcode runs are D4. The `barcode-utils.ts` `x8` hits are the Code128 data table repeating its own formatting, which is correct.
- `':::'`, `0.3`, `FLYER_SMALL`, `NO_WARRANTY`, `'default'` and the duplicate `ProductFormValues` are already counted in §6.1–6.3 and H4 — **not double-counted here**.

**Net: only D3 and D4 are attributable to this change set**, and both are the mechanical consequence of an agent duplicating a pattern rather than extracting it — the same failure mode as §6.1's constants, at the type level instead of the value level.

### 6.8 Readability & complexity (measured)

Method: regex-estimated cyclomatic complexity per top-level function (comments/strings stripped, `?.` and `??` discounted so optional chaining is not counted as a ternary). **Treat these as estimates, not `eslint-complexity` output** — but they are computed identically across all 57 functions, so the _relative_ ranking is trustworthy.

**Against `apps/web-admin/AGENTS.md` §4 ("CC must not exceed 8") and `apps/api/AGENTS.md` §12 (refactor-first above 8):**

| Metric                 | Count        |
| ---------------------- | ------------ |
| Functions analysed     | 57           |
| **CC > 8**             | **28 (49%)** |
| CC > 15                | 12           |
| Length > 80 lines      | 11           |
| **Length > 150 lines** | **6**        |
| `.tsx` > 150 lines     | 0 ✅         |

|  CC | Lines | Function                                                 |
| --: | ----: | -------------------------------------------------------- |
| 123 |   271 | `hydrateProductForm` · `hydrate-product-form.ts:45`      |
|  99 |   326 | `buildProductPayload` · `add-product-payload.ts:88`      |
|  42 |   216 | `useSkuTable` · `use-sku-table.ts:26`                    |
|  38 |   181 | `useProductDetailCart` · `use-product-detail-cart.ts:30` |
|  37 |   178 | `useAddProductSubmit` · `use-add-product-submit.ts:38`   |
|  36 |   120 | `formatAdminDetail` · `product-presenters.ts:300`        |
|  32 |    49 | `resolveDepartmentCode` · `sku-generator.ts:20` (`PRE`)  |
|  29 |    92 | `buildProductUpdateData` · `product-payloads.ts:63`      |
|  24 |   103 | `collectPricingErrors` · `add-product-validation.ts:84`  |

**Before/after the branch — who owns the complexity:**

Re-measured the same four functions at `HEAD`:

| Function              | At `HEAD`   | After branch     | Delta            |
| --------------------- | ----------- | ---------------- | ---------------- |
| `hydrateProductForm`  | CC93 / 199L | **CC123 / 271L** | **+30 CC, +72L** |
| `formatAdminDetail`   | CC16 / 57L  | **CC36 / 120L**  | **+20 CC, +63L** |
| `buildProductPayload` | CC89 / 293L | **CC99 / 326L**  | +10 CC, +33L     |
| `useSkuTable`         | CC41 / 203L | CC42 / 216L      | +1 CC, +13L      |

Two honest conclusions from that table:

1. **The repo did not become non-compliant because of this branch** — all four were already far above the CC8 ceiling at `HEAD`. `useSkuTable` (+1 CC) and `resolveDepartmentCode` (untouched) are pre-existing conditions and are **not** findings against this change set.
2. **The branch nonetheless made it materially worse**, and one case is squarely its own: `formatAdminDetail` **more than doubled**, CC16 → CC36 and 57 → 120 lines, because the shipping/warranty work extended the admin detail presenter by copy. `hydrateProductForm` absorbed the single largest increase (+30 CC, +72 lines) — which is unsurprising, since H3 says those added lines write paths nothing reads.

**Two kinds of complexity here, and they need different responses:**

1. **Complexity that hurts (and partly grew here)** — `hydrateProductForm` (CC123 / 271 lines) and `buildProductPayload` (CC99 / 326 lines) are the two worst in the change set _and_ the two files carrying **H3** (unsanitised paths) and **H2** (unclamped discount). They are mutually inverse (write-into-form vs read-from-form) with no shared path vocabulary. A table-driven `pathFor`/axis map would collapse both the CC and the path-mismatch bug class at once — and would have prevented the +72 lines this branch added. Their size is also why the 12-line no-op block at `hydrate-product-form.ts:294-305` survived review.

2. **Complexity that is data shaped as code (pre-existing)** — `resolveDepartmentCode` (CC32 in 49 lines) is seven `if (a || b || c)` keyword tests. It is _readable_: one outcome per branch, commented. Its CC is an artifact of encoding a lookup table as conditionals. Reformatting as `const DEPT_RULES: [string[], string][]` would drop CC to ~2. **This function was not modified by the branch**, so it is a general-maintenance note, not a finding of this review.

**Nesting.** Measured as control-flow depth (`if`/`for`/`while`/`catch`/arrow-block/ternary indentation), **10 of 40 files reach depth ≥5; 3 reach depth 7**: `barcode-print-modal.tsx:110` (`NEW` file), `manage-product-dialogs.tsx:57` and `manage-product-table-row.tsx:95` (both `PRE` — checked against `HEAD`, the branch added only barcode wiring to those two files, not the handlers). So the depth-7 count is a pre-existing property of the manage-product components; only the barcode modal is this change set's. (A naive indentation scan reports 260 lines ≥7 levels, but nearly all of those are Prisma `select:` and object-literal indentation — **not** a readability violation, and not counted against the change set.)

**Line length.** 17 lines exceed 120 chars. Worst offenders are attribute soup, not logic:

|                       Chars | Location                                                                              | Origin  |
| --------------------------: | ------------------------------------------------------------------------------------- | ------- |
|                         231 | `barcode-sticker.tsx:33` — `<div className="w-[50mm] h-[30mm] p-[2mm] …">`            | `NEW`   |
|                         206 | `warranty-policy-card.tsx:27` and `:42` — two near-identical `<Select>` class strings | `NEW`   |
| 170 / 161 / 143 / 143 / 142 | `warranty-policy-card.tsx:71,78,64,85` — inline `Checkbox`/`Textarea` handlers        | `NEW`   |
|                         153 | `inventory.repository.ts:259` — template-literal error message                        | `GROWN` |

`warranty-policy-card.tsx` is a **brand-new 93-line file** that accounts for **6 of the 17** over-long lines. It is the one place in the change set where the JSX itself resists review: 5 controls each carrying a 120–200-char `className` plus an inline handler, so no reader can see the form's structure without horizontal scrolling. Extracting a local `<PolicyRow>` addresses line length, the duplicated class strings, _and_ the raw-`<select>` §5 violation in one move.

**Magic-string load** (raw literals matching `sku.*` / `variants.*` / `product-section-*` / domain sentinels): `default` ×14, `NO_WARRANTY` ×11, `FLYER_SMALL` ×7, `STD` ×4, `sku.default.*` ×11 across 4 distinct keys, `product-section-*` ×6 across 3 anchors. Already tracked in §6.1; the readability consequence is that **the same `'sku.default'` prefix is spelled inline at each of those 11 sites** rather than via the `pathFor()` reader — the same root cause as H3.

**Overall:** readability is _not_ broadly poor. `.tsx` length discipline holds with **zero** breaches of the 150-line cap, there are no nested JSX ternaries, no fallback cascades, no symbol collisions and no duplicated function bodies; 14 files carry no findings at all (§3). What this branch contributes is: **`formatAdminDetail` doubling in size, `hydrateProductForm` growing by 72 lines, two new files that copy a pattern instead of extracting it (D3, D4), and one new 93-line component written as inline attribute soup.** The concentration is real but the blast radius is narrower than the raw CC numbers suggest — which is why the backlog rates this P4, behind the correctness work.

---

## 7. Test-Quality Review

9 test files changed/added. Judged on whether they would _fail_ if the code were wrong.

| File                                  | Verdict                                   | Reasoning                                                                                                                                                                                                                                                                              |
| ------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sku-generator.spec.ts`               | ❌ **does not run**                       | Syntax error; no `test` script (B1)                                                                                                                                                                                                                                                    |
| `shipping-warranty.validator.spec.ts` | ⚠️ **tests dead code**                    | Exercises `shippingDetailsSchema`/`warrantyDetailsSchema`, which no production file imports. 7 passing tests on unused code.                                                                                                                                                           |
| `hydrate-product-form.spec.ts`        | ⚠️ **pins two contradictory conventions** | `:101` asserts `sku.variants.Color.Blue.Size.M` (capital) while `:205` asserts `sku.variants.size.S` (lowercase) — for the same axes. Neither test asserts the axis-less prefix, so 1 of 3 writes per branch is untested and extra wrong prefixes can be added freely without failing. |
| `inventory-sku-resolution.spec.ts`    | ⚠️ **happy path only**                    | 5 tests: default, size-only, matrix, draft-update, published-lock. **No test** for the no-match path (line 196 random mint), duplicate defaults, colour-label == size-label collision, or the two dead branches. The lock tests are genuinely load-bearing.                            |
| `add-product-validation.spec.ts`      | ✅ **good**                               | 8 new tests including both directions of the min-3 rule and both sidebar status transitions.                                                                                                                                                                                           |
| `add-product-payload.spec.ts`         | ✅ **good**                               | Pins the new default-SKU branch and the `default` colour image rule.                                                                                                                                                                                                                   |
| `product-shipping-warranty.spec.ts`   | ✅ **good**                               | True DB round-trip for create + update of all 11 fields.                                                                                                                                                                                                                               |
| `product-form-sidebar.spec.tsx`       | ✅ **good**                               | Tests all three `showErrors` states, including the "no errors on initial load" regression case.                                                                                                                                                                                        |
| `stock-sizes.spec.ts`                 | ✅ **adequate**                           | 37 lines covering the new filtering.                                                                                                                                                                                                                                                   |
| `barcode-print.spec.tsx`              | ⚠️ thin                                   | 67 lines; import-order lint error; does not assert against a golden barcode pattern.                                                                                                                                                                                                   |

**Net:** the specs that exist are mostly reasonable — the problem is that 2 of them are unrunnable or target dead code, and the two riskiest new code paths (SKU fallback chain, barcode encoding) are the least covered.

---

## 8. Per-File Findings

Severity: **BLOCKER** > **HIGH** > **MEDIUM** > **LOW** > **NIT**. Categories: `correctness` · `type-safety` · `duplication` · `architecture` · `dead-code` · `naming` · `test-quality` · `performance`.

### `apps/api/src/db/schema.prisma` — ISSUE

- **BLOCKER / correctness / :91, :710-725** — 11 Product columns + `VendorProfile.storeCode @unique` with no migration. _(Acknowledged by author.)_
- **LOW / duplication / :713,717,722** — `@default(0.3)` / `"FLYER_SMALL"` / `"NO_WARRANTY"` are the first of 30 literal copies (§6.1).
- **NIT / naming / :711** — comment `// Shipping & Logistics Physical Specifications` groups 7 fields; `warrantyType` is `String` (non-null) while `packagingType` is `String?` (nullable) despite both having defaults — inconsistent nullability for sibling fields with identical semantics.

### `apps/api/src/modules/inventory/inventory.repository.ts` — CRITICAL

- **HIGH / dead-code / :154-158** — single-element index block is a provable no-op (`join(':::')` === element).
- **HIGH / dead-code / :193** — second provable no-op in the fallback chain.
- **HIGH / correctness / :196** — silent random SKU minting on no-match; diverges `ProductInventory.sku` from `Product.skus[].skuCode` with no log or error.
- **HIGH / correctness / :191-196** — 5-level implicit precedence with no named steps and no tests below level 2.
- **MEDIUM / correctness / :224** — `if (rows.length === 0) return;` before any delete leaves stale inventory rows when all variants are removed on a draft.
- **MEDIUM / naming / :137-139** — `if (!singleFallbackSku || s.isDefault)` implements "last default else first SKU" with no comment.
- **MEDIUM / architecture / :108-114** — 5 positional parameters, two of which are inline structural types (`skus?: Array<{...}>`), violating `AGENTS.md` §5 "Zero Lax Parameter Typing".
- **MEDIUM / duplication / :151,188,209,213,234,249** — `':::'` separator hardcoded 6× (§6.2).
- **MEDIUM / duplication / :125** — local `isDummy` helper, 1 of 5 sentinel implementations (§6.3).
- **LOW / readability / :264** — `(options?.isPublished ? existing.sku : row.sku) || existing.sku` is redundant with the throw at :252-263 and, per `AGENTS.md` §12, should be a named boolean.

### `apps/api/src/modules/product/product-payloads.ts` — ISSUE

- **MEDIUM / duplication / :104-133** — 11 consecutive `...(x !== undefined ? { x } : {})` spreads (~30 lines of pure boilerplate). A `pickDefined(obj, keys)` helper reduces this to 3 lines.
- **MEDIUM / duplication / :49,53,56** — 3 more `0.3` / `'FLYER_SMALL'` / `'NO_WARRANTY'` copies (§6.1). Note `input.packageWeightKg ?? 0.3` is now redundant: Zod's `.default(0.3)` already guarantees the value at the controller.
- **LOW / test-quality / —** — no test covers `buildProductUpdateData`'s new conditional-spread behaviour (e.g. that an explicit `undefined` does _not_ clear a stored value).
- **NIT / style / whole file** — fails `prettier --check`.

### `apps/api/src/modules/product/product-presenters.ts` — CRITICAL

- **HIGH / correctness / :351-355** — SKU `discountedPrice` inherits the product-level discount with no `validDiscount()` clamp; can emit `discountedPrice > price` (H2).
- **HIGH / duplication / :329-342** — independent 3rd implementation of the `':::'` matcher (§6.2). Normalization differs from the repository's.
- **MEDIUM / correctness / :358** — `isDefault: idx === 0` discards the `isDefault` flag that `add-product-payload.ts:284` persisted (`builtSkus.length === 0`). Two sources of truth for the same field.
- **MEDIUM / correctness / :322-363** — branch A (inventories present) synthesizes `skus`; branch B (`:361`) passes stored `skus` through untouched — so `isDefault` semantics differ depending on whether inventory rows exist.
- **MEDIUM / duplication / :403,407,411** — 3 more default copies (§6.1).
- **LOW / type-safety / :317,323,362** — three `as` casts, including an unsound upcast at `:362`.
- **LOW / correctness / :351** — `price` falls back to the product-level price when no SKU matches, masking a missing SKU price as a valid one.
- **MEDIUM / duplication / :199,249,279,365** — the 4 return blocks rebuild the same field mappings (16 of their 104 lines repeated across ≥2 blocks; `id`/`name`/`discountedPrice` in all four). The four-block structure **predates this branch**, but this branch grew `formatAdminDetail` by 63 lines rather than extracting `baseProductFields()` (D2, §6.7). The H2 clamp at `:351-355` therefore has to be applied in 4 places.
- **MEDIUM / readability / :300** — `formatAdminDetail` went **CC16 → CC36 and 57 → 120 lines** in this branch (§6.8): the clearest instance of the change set extending a presenter by copy rather than by shared helper. Over the AGENTS.md §12 threshold either way.

### `apps/api/src/modules/product/repositories/product.repository.ts` — PASS

- **LOW / performance / :45-53** — `inventories` is added via `include` (not `select`-scoped at the relation level) on the admin detail path. Fields are individually `select`ed inside the relation, which is correct; just confirm the projection isn't duplicated in `product-projections.ts` (`:56, :85, :177` declare the same relation three times).

### `apps/api/src/modules/inventory/__tests__/inventory-sku-resolution.spec.ts` — ISSUE

- **HIGH / test-quality / —** — no coverage of the no-match/random-mint path (:196), duplicate defaults (:137), or collision scenarios. The two dead branches (:154, :193) are invisible to this suite.
- **MEDIUM / test-quality / :119-139, :141-157** — draft-update and published-lock tests _are_ load-bearing and well-constructed (they assert the thrown `AppError`).
- **LOW / style / :1** — `simple-import-sort` lint error; also fails Prettier.

### `apps/api/src/modules/product/__tests__/product-shipping-warranty.spec.ts` — PASS

- **LOW / test-quality / —** — genuine DB round-trip covering create and update of all 11 fields. The strongest test in the change set. One gap: no assertion that an _omitted_ field persists the schema default.

### `packages/shared-types/src/types/product.ts` — ISSUE

- **MEDIUM / type-safety / :140-150** — all 11 new fields optional on `AdminProductDetail` even though `formatAdminDetail` always returns `packageWeightKg`, `packagingType`, `isFragile`, `hasBatteryOrLiquid`, `warrantyType`, `isNonReturnable` (non-optional in practice). Consumers must therefore re-default values that are already guaranteed → which is exactly why `hydrate-product-form.ts:290-312` exists.
- **NIT / naming / —** — fields are appended after `rejectionFields` and before `createdAt`, i.e. grouped by "when the agent added them" rather than by domain.

### `packages/shared-types/src/validators/product.validator.ts` — ISSUE

- **HIGH / duplication / :88-106 vs :149-157** — shipping/warranty rules defined **twice in one file**: the named `shippingDetailsSchema`/`warrantyDetailsSchema` (unused) and inline in `baseProductSchemaFields` (used).
- **HIGH / dead-code / :88-106, :115-118** — `shippingDetailsSchema`, `warrantyDetailsSchema`, `ShippingDetailsType`, `WarrantyDetailsType` have **zero production consumers** (verified by grep).
- **MEDIUM / correctness / :149** — `.optional().default(0.3)` — the `.optional()` is redundant given `.default()`, and the pattern is repeated on 8 fields. It also means the server silently coerces "no weight supplied" to 0.3 while the UI treats it as a hard error (§6.4).
- **NIT / style / whole file** — fails `prettier --check`.

### `packages/shared-types/src/validators/__tests__/shipping-warranty.validator.spec.ts` — ISSUE

- **HIGH / test-quality / —** — all 7 tests target `shippingDetailsSchema`/`warrantyDetailsSchema`, which no production file imports. The suite validates an artefact that does not participate in the request path.
- **MEDIUM / test-quality / —** — never executed by `pnpm test` (no `test` script in the package).
- **LOW / test-quality / —** — no test asserts the _divergence_ from `collectShippingErrors` (e.g. that Zod accepts a missing weight while the UI rejects it).

### `packages/shared-utils/src/utils/sku-generator.ts` — ISSUE

- **MEDIUM / dead-code / :131-136** — `if (variantCodes.length > 0) … else parts.push('STD')` — the `else` is unreachable because `cleanVariantCode` returns `'STD'` (never falsy) for empty/all-symbol input, and `.filter(Boolean)` therefore never removes anything.
- **MEDIUM / duplication / :70 vs :117** — a **second, format-incompatible SKU generator** added alongside the existing one: `generateSku` → `cm2608140051059585` (18-char, documented as Code-128 Subset C compatible); `generateRetailSku` → `CLB-URF-00RT-BLK-L` (dashed, Code-128-B). The file header (:1-11) still claims the compact format is "the" retail standard.
- **LOW / correctness / :117-120** — no uniqueness guarantee: two products whose names share a first word produce identical `styleRef` → identical SKUs. The function is used to _replace_ `generateCollisionProofBaseSku`, whose name is the entire point.
- **NIT / style / :104** — double blank line; file fails Prettier.
- **NIT / readability / :20-68** — `resolveDepartmentCode` is CC≈32 in 49 lines, 7th-highest in the change set. Unlike the others it is _legible_ (one outcome per branch, commented): the complexity is a lookup table encoded as conditionals, fixable as `const DEPT_RULES: [keywords[], code][]` → CC ~2. **Not attributable to this branch** (function unchanged at `HEAD`) — a general-maintenance note recorded in §6.8, not a finding of this review.

### `packages/shared-utils/src/utils/__tests__/sku-generator.spec.ts` — **BLOCKER**

- **BLOCKER / correctness / :44** — stray `});`; file does not parse (B1).
- **HIGH / test-quality / —** — never run: no `test` script in `packages/shared-utils`, and `tsconfig.base.json` excludes `**/*.spec.ts` from typecheck.
- **MEDIUM / test-quality / :33-42** — the `cleanVariantCode` cases are good (8 boundary cases), but nothing tests `generateRetailSku` for **collision** (same `styleRef` + same options → same SKU).

### `apps/web-admin/.../utils/hydrate-product-form.ts` — CRITICAL

- **HIGH / correctness / :238-285** — writes unsanitized paths that `pathFor()` readers never produce; axis-key guessing with 2/3/3/1 prefixes per branch; two-axis branch missing its lowercase variant (H3).
- **HIGH / duplication / :244-248, :257-261, :270-274, :278-284** — the same 5 assignments duplicated 4×.
- **MEDIUM / dead-code / :294-305** — 12 lines of identity expressions: `product.packageLengthCm !== undefined && product.packageLengthCm !== null ? product.packageLengthCm : undefined` ≡ `product.packageLengthCm`. Same for width and height. These do nothing.
- **MEDIUM / duplication / :290-312** — 24 lines re-defaulting values the presenter already defaulted (§6.1, §6.4).
- **MEDIUM / duplication / :219,225** — two more `'default'` sentinel comparisons (§6.3).
- **MEDIUM / readability / :45** — **CC≈123 / 271 lines — the most complex function in the change set**, 15× the AGENTS.md §4 ceiling. Already CC93/199L at `HEAD`; **this branch added +30 CC and +72 lines** (§6.8). Its size is why the 12-line no-op block at `:294-305` survived review, and it is the inverse of `buildProductPayload` — the two share no path vocabulary, which is H3's root cause (P4 item 30).
- **LOW / type-safety / :306,309** — `as ShippingPackagingType` / `as WarrantyType` casts.
- **NIT / style / whole file** — fails `prettier --check`.

### `apps/web-admin/.../utils/add-product-payload.ts` — ISSUE

- **MEDIUM / type-safety / :405,408** — `as` casts where `shippingPackagingTypeSchema.safeParse()` belongs.
- **MEDIUM / correctness / :230-237** — 3-level nested ternary for `images`; violates the spirit of `AGENTS.md` §11 and is the least readable expression in the file.
- **MEDIUM / correctness / :217, :231** — `colorValue === 'default'` is **case-sensitive**, while repository/presenter/mobile all lowercase first (§6.3). A `Default`-named variant is a placeholder everywhere except here.
- **MEDIUM / duplication / :401,405,408** — 3 more default literals (§6.1).
- **LOW / architecture / :19, :259-260** — still imports `generateCollisionProofBaseSku` (18-char format) as the SKU fallback while `use-sku-table.ts` now generates dashed SKUs — **two formats in one submit path**.
- **MEDIUM / readability / :88** — **CC≈99 / 326 lines — the longest function in the change set**, 8× the §4 ceiling. Already CC89/293L at `HEAD`; **this branch added +10 CC and +33 lines** (§6.8). Paired with `hydrateProductForm` as the other half of H3's root cause (P4 item 30).
- **LOW / readability / :53** — `[...allowed].some(...)` allocates a new array per key; use `allowed.has()` / a prefix set.
- **NIT / style / :1** — `simple-import-sort` lint error.

### `apps/web-admin/.../utils/add-product-validation.ts` — ISSUE

- **HIGH / duplication / :291-322** — hand-rolled validator duplicating Zod with divergent rules (H7).
- **HIGH / architecture / :379-388** — magic `3` business rule, UI-only (H8).
- **MEDIUM / correctness / :303-311** — `break` after the first bad dimension reports only one of three problems; Zod reports all.
- **MEDIUM / correctness / —** — no validation of `packagingType` against the enum, and no `warrantyPeriod`/`warrantyPolicy` length limits → server 400s that the UI cannot map to a field.
- **LOW / test-quality / —** — 8 new tests are good, but none pin the Zod/UI divergence.
- **LOW / readability / —** — file is 479 lines; `buildSidebarSections` alone spans :330-479.

### `apps/web-admin/src/features/product/types.ts` — HIGH

- **HIGH / duplication / :12-13** — second `ProductFormValues` definition (H4), imported by `sync-dynamic-values.ts` while 10+ other files import the hook's copy.
- **NIT / architecture / :1-7** — `import type { baseProductSchema }` reaches into shared-types for a _value_ to `typeof`; acceptable, but combined with the duplicate it widens the blast radius.

### `apps/web-admin/.../hooks/use-submission-state.ts` — PASS

- **LOW / naming / :55** — `hasAttemptedSubmit = submitCount > 0 || isSubmitted` is clean and correctly derived; good separation of "user tried" from "form state".

### `apps/web-admin/.../fields/components/sku-table-utils.ts` — PASS

- **LOW / architecture / :84-107** — `collectSkuItems` + thin `collectSkuPaths` wrapper is the correct decomposition pattern. The only issue is on the consumer side (`use-sku-table.ts` left the wrapper imported).

### `apps/web-admin/.../fields/components/use-sku-table.ts` — ISSUE

- **HIGH / test-quality / :16** — unused `collectSkuPaths` import = lint error (H1); the wrapper is now tested but unused in production.
- **HIGH / correctness / :186-196** — `styleRef = productName.split(' ')[0].replace(...).slice(0,8).toUpperCase() || 'ITEM'`. Every product whose name starts with the same word gets the same `styleRef` → `generateRetailSku` collides. Replaces `generateCollisionProofBaseSku`, which existed precisely to avoid this.
- **MEDIUM / correctness / :187** — `brand = String(getValues('brand') || 'CLB')` falls back to `'CLB'` if the brand field is empty; combined with `styleRef` this can mint `CLB-ITEM-STD` for many products.
- **MEDIUM / architecture / :5, :198** — now the only consumer of `generateRetailSku` while `add-product-payload.ts` uses `generateCollisionProofBaseSku` → two SKU formats in one flow (§8, `add-product-payload.ts`).
- **LOW / dead-code / :189-197** — `departmentHint` computation was removed; verify `generateCollisionProofBaseSku`'s remaining consumer still receives a department.
- **MEDIUM / readability / :26** — **CC≈42 / 216 lines**, 5× the §4 ceiling and the 3rd-most complex function in the change set; the scope-matching logic at `:135` sits 5 control-flow levels deep. **Pre-existing** (CC41/203L at `HEAD`, this branch added +1 CC, +13L) — recorded in §6.8, not counted as a finding of this review.

### `apps/web-admin/.../add-product/index.tsx` — ISSUE

- **MEDIUM / architecture / :60 vs :106** — `isEditMode` enforced twice (hook arg + header render guard); see H9.
- **LOW / architecture / :37, :105-110** — barcode state lives in the page component; `AGENTS.md` §2 prefers state in hooks. `useProductBarcodeModal` already owns `isOpen` — the modal could own its items entirely.
- **LOW / architecture / :71-77** — `handleDynamicValuesChange` is now a correct one-line delegation to `syncDynamicTitleAndBrand` (good), but it is wrapped in `useCallback` whose only dep is `form` — fine.

### `apps/web-admin/.../add-product/add-product-form-body.tsx` — ISSUE

- **HIGH / correctness / :49, :96-108** — `canShowAdditionalSections = Boolean(effectiveCatId && draft.draftRestored)` gates whether `ShippingWarrantySection` renders, but `collectShippingErrors` runs unconditionally in the submit hook. Before a category is chosen the section does not exist, so a submit attempt surfaces a toast pointing at `#product-section-package` that cannot be scrolled to. The section _is_ in the sidebar (`buildSidebarSections` pushes `shipping` whenever `schemaFields.length > 0`, and the submit hook early-returns when `schemaFields.length === 0`), so the practical exposure is the window between schema load and category selection — worth closing by sharing one predicate.
- **LOW / architecture / :98-108** — introducing a `<>…</>` fragment purely to add one sibling; acceptable.
- **NIT / style / :9-10** — import inserted out of alphabetical order (contributing to the lint failure of a _different_ file's sort rules isn't applicable here, but keep imports sorted).

### `apps/web-admin/.../add-product/add-product-header.tsx` — ISSUE

- **HIGH / correctness / :36** — barcode button gated on `isEditMode` only, vs `status === 'published'` on the list (H9).
- **LOW / architecture / :4, :6** — `import { Printer } from 'lucide-react'` placed _after_ the `@celebs/shared-ui` import, breaking the project's import grouping → `simple-import-sort` error.
- **LOW / test-quality / —** — no test for the new button's conditional rendering.

### `apps/web-admin/.../add-product/product-submission-sidebar.tsx` — PASS

- **LOW / architecture / :32** — correct wiring of `showErrors={hasAttemptedSubmit}`.

### `apps/web-admin/.../add-product/use-add-product-submit.ts` — **BLOCKER**

- **BLOCKER / dead-code / :146-157** — unreachable second `collectShippingErrors` block (B2).
- **MEDIUM / duplication / :146** — `collectShippingErrors` invoked twice per submit (once inside `buildSidebarSections` at :100, once here).
- **MEDIUM / correctness / :150** — only `shippingErrors[0]` would have been shown; other errors silently dropped (moot given it's dead, but indicative).
- **MEDIUM / architecture / :153-155, :138-141** — direct `document.getElementById(...).scrollIntoView()` in two places, keyed to the magic string `'product-section-package'` which must stay in sync with `shipping-warranty-section.tsx:11`. Two files, one string, no shared constant.
- **LOW / architecture / :62-67** — `errObj?.errors ?? errObj?.response?.data?.errors ?? errObj?.data ?? errObj?.response?.data?.data` is a 4-level fallback cascade — explicitly forbidden by `AGENTS.md` §8 "Ban Fallback Cascades (The Ponytail Rule)". _(Pre-existing, but touched by this file's imports.)_

### `apps/web-admin/.../add-product/sync-dynamic-values.ts` — ISSUE

- **HIGH / duplication / :2** — imports `ProductFormValues` from `../../types`, i.e. the _duplicate_ (H4). This is the only file in the feature that does.
- **LOW / architecture / :1-27** — extraction itself is good: the inline callback in `index.tsx` is now a testable pure function. But it has **no test**.
- **NIT / style / :1** — `simple-import-sort` error.
- **LOW / duplication / :13-18, :21-26** — the name sync and brand sync are the same 6-line block twice, differing only in the target field (D3, §6.7). The `['name','productname','title']` / `['brand','productbrand']` alias lists are hand-maintained with no shared definition, so a third synced field means a third copy-paste.

### `apps/web-admin/.../components/product-form-sidebar.tsx` — PASS

- **LOW / correctness / :107** — `showErrors && !section.status` is the right guard; defaulting to `false` prevents error noise on first load, and `product-form-sidebar.spec.tsx` covers all three states.

### `apps/web-admin/.../components/submission-progress-checklist.tsx` — PASS

- **NIT / architecture / :29-30** — both `export const` and `export default` for the same component; pick one (the codebase's other components use named exports only).

### `apps/web-admin/.../components/shipping-warranty-section.tsx` — ISSUE

- **MEDIUM / architecture / :11** — `id="product-section-package"` is a cross-file contract with `use-add-product-submit.ts:154` and `add-product-validation.ts:457` (`anchorId`). Three files must agree; nothing enforces it. Export a constant.
- **LOW / architecture / :34** — content spans 3 lines exceeding the Prettier print width → Prettier failure.
- **NIT / typography / :23** — `text-base font-semibold` for `CardTitle` matches §7 h3 ✅; description text is `text-xs` ✅.

### `apps/web-admin/.../components/shipping-dimensions-card.tsx` — ISSUE

- **MEDIUM / correctness / :14, :24** — magic `0.3` (2 more copies, §6.1) duplicated from 6 other layers.
- **MEDIUM / architecture / :22** — volumetric divisor `/5000` hardcoded inline. This is a courier-specific business rule (Pathao) with no constant, no comment citing the source, and no test.
- **LOW / correctness / :9-12** — `useWatch(...) || 0.3` means a user who deliberately clears the field sees `0.3` in the badge while the input is empty — display and field disagree.
- **LOW / architecture / :9** — `formState: { errors }` destructured inline; `AGENTS.md` §3 prefers explicit `control` passing over `useFormContext` to limit re-renders. `dynamic-product-form.tsx` already uses `useFormContext`, so this is consistent with local convention but against the stated mandate.
- **NIT / style / whole file** — fails Prettier (dense single-line JSX props).

### `apps/web-admin/.../components/warranty-policy-card.tsx` — ISSUE

- **MEDIUM / architecture / :23, :38** — two raw `<select>` elements; `AGENTS.md` §5 requires Radix (`@celebs/shared-ui/components/select`) and `packages/shared-ui/src/components/select.tsx` exists with scroll handling.
- **MEDIUM / correctness / :26, :41** — `defaultValue="FLYER_SMALL"` / `defaultValue="NO_WARRANTY"` on `register()`-controlled selects. Form `defaultValues` (`use-product-form.ts:26-33`) do **not** include these keys, and hydration arrives later via `form.reset(hydrated)` (`use-product-form.ts:56`). The HTML `defaultValue` and RHF's reset value are two competing initializers for the same control.
- **MEDIUM / duplication / :26,29,41,44,51** — 5 more enum literals; the Zod enums `shippingPackagingTypeSchema` / `warrantyTypeSchema` exist and are importable.
- **LOW / correctness / :60-75** — three checkboxes use `setValue` with `Boolean(val)` but Radix `onCheckedChange` can pass `'indeterminate'`; `Boolean('indeterminate') === true`. Not reachable with the current props, but the API allows it.
- **NIT / style / whole file** — fails Prettier.
- **NIT / readability / :27,42,64,71,78,85** — 6 of the change set's 17 over-120-char lines are here (worst = 206ch), all inline `className` + handler attribute soup; `:27` and `:42` carry near-identical `<Select>` class strings. A local `<PolicyRow>` wrapper would clear the line-length issue, the duplicated class strings _and_ the §5 raw-`<select>` finding above in one change (P4 item 33).

### `apps/web-admin/.../barcode/barcode-print-modal.tsx` — ISSUE

- **MEDIUM / architecture / :84** — raw `<select>` (§5 mandate).
- **MEDIUM / correctness / :102** — `text-[10px]` violates the §7 floor (`text-xs` minimum).
- **LOW / correctness / :88** — `{item.variantLabel || 'Standard'}` while every other surface uses `'STANDARD'` / `'default'`; a third placeholder word.
- **LOW / architecture / :19** — exports `BarcodePrintItem` (type-only, OK) but it is then duplicated as `BarcodeBatchItem` in `thermal-print-batch.tsx:5`.
- **NIT / style / whole file** — fails Prettier.

### `apps/web-admin/.../barcode/barcode-sticker.tsx` — ISSUE

- **MEDIUM / architecture / whole file** — `text-[6pt]`, `text-[6.5pt]`, `text-[7pt]`, `w-[50mm]`, `h-[9.5mm]`, `max-h-[38px]` all violate §7/§11. Thermal-print sizing is a legitimate reason, but §7's exemption clause requires it be **documented** — it currently isn't.
- **LOW / correctness / :47-60** — `let currentX = 0` is mutated inside `bars.map()` during render. It works (re-initialized each render) but violates render purity; a `reduce` producing `[{x, width}]` would be idiomatic and memoizable.
- **LOW / performance / :47, :50, :52** — `totalUnits` and the bar array are recomputed on every render despite `useMemo` on `bars`; the reduce could be folded into the memo.
- **NIT / naming / :12** — default `storeName = 'CELEBS • NEW ROAD HUB'` is the 3rd copy of this literal (also in both barcode hooks).
- **NIT / style / whole file** — fails Prettier.

### `apps/web-admin/.../barcode/barcode-utils.ts` — ISSUE

- **✅ VERIFIED CORRECT / correctness / :3-17** — all 107 `CODE128_PATTERNS` entries checked programmatically: indices 0–106 are exactly 6 digits except index 106 (`'2331112'`, 7 digits) — **which is correct**, as the Code 128 STOP pattern is 13 modules (2+3+3+1+1+1+2) versus 11 for data characters. Checksum (`START_B = 104`, weighted sum mod 103) matches spec.
- **MEDIUM / correctness / :26-33** — `encodeCode128B` silently **skips** any character where `charCodeAt(i) - 32` falls outside `0..95`: neither the code array nor the checksum is updated, producing a barcode that decodes to _shorter_ text with no error. Safe for the current alphanum+`-` SKUs, but `BarcodeSticker` is a reusable component and non-ASCII input corrupts silently. Should throw or sanitize at the boundary.
- **NIT / style / whole file** — fails Prettier.

### `apps/web-admin/.../barcode/thermal-print-batch.tsx` — ISSUE

- **MEDIUM / architecture / :13-19** — injects a `<style>` block containing `body * { visibility: hidden; }`. While mounted this suppresses **all** page content during any print, not just this batch. Coupled with `print:fixed`, it's a global side effect declared locally.
- **MEDIUM / duplication / :5-12** — `BarcodeBatchItem` is a byte-for-byte duplicate of `BarcodePrintItem` (`barcode-print-modal.tsx:19`).
- **LOW / correctness / :18** — `print:z-9999` is not a standard Tailwind z-index token; verify it compiles under Tailwind v4's bare-value support, otherwise it silently no-ops.
- **LOW / correctness / :28** — `key={i}` on copies is fine here (immutable list) but `page-break-after-always` on every item including the last produces a trailing blank page on most browsers.

### `apps/web-admin/.../barcode/use-barcode-items.ts` — HIGH

- **HIGH / duplication / :10-15, :21-70** — divergent clone of `use-product-barcode-modal.ts` (H5). 4 confirmed behavioural differences.
- **MEDIUM / correctness / :47** — `product.vendorName?.slice(0,3)` on an unsanitised string: a vendor named `"N P Fashion"` yields `"N P"` → `` `CLB-N P-…` `` with a space in the SKU, which then gets encoded into the barcode.
- **LOW / architecture / :4** — imports `AdminProductListItem` and immediately fetches full detail; the query key is correct (`PRODUCT_QUERY_KEYS.detail`) but duplicates the fetch `use-product-form` already performs on the edit page.
- **NIT / style / :1** — `simple-import-sort` error.

### `apps/web-admin/.../barcode/index.ts` — ISSUE

- **MEDIUM / architecture / whole file (3 lines)** — barrel file; `AGENTS.md` §1: _"No Barrel Files: Do not use `index.ts` barrel files for exporting within a feature."_
- **MEDIUM / dead-code / —** — grep across `apps/web-admin/src` finds **zero importers** of `../barcode` or `from '.../barcode'`. The file exists, is banned, and is unused.
- **NIT / style / —** — `simple-import-sort/exports` error.

### `apps/web-admin/.../barcode/__tests__/barcode-print.spec.tsx` — ISSUE

- **MEDIUM / test-quality / —** — does not assert a golden `encodeCode128B` output, so the encoder's correctness (the highest-risk new logic) is unpinned. A checksum regression would not fail this test.
- **LOW / test-quality / —** — 67 lines; reasonable component-level coverage of rendering.
- **NIT / style / :1** — import-sort error.

### `apps/web-admin/.../hooks/use-product-barcode-modal.ts` — HIGH

- **HIGH / duplication / :7-14, :27-70** — the other half of H5.
- **MEDIUM / correctness / :35** — `product.skus as SkuEntry[]` downcasts `AdminProductDetail['skus']` instead of using its actual element type.
- **MEDIUM / correctness / :42** — filters `'default'` but compares `val.toLowerCase()` against a value it never `.trim()`s — a stored `" Default "` slips through.
- **NIT / style / whole file** — fails Prettier.

### `apps/web-admin/.../components/manage-product.tsx` — ISSUE

- **MEDIUM / architecture / —** — **fails `prettier --check`** despite `lint-staged` being configured to run it (§5-6). Several changes are pure reformatting with no behavioural intent: `:23`, `:35-38`, `:54-61`, `:83-86` collapse multi-line callbacks into single lines (some exceeding the print width). This is churn that obscures the real diff.
- **LOW / architecture / :5, :117-119** — `React` default import added where the file previously used named imports only; `:117-118` threads `barcodeTarget` + `onCloseBarcodeTarget` through `ManageProductDialogs` when `useManageProductState` already exists as the state home for this component's UI state.
- **LOW / architecture / :104** — `onPrintBarcodes` prop added to the table with no permission check, unlike its siblings (`canEdit`, `canDelete`).

### `apps/web-admin/.../manage-product/manage-product-dialogs.tsx` — ISSUE

- **MEDIUM / architecture / :16-17, :45, :107-114** — second barcode modal wiring path. `useBarcodeItems` is called unconditionally; correct (`enabled: Boolean(productId)`), but the modal mounting logic (`barcodeTarget && onCloseBarcodeTarget`) duplicates the shape in `add-product/index.tsx:136-141`.
- **LOW / correctness / :107** — both `barcodeTarget` truthiness _and_ `isOpen={Boolean(barcodeTarget)}` are checked — redundant double guard.
- **LOW / architecture / :45** — hook called before early returns / conditional rendering; fine today, but it means a `useQuery` is instantiated for every dialog render even when no barcode is requested.

### `apps/web-admin/.../manage-product/manage-product-row-actions.tsx` — ISSUE

- **HIGH / correctness / :65-67** — `status === 'published'` gate contradicts the edit page's `isEditMode` gate (H9).
- **LOW / architecture / :65-67** — array-spread-inside-`items` conditional (`...(cond ? [{...}] : [])`) is a common pattern but the ternary's false branch allocating `[]` on every render violates `AGENTS.md` §4 hook/array stability guidance for a memoized `RowActionsMenu` input.

### `apps/web-admin/.../manage-product/manage-product-table-row.tsx` — PASS

- **NIT / architecture / :+3** — trivial prop passthrough.

### `apps/web-admin/.../manage-product/manage-product-table.tsx` — PASS

- **NIT / architecture / :+3** — trivial prop passthrough.

### `apps/web-admin/.../__tests__/product-form-sidebar.spec.tsx` — ISSUE

- **LOW / test-quality / —** — well-structured: three states (neutral / errored / completed) with explicit `showErrors` values. Genuinely load-bearing for the new gating.
- **NIT / style / :1** — import-sort error.

### `apps/mobile/.../product-variant-selector.tsx` — PASS

- **LOW / correctness / :54-58** — `hasRealColorVariants` correctly hides a lone `'Default'` variant; uses `.toLowerCase()` consistent with `mobile/stock.ts`.
- **NIT / correctness / :75** — `colorVariants?.map` — the `?.` is redundant: `hasRealColorVariants` being true guarantees `colorVariants` is non-empty.
- **NIT / correctness / :57** — `colorVariants[0].name.toLowerCase()` assumes `name` is always present; a variant without `name` throws.

### `apps/mobile/.../use-product-detail-cart.ts` — PASS

- **✅ GOOD / correctness / :163-167** — changing the fallback from `'Standard'` to `'Default'` / the first stock size is a **genuine bug fix**: `ProductInventory.size` is written as `'Default'` by `inventory.repository.ts:176`, so `'Standard'` could never match an inventory row. This is the single most valuable mobile change in the set.
- **LOW / correctness / :163** — `freshVariant?.stocks?.[0]?.size` picks the first stock blindly. The guard at `:156-160` (`availSizes.length > 0 && !finalSize → open modal`) means this is only reached when `availSizes.length === 0`, i.e. no sizes — so the `|| stocks[0].size` arm is nearly always `'Default'`. Correct, but the expression implies a selection the user never made.
- **LOW / correctness / :164** — `resolvedColor` falls back to `'Default'` (changed from `'Standard'`) — consistent with the fix.

### `apps/mobile/.../utils/stock.ts` — PASS

- **✅ GOOD / correctness / :22-31** — filtering `'Default'` out of `product.sizes` with an explicit `if (filtered.length > 0) return filtered;` fallthrough is the right shape: it hides placeholder sizes without losing data when _every_ size is a placeholder.
- **LOW / correctness / :22** — `isNotDefault` trims; `product-variant-selector.tsx:57` does not — the two `'default'` checks in the same feature differ by a `.trim()`.
- **LOW / correctness / :43, :48** — `isNotDefault(s.size)` on stock entries: a product whose only real size is literally `"Default"` now shows no sizes. Acceptable trade-off, but undocumented.

### `apps/mobile/.../__tests__/stock-sizes.spec.ts` — PASS

- **LOW / test-quality / —** — 37 lines, covers the new filtering. Adequate for the change.

### `apps/web-admin/.../__tests__/add-product-payload.spec.ts` — ISSUE

- **LOW / test-quality / —** — 66 new lines covering the two genuinely new behaviours (default-SKU serialization, default-colour image preservation). Both are good.
- **MEDIUM / test-quality / —** — no test for the nested `images` ternary at `add-product-payload.ts:230-237`, the highest-complexity expression in the diff.
- **NIT / style / —** — fails Prettier.

### `apps/web-admin/.../__tests__/add-product-validation.spec.ts` — PASS

- **✅ GOOD / test-quality / —** — 107 added lines; the strongest new UI test file. Covers both directions of weight validation, warranty-period-required, sidebar section status transitions, **and** both sides of the min-3-specifications rule.

### `apps/web-admin/.../__tests__/hydrate-product-form.spec.ts` — ISSUE

- **MEDIUM / test-quality / :101-103 vs :205-206** — asserts `sku.variants.Color.Blue.Size.M` (capital `Color`/`Size`) in one test and `sku.variants.size.S` (lowercase `size`) in another. The suite therefore **codifies the casing inconsistency** instead of catching it.
- **MEDIUM / test-quality / —** — no test asserts the axis-less prefixes (`sku.variants.Red.M`) or the `color.${color}` middle prefix, so removing or corrupting them changes nothing. Conversely, adding a 4th bogus prefix also passes.
- **LOW / test-quality / —** — good coverage of the shipping/warranty hydration and the legacy-default fallback.
- **NIT / style / —** — fails Prettier.

---

## 9. Prioritized Fix Backlog

Ordered so each step removes a whole duplication cluster rather than patching one copy. **Nothing below has been applied.**

### P0 — Make the suite honest (≈30 min)

1. Delete `sku-generator.spec.ts:44` (stray `}`).
2. Add `"test": "vitest run"` to `packages/shared-types/package.json` and `packages/shared-utils/package.json`.
3. Add a `tsconfig.spec.json` (or drop `**/*.spec.ts` from `tsconfig.base.json`'s exclude) so specs are typechecked.
4. Delete `use-add-product-submit.ts:146-157` (dead block).
5. Remove the unused `collectSkuPaths` import from `use-sku-table.ts:16`.
6. Run `prettier --write` + `eslint --fix` over all 51 files; confirm both linters go green.

_Files touched: 10 · Risk: none (all removals/infra)._

### P1 — One source of truth for the shipping/warranty contract (≈half day)

7. Extract `SHIPPING_DEFAULTS = { packageWeightKg: 0.3, packagingType: 'FLYER_SMALL', warrantyType: 'NO_WARRANTY' }` and the two enums to a single module in `@celebs/shared-types`; import it in Prisma-mirroring code, `product-payloads.ts`, `product-presenters.ts`, `add-product-payload.ts`, `hydrate-product-form.ts`, `add-product-validation.ts`, and both UI cards → **eliminates 30 literals**.
8. Delete `shippingDetailsSchema`/`warrantyDetailsSchema` **or** make `baseProductSchemaFields` compose them (one definition per file); rewrite `collectShippingErrors` as a `.safeParse()` wrapper → **eliminates the UI/server divergence (H7)**.
9. Extract `isPlaceholderVariant()` (lowercase+trim compare) and use it in all 6 `'default'` sentinel sites → **fixes the case-sensitive bug in `add-product-payload.ts:217,231`**.
10. Extract `buildVariantKey()` and use it in `inventory.repository.ts:151,188` and `product-presenters.ts:341` → **collapses 3 matchers to 1**.
11. Remove the `as ShippingPackagingType` / `as WarrantyType` casts (4 sites).
12. Move the `3` in `add-product-validation.ts:381` to a named exported constant shared with the API.

_Files touched: ~14 · Risk: medium — needs a full test run._

### P2 — Delete the dead and duplicated code (≈half day)

13. `hydrate-product-form.ts`: replace the 4 prefix lists with `pathFor()`-derived paths built from `variantMeta`; collapse the 4×5 assignments; delete the no-op block at `:294-305`.
14. `inventory.repository.ts`: delete dead branches `:154-158` and `:193`; replace the 5-deep chain with 2 named steps and **throw** on no-match instead of minting a random SKU; move `rows.length === 0` handling before the early return.
15. Merge the two barcode hooks into one `buildBarcodeItems()`; delete both private `SkuEntry`s and `BarcodeBatchItem`; delete `barcode/index.ts`.
16. Delete `types.ts:12` (`ProductFormValues` duplicate); repoint `sync-dynamic-values.ts:2`.
17. Delete `collectSkuPaths` (or make it the only API) — resolve the used-vs-tested split.
18. `product-payloads.ts`: replace the 11 conditional spreads with a `pickDefined()` helper.
19. `product-presenters.ts`: apply `validDiscount()` to the SKU `discountedPrice` and decide the product-level cascade rule explicitly (H2).

_Files touched: ~12 · Risk: medium-high for 14 and 19 — add tests first._

### P3 — Mandate compliance & consistency (≈2–3 hours)

20. Replace 3 raw `<select>`s with the shared Radix `Select`; remove `defaultValue` from `register()`-controlled selects.
21. Export `PRODUCT_SECTION_PACKAGE_ANCHOR` and use it in all 3 files referencing `product-section-package`.
22. Unify barcode gating behind `canPrintBarcodes(product)`; add a permission check to `manage-product.tsx`.
23. Fix `barcode-print-modal.tsx:102` `text-[10px]` → `text-xs`; document a §7 exemption for `barcode-sticker.tsx`'s `pt`-based print sizing.
24. Make `encodeCode128B` throw (or sanitize) on out-of-range characters instead of silently skipping.
25. Move `barcodeTarget` state into `useManageProductState`; remove the reformat-only churn in `manage-product.tsx`.
26. Document the `/5000` volumetric divisor with its courier source; give `storeName`'s `'CELEBS • NEW ROAD HUB'` one constant.
27. Add tests for: `generateRetailSku` collisions, `encodeCode128B` golden output, `buildProductPayload` nested-images branch, `syncDynamicTitleAndBrand`, and the inventory no-match path.

_Files touched: ~16 · Risk: low._

### P4 — Structure: duplication & complexity (≈1–2 days, from §6.7–6.8)

Items **attributable to this change set** (do these):

28. `syncDynamicTitleAndBrand`: replace the two copy-pasted blocks with `syncField(field, candidateKeys)`; export the name/brand alias lists as constants so a third synced field is an addition, not a copy-paste. _(new file, D3)_
29. Extract `baseProductFields(formatted)` in `product-presenters.ts` and spread it into the 4 return blocks (`:199`, `:249`, `:279`, `:365`). Land this **together with item 19**, so the `validDiscount()` fix lands in one place rather than four. _(the 4-block structure predates the branch, but the branch grew it by 63 lines — D2)_
30. Refactor `hydrateProductForm` (CC123 / 271 lines, **+30 CC from this branch**) and `buildProductPayload` (CC99 / 326 lines, **+10 CC**) onto a shared, table-driven axis/path map. These are the two worst functions in the change set **and** the source of H3 and H2 — the CC and the bug class have the same root cause. Prerequisite for P2 item 13.
31. `warranty-policy-card.tsx`: extract a local `<PolicyRow>`/control wrapper — resolves 6 of the 17 over-120-char lines, the two duplicated `<Select>` class strings, _and_ the §5 raw-`<select>` violation in one change. _(new file)_
32. Collapse the depth-7 handler in `barcode-print-modal.tsx:110` — the only depth-7 site this branch introduced (the other two, `manage-product-dialogs.tsx:57` and `manage-product-table-row.tsx:95`, are pre-existing and out of scope).

Items **pre-existing, not introduced by this branch** (optional, out-of-scope — file separately if you want them):

33. Extract `type ManageProductActions`; make the 5 `ManageProduct*Props` interfaces `extends` it → removes 8 props × 5 declarations. `git diff HEAD` shows the branch added none of these props. Do it **before** adding any further row action.
34. Rewrite `resolveDepartmentCode` as `const DEPT_RULES: [keywords[], code][]` → CC 32 → ~2. Function unchanged at `HEAD`.
35. Revisit `use-sku-table.ts` (CC42 / 216L, **+1 CC from this branch**) and `use-add-product-submit.ts` (CC37 / 178L) only after P0–P2 — both are already touched by items 13–19.

_Files touched: ~8 for items 28–32 · Risk: medium — refactor behind the existing tests; run item 27's new tests first._

**Ordering note:** item 30 is the largest single piece of work in this backlog and should start _after_ P0–P1 have made the contract single-sourced, otherwise the refactor has to be redone. It is rated P4 deliberately: §6.8 shows the CC breach was **mostly pre-existing**, whereas B1–B3 and H1–H9 are live correctness and CI failures.

---

## 10. What Was Done Well

Recorded so these are not "fixed" by a later pass:

- **`sku-table-utils.ts`** — `collectSkuItems` with `collectSkuPaths` as a thin wrapper is textbook decomposition.
- **`sync-dynamic-values.ts`** — extracting an inline callback into a pure, testable function was the right call (it just needs the right import and a test).
- **`use-product-detail-cart.ts` / `stock.ts` (mobile)** — the `'Standard'` → `'Default'` change fixes a real inventory-key mismatch, and the `filtered.length > 0` fallthrough in `resolveProductSizes` is carefully done.
- **`product-shipping-warranty.spec.ts`** — a genuine DB round-trip for all 11 fields; better than most of the UI tests.
- **`add-product-validation.spec.ts`** — tests both directions of every new rule, including the min-3 rule's boundary.
- **`product-form-sidebar.spec.tsx`** — covers the `showErrors` regression risk explicitly.
- **`use-submission-state.ts`** — `hasAttemptedSubmit` is a clean derivation and the `showErrors` gating is a real UX improvement.
- **`sku-generator.ts` Code 128 table** — verified correct: 107 entries, all lengths as specified, checksum matches spec.
- **Inventory published-SKU lock** — the `AppError` throws and their tests are well-constructed.

---

_Review performed by reading all 51 files in full or in diff, plus cross-referencing `apps/web-admin/AGENTS.md` and `apps/api/AGENTS.md` mandates. Graph evidence from `C-celebs-celebs` (re-indexed 2026-09-25, 9,087 nodes). All lint/typecheck/test/Prettier results in §2 were reproduced by direct execution. §6.7–6.8 add measured duplication and cyclomatic-complexity analysis (regex-based, computed identically across all 57 in-scope functions); every cluster there was re-checked against `git show HEAD:<file>` to separate what this branch introduced from what it merely inherited._
