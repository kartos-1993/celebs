# Second-Pass Forensic Review — Verdicts & Corrections to the Storefront/Campaign/Combo Runbook

**Date:** 2026-10-18
**Method:** live DB probes (port 6543 via `db.prisma`), `EXPLAIN (ANALYZE, BUFFERS)`, live API calls (`:3333`), and file:line source reads against `docs/plans/2026-10-18-storefront-campaign-combo-agent-execution-runbook.md`.
**Purpose:** Before heavy feature implementation, verify every claim in the runbook + architecture blueprint against the real system, kill duplicate implementations, and publish ONE corrected execution order.

---

## 0. Verdict Summary — every runbook claim, checked

| #   | Runbook / transcript claim                                                                       | Verdict                                                                                                                                                                                                                                                                 | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | "QuickFilter → StorefrontShortcut migration **never deployed**"                                  | ❌ **OUTDATED — APPLIED**                                                                                                                                                                                                                                               | `_prisma_migrations`: `20261016143545_rename_quick_filter_to_storefront_shortcut \| applied`. `QuickFilter` table no longer exists (`to_regclass` → null); `StorefrontShortcut` exists with **16 seeded rows**.                                                                                                                                                                                                                                                                                                                                                                         |
| 2   | Campaign / CampaignProduct / ComboBundle / ComboBundleItem = 0 rows                              | ✅ TRUE                                                                                                                                                                                                                                                                 | DB counts: Campaign=0, CampaignProduct=0, ComboBundle=0, ComboBundleItem=0, Banner=0.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 3   | Category shortcut chips return 0 products (slug sent as `tag`)                                   | ✅ TRUE                                                                                                                                                                                                                                                                 | `use-category-filters.ts:58` sends `tag: selectedStorefrontShortcutValue`; service emits `filterValue: child.slug` (`storefront-shortcut.service.ts:143-149`); API executes `where.tags = { has: tag }` (`product-query.service.ts:280-281`). Slugs are never tag values. Audit doc §4.3 independently simulated this.                                                                                                                                                                                                                                                                  |
| 4   | No campaign screen in mobile; banner "Shop Now" has no `onPress`                                 | ✅ TRUE                                                                                                                                                                                                                                                                 | `campaign-countdown-banner.tsx:113` — `<TouchableOpacity style={styles.shopBtn}>` with **no onPress**. `apps/mobile/src/app/` has no `campaign/` directory.                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 5   | Homepage shows broken "No bundles to show" card; combo modal Add-to-Cart has no handler          | ⚠️ **PARTLY** — the empty state is honest (`combo-bundle-showcase.tsx:53` renders when 0 combos exist). The real defect: `(tabs)/index.tsx:112-116` renders `ComboBundleModal` **without `onAddToCart`**; the modal fully supports it (`combo-bundle-modal.tsx:21,68`). |
| 6   | CartItem has `combo_bundle_id` / `applied_discount` but CartService ignores them                 | ✅ TRUE                                                                                                                                                                                                                                                                 | DB columns exist (snake_case `@map`); `cart.service.ts` + `cart.repository.ts` have **zero** references to `comboBundleId`/`appliedDiscount`/`discountSource`. `getCart` maps `price: rawPrice, discountedPrice` only (`cart.service.ts:198-199`).                                                                                                                                                                                                                                                                                                                                      |
| 7   | Redundant `count(*)` on public infinite-scroll reads                                             | ⚠️ **PARTLY** — cursor pages already skip it (`product-query.service.ts:169`). **Page 1** (no cursor) runs it — live response: `total: 37`. Mobile consumes no `.total` anywhere.                                                                                       |
| 8   | "OR conditions force in-memory Sort (13.5ms) — add `Product_status_categoryId_createdAt_id_idx`" | ❌ **UNPROVEN at current data**                                                                                                                                                                                                                                         | `EXPLAIN ANALYZE` (real Men subtree, 10 category ids): `Index Scan Backward using Product_status_createdAt_idx` + `Incremental Sort` → **0.121ms, 24 buffer hits**. No bitmap heap scan, no full sort. The prescribed single composite index **does not cover the `subcategoryId` OR branch** — it cannot accelerate the OR as claimed.                                                                                                                                                                                                                                                 |
| 9   | Mobile shows OUT OF STOCK on products with plenty of stock                                       | ✅ TRUE — reproduced live                                                                                                                                                                                                                                               | Live card #2 (`GET /api/v1/products?limit=2&category=men`): `"inStock": true`, `colorVariants:[{name:"Black",images:[...]}]` — **no `stocks` array**. `stock.ts:104` fails closed (`stocks` missing → OOS) → `stock.ts:132` `variants.every(...)` → `true`. `use-product-card.ts:186-189` same via selected variant. Also `color-swatch-item.tsx:29`. FTPD path (no variants + `inStock:true`) is already handled (`stock.ts:125-130`).                                                                                                                                                 |
| 10  | "tags is completely deleted from the database and API" (impact)                                  | ⚠️ **UNDERSTATED**                                                                                                                                                                                                                                                      | Blast radius: 36 `tags` arrays in `products.json`, `seed-products.ts:198`, `createProductSchema` (`product.validator.ts:154`), `productFilterSchema.tag` (:236), search OR (`product-query.service.ts:251`), tag filter (:280-281), mobile `ProductFilterParams.tag` (`types.ts:111`), `use-category-filters.ts:58`, web-admin `add-product-payload.ts:849` + specs, `review-queue/types.ts:76`, `storefrontShortcutTypeSchema` includes `'tag'` (`category.validator.ts:100`). Dropping the `tag` _filter_ is the bug fix; dropping the _column_ is optional cleanup with these costs. |
| 11  | Campaign/Combo backend "not implemented"                                                         | ❌ **WRONG — modules fully scaffolded**                                                                                                                                                                                                                                 | `campaign` + `combo` + `storefront-shortcut` modules each have routes/controller/service/repository with public + admin endpoints; mounted in `app.ts:202,230,231`. Work = extend, **never rebuild**.                                                                                                                                                                                                                                                                                                                                                                                   |
| 12  | Out-of-stock fix: extend `StorefrontCardColorVariant` with `inStock`                             | ❌ **WRONG SHAPE**                                                                                                                                                                                                                                                      | `packages/shared-types/src/types/product.ts:24` — "Storefront Grid Card Contract (Exact 13 keys)" + `product.types.spec.ts` key guards. Card-level `inStock: boolean` **already exists and is correct** (`product-response-shapes.ts:232`); only the mobile helper misreads it. Fix belongs in `apps/mobile` stock helpers only.                                                                                                                                                                                                                                                        |

---

## 1. What already exists — the de-dup map (do NOT rebuild)

**API**

- Campaign CRUD + `GET /campaigns/active` + `GET /campaigns/:slug` (returns campaign **with products**) — `campaign.repository.ts` has `findActiveCampaigns`, `findBySlug`, `findProductsByIds`.
- Combo CRUD + `GET /combos` (active, `?tag=` filter) — `combo.service.ts:65`.
- Storefront-shortcut admin CRUD + public config with **autoPopulate** subcategory items — `storefront-shortcut.service.ts:139-155`; admin form exists in web-admin (`features/category/hooks/use-storefront-shortcut-form.ts`).
- Cart: `upsertCartItemAtomic` single-CTE resolve+stock-check upsert (`cart.service.ts:326,360-425`), `InventoryService.findOrCreateInventory` (:336).
- Category descendant resolution (`product-query.service.ts:289-323`), cursor pagination + Redis list cache (:167-208), HTTP cache middleware (`publicCache`/`privateNoStore`).
- `GET /category/:slug/storefront` — **no server HTTP cache** (client `staleTime` 5min). `publicCache` is only on the category tree route (`category.routes.ts:58`).

**Mobile** — StorefrontShortcutRenderer (3 display modes), CategorySearchHeader, FlashList grid (`category/[slug].tsx:92-110`), cursor-based `useProducts`, ProductCard pipeline, ComboBundleShowcase/Modal/helpers, CampaignCountdownBanner + countdown utils, SDUI widget registry (`widget-registry.tsx:65`) + home handlers, centralized query-key factories.

**Web-admin** — campaign/combo list+form pages (`features/marketing/pages/`), shortcut form hooks. No product `tags` input exists (payload builder still _sends_ them on create — see §2 C6).

**DB** — all tables + combo columns exist; only tag-drop migration (+ any verified index work) remains.

---

## 2. Corrections — the exact changes to the runbook (C1…C10)

**C1 — Delete Phase 1 step "Deploy pending migration."** It is applied; DB has 16 shortcuts. Phase 1 shrinks to: (a) optional `tags` drop + (b) _verified_ index decision (C5). **No migration is needed for combo cart** — `CartItem.combo_bundle_id/applied_discount/discount_source` already exist.

**C2 — Combo cart = extend `CartService`, one price authority.** Reuse the atomic CTE pattern: one batch statement for all bundle items (unnest arrays, `ON CONFLICT (cart_id, inventory_id)`), sorted by `inventoryId` (deadlock discipline), one interactive `$transaction({maxWait:5000,timeout:10000})` if extra validation is needed. Resolve inventory via `InventoryService.findOrCreateInventory`. Set `comboBundleId`, `appliedDiscount` (prorated), `discountSource: 'COMBO'`. **Critical missing piece in the runbook:** introduce ONE line-price helper (e.g. `resolveCartLineUnitPrice(cartItem)`) consumed by **both** `CartService.getCart` and the checkout pricing engine — otherwise the cart shows the combo discount but checkout charges full price.

**C3 — Out-of-stock fix belongs to `apps/mobile` only (single helper).** Do **not** touch the 13-key card contract. In `stock.ts`: add `variantHasTrackedStocks(variant)`; when variants carry no stock arrays, fall back to product-level `inStock` (already correct on cards). Centralize the selected-variant check into one helper consumed by `use-product-card.ts:186-189` and `color-swatch-item.tsx:29`. PDP keeps precise per-variant logic — `formatStorefrontDetail` still ships `stocks` (`product-response-shapes.ts:252-260`). Regression spec: a StorefrontCard with `inStock:true` + variant without `stocks` must evaluate `isOutOfStock === false`.

**C4 — Chips: ONE mechanism.** Mobile sends `subcategory` (slug), never `tag`; `category` stays as the browse root. Delete the `tag` filter param end-to-end. **This supersedes** `docs/plans/2026-10-17-...plan.md` Feature 4 fix F1 (`category: value || categorySlug`) — do not implement both. Keep chips typed: `subcategory` for chip rows; `campaign` param for campaign chips; shortcut `type` enum: drop `'tag'`, add `'campaign'` (keep `'collection'` for future curated lists).

**C5 — `count(*)` skip: implement, but scope it correctly.** `product-query.service.ts:167-170` → `const shouldCount = elevated || !isPublicStorefront` (mobile ignores `total`; web-admin stays elevated). Do **not** ship the prescribed composite index without re-measuring at production-like volume; if pursued, it needs a pair of indexes plus an OR→UNION query rewrite to be provably useful — current EXPLAIN shows 0.1ms plans on the live database.

**C6 — `tag` deprecation blast radius (order matters).** 1) Validator/API/mobile first (remove `productFilterSchema.tag`, `where.tags` filter, search OR `tags.has`, shortcut enum `'tag'`); 2) then web-admin payload builder (`add-product-payload.ts:849` — create path currently injects `tags`; updates omit) + specs; 3) then seed data (36 arrays) + importer; 4) migration `DROP COLUMN tags`. Search falls back to name/brand — acceptable; call it out in the PR.

**C7 — Campaign badge: do NOT expand the card contract.** Render badging on the campaign screen from its own context (`?campaign=slug` response). A global grid badge would require changing the 13-key card contract + specs — defer until the requirement is real (YAGNI).

**C8 — Shortcut service fixes (bundle into runbook Step 4.6).** `repo.findByCategoryId` has **no `isActive` filter** (`storefront-shortcut.repository.ts:34-39`) — deactivated shortcuts still render. Service output also drops `title` (`service.ts:157-164`). Fix both when adding the Redis cache; invalidate on shortcut CRUD.

**C9 — Cache ordering gate.** Any new caching (shortcut Redis 300s, category tree, storefront config) must land **after** the two blocking fixes from the companion forensic plan: (F1) vendor-scope override removal, (F2) auth-aware `publicCache` (`req.actor` → `private, no-store`). Caching an auth-blind endpoint multiplies the leak.

**C10 — Seed parity + idempotency.** `products.json` holds 36 items (24 platform + 12 Brothers) but DB has **37 published** (extra product `Men's Autumn/Winter … Crew Neck … Pullover`, created 2026-10-18). Campaign/combo seeds must resolve products **by slug at runtime**, upsert by unique slug, and not assume fixed UUIDs. Reconcile the 37th product (adopt into JSON or delete) so re-seeds are reproducible.

---

## 3. Duplicate-implementation ledger (the "no 5 implementations" audit)

**Documents in play**
| Doc | Role | Fate |
|---|---|---|
| `docs/plans/2026-10-18-...architecture.md` | "Why" blueprint (same content as chat session) | Context only — do not execute from it |
| `docs/plans/2026-10-18-...-agent-execution-runbook.md` | Execution plan | Keep, apply C1–C10 |
| `docs/plans/2026-10-17-storefront-search-category-tree-and-filter-drawer-plan.md` | Search (trigram+debounce), category-tree caching, filter drawer | Features 1–3 remain valid; **Feature 4 F1 superseded (C4)**, F2 = duplicate of runbook grid fix |
| `docs/audits/2026-10-17-mobile-category-browse-and-storefront-shortcut-audit.md` | Evidence base for the above | Reference only |
| `~/.opencode/plan/2026-10-18-forensic-cache-and-tenant-hardening-runbook.md` | Tenant override + auth-aware cache (F1/F2), dead code | **Blocking Phase 0** — executes first |

**Canonical owner per concern (one implementation each)**

- Tenant scoping / publicCache auth-awareness → forensic plan (blocks everything).
- Product query params: `subcategory` + `campaign` in, `tag` out → runbook (C4/C6).
- Combo cart + line-price authority → runbook (C2), single helper shared with checkout.
- Stock availability logic → `apps/mobile/src/features/products/utils/stock.ts` only (C3).
- Grid gutters → `category.styles.ts` `listContent`; delete dead `columnWrapper` (**verify** `wishlist.tsx` usage first — if its list is FlatList it may be legitimate there).
- Chips payload → `use-category-filters.ts` only; renderer/display modes untouched.
- Campaign navigation → new `app/campaign/[slug].tsx`; banner `onPress` → `router.push` (banner component only).
- Seeds → new `seed-campaigns.ts` / `seed-combos.ts`; storefront-shortcut seed exists.

**Dead code to delete (single sweep)**

- `category.styles.ts:72-76` `columnWrapper` (after wishlist check).
- `product-query.service.ts:280-282` tag branch; `251` tags OR; `product.validator.ts:236` `tag`; mobile `types.ts:111` + hook line 58.
- `sendPublicCachedWithETag` + `etag` CORS entry (from forensic plan F5).

---

## 4. Impact matrices

**C4/C6 — filter param surgery**
| Surface | Change | Risk |
|---|---|---|
| `productFilterSchema` | −`tag`, +`subcategory`, +`campaign` | Old clients sending `tag` → Zod strips (non-strict) → silently unfiltered; acceptable pre-production |
| `product-query.service` | +subcategory descendant intersect, +campaign id-set filter | 1 extra category query only when subcategory param present |
| Mobile `use-category-filters` | send `subcategory`/`campaign` | Chips start returning products — the visible fix |
| Seeds | strip 36 `tags` arrays last | Importer/DB drift if ordered wrong (C6 order) |
| Web-admin | payload builder + specs | Create flow currently injects tags — must update in same PR as schema drop |

**C2 — combo cart**
| Surface | Change | Risk |
|---|---|---|
| `CartItem` | write `comboBundleId`/`appliedDiscount`/`discountSource` | Unique `(cartId, inventoryId)` upsert handles overlap with plain adds |
| `getCart`/hydration | include `comboBundle` + discount fields | Response contract extension — mobile cart card must render effective price |
| Checkout pricing | single line-price helper | **Must land together** or cart/checkout diverge |
| `cart-pricing.engine` | untouched for promotions | Keep promo discounts separate from item-level combo discount |

**C3 — stock fix**
| Surface | Change | Risk |
|---|---|---|
| `stock.ts` | untracked-variants fallback | PDP unaffected (stocks present) |
| `use-product-card.ts`, `color-swatch-item.tsx` | use shared helper | Swatch OOS badge on cards becomes product-level (correct for the light projection) |
| API/shared-types | **no change** | 13-key contract + specs stay green |

**C5 — count skip**: one line; mobile ignores `total`; web-admin elevated unaffected.

---

## 5. Corrected execution order (merged, gated)

1. **Phase 0 (blocking):** forensic plan F1 (vendor scope) + F2 (auth-aware publicCache) + F5 dead-code.
2. **Phase 1 Contracts:** `productFilterSchema` (−tag, +subcategory, +campaign); `addComboToCartSchema`; **no** card-contract changes.
3. **Phase 2 API:** subcategory/campaign filters; count-skip; combo cart endpoint + shared line-price helper; shortcut `title`/`isActive` + Redis cache with invalidation (after Phase 0); campaign filter via `CampaignRepository`.
4. **Phase 3 Seeds:** parity fix (C10) → `seed-campaigns.ts` → `seed-combos.ts` → verify SQL.
5. **Phase 4 Mobile:** grid gutters + dead style removal; subcategory/campaign params + 300ms debounce; **stock fix (C3)**; ComboProductCard; modal `onAddToCart` wiring + cart invalidation + toast; `campaign/[slug]` screen + banner `onPress`; regression specs.
6. **Phase 5:** tag column drop migration (last), acceptance matrix, tag/search behavior note.

## 6. Acceptance checks (concrete)

- `GET /products?limit=2` → cards carry `inStock`; a card with `colorVariants` lacking `stocks` renders buyable in mobile (unit spec + manual).
- Chip tap on `/category/men` → `subcategory` param in request URL; result count > 0 (was 0).
- `GET /products?campaign=dashain-...` → only enrolled product ids.
- `POST /cart/combos` → `CartItem` rows carry `combo_bundle_id` + prorated `applied_discount`; cart line price and checkout line price identical (spec).
- Page-1 public list: no count query in logs; cursor pages unchanged.
- Shortcut admin deactivate → config response omits the shortcut.
- Re-run: `EXPLAIN` for category browse (document actual plan), `npx jest` deltas vs known baseline (pre-existing `seed-logistics-locations.spec.ts:94` failure + ~68 tsc errors are baseline).

**Evidence appendix** (verbatim, this review): migration row `20261016143545 … applied`; DB counts C=0/CP=0/CB=0/CBI=0/SS=16/Banner=0; EXPLAIN `Product_status_createdAt_idx` + Incremental Sort 0.121ms/24 buffers; live JSON card with `inStock:true` + variant without `stocks`; `cart.service.ts` zero combo-field references; `storefrontShortcutRepository.findByCategoryId` no `isActive`; `use-category-filters.ts:58` tag send; `campaign-countdown-banner.tsx:113` no onPress; `(tabs)/index.tsx:112-116` modal without `onAddToCart`.
