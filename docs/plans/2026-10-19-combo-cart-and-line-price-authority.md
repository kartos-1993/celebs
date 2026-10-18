# Combo Cart + Single Line-Price Authority

**Date:** 2026-10-19
**Branch:** `feat/combo-cart-and-line-price-authority` (stacked on `feat/storefront-subcategory-campaign-filters`)
**Origin:** corrected execution order Phase 1/2, item **C2** — `docs/plans/2026-10-18-runbook-review-verdict-and-corrections.md`.

## Problem

Combos exist as data (`ComboBundle`, `ComboBundleItem`) but there is no way to buy
one: no `POST /cart/combos`, no schema, no proration, no cart projection of the
discount. Worse, the runbook's original design omitted the one piece that makes
it safe: cart display and checkout must share **one line-price helper**, or the
cart shows the combo discount and checkout charges the full price.

## Verified anchors

- `apps/api/src/db/schema.prisma:222-242` — `CartItem` already has `combo_bundle_id`, `applied_discount` (`Decimal(10,2)`), `discount_source`; unique `(cartId, inventoryId)`. **No migration needed** (C1).
- `apps/api/src/db/schema.prisma:565-595` — `ComboBundle` (`discountType`, `discountValue`, `isActive`) + `ComboBundleItem` (`defaultQuantity`, `isRequired`).
- `cart.service.ts:125-128` — `getCart` prices lines inline (`rawDiscounted || rawPrice`) and never reads `appliedDiscount`; subtotal at `:145-146` uses the same inline price.
- `checkout.service.ts:197-203` — checkout prices lines inline too (`discountedPrice > 0 ? discountedPrice : price`) — a second, subtly different rule (no `< price` guard) answering the same question.
- `packages/shared-utils/src/utils/sku-generator.ts:169-173` — client `validDiscount`: `0 < discountedPrice < price` else list. The server checkout rule is missing the upper bound; the helper below adopts the stricter client rule server-side.
- `cart.service.ts:360-430` — the existing atomic single-item CTE (resolve-or-create inventory + stock-checked upsert). `:691-705` — the `unnest` batch upsert template (syncCart).
- `inventory.service.ts:47-135` — `findOrCreateInventory` is race-safe (`createInventoryIfAbsent`) and owns the JSON-stocks fallback; reused instead of duplicating that logic in SQL.
- `cart.repository.ts:36-86` — hydration already selects everything needed (CartItem scalars come along; product price + discountedPrice selected).
- `checkout.repository.ts:60-71` — checkout cart fetch includes CartItem scalars too, so `appliedDiscount` is already in scope at the call site.
- `combo.repository.ts:26-33` — `findBySlug`/`findById` include `items`.
- `apps/mobile/src/features/cart/utils/cart-selectors.ts:18` — mobile unit price is computed client-side (`validDiscount(price, discountedPrice) ?? price`); used by `use-cart-queries.ts:34` (fallback) and totals.
- `cart.validator.ts` — no `addComboToCartSchema`; routes/controller have no combo endpoint.

## Decisions

1. **One line-price authority** — new `apps/api/src/modules/cart/cart-line-price.ts`:
   - `resolveCartLineBasePrice` = sale price only when `0 < discountedPrice < price`, else list (mirrors `validDiscount`, fixes checkout's missing guard).
   - `resolveCartLineUnitPrice` = base − per-unit combo discount, floored at 0, 2dp HALF_UP.
   - Consumed by **`CartService.getCart`** (line subtotal + response) and **checkout line pricing** (`checkout.service.ts`), replacing both inline copies.
2. **Contract extension** (`CartItemHydrated`): `unitPrice` (required, the charged per-unit figure), `appliedDiscount` (required, per-unit combo discount, `0` otherwise), `comboBundleId?`, `discountSource?`. Mobile `getUnitPrice` now returns the server's `unitPrice` — display reads the same number checkout charges; the client `validDiscount` math stays only for the discount-% badge.
3. **Proration (runbook 4.4)**:
   - `PERCENTAGE`: per-unit discount = `product.price × value/100` (list price, per the runbook), rounded 2dp.
   - `FIXED_AMOUNT`: per-line discount = `value / line count`, per-unit = that ÷ line quantity, 2dp HALF_UP. Keeps the bundle's total discount ≈ `discountValue` regardless of line quantities (±1 cent rounding drift, documented).
   - `discountSource = 'COMBO'` (review wording; `comboBundleId` already carries the bundle identity).
4. **Payload quantity is optional** (deviation from the runbook's `.default(1)`): omitted → the bundle item's `defaultQuantity`. The modal picks variant/size; quantity is the bundle's business.
5. **Validation**: bundle exists (404) and is active (400); every payload product belongs to the bundle and appears once; all `isRequired` items present; products must still exist.
6. **Write path** — inventories resolved up-front via `InventoryService.findOrCreateInventory` (race-safe), payload sorted by resolved `inventoryId` (lock-order discipline), then **one batch CTE** (`unnest` + `ON CONFLICT (cart_id, inventory_id)` with a live stock predicate) inside **one interactive `$transaction({ maxWait: 5000, timeout: 10000 })`**. If fewer rows than lines are written (a line lost a stock race), the transaction throws → nothing is added. All-or-nothing bundle semantics.
7. **Merge semantics**: re-adding the same bundle merges quantity and keeps prorated fields. A **plain add onto a combo line is refused** (400, explicit message) via `AND "CartItem"."combo_bundle_id" IS NULL` on the plain upsert — deviation from silent merge, to stop the combo's per-unit discount from silently covering units added at full price. `syncCart`'s bulk merge gets the same predicate (its contract is silent skipping).
8. **Commission** applies to the post-combo line subtotal (the amount actually charged) — snapshotted per line as today. Documented, not changed.
9. **Out of scope** (later phases): combo badge on the cart line (Phase 4 UI), seeds (Phase 3), `ComboProductCard`/modal.

## Files

- `packages/shared-types/src/validators/cart.validator.ts` — `addComboToCartSchema` + type.
- `packages/shared-types/src/types/cart.ts` — `CartItemHydrated` fields.
- `apps/api/src/modules/cart/cart-line-price.ts` — NEW authority + combo proration helper.
- `apps/api/src/modules/cart/cart.service.ts` — `getCart` via helper, `addComboToCart`, batch CTE, plain-upsert combo guard, `syncCart` guard.
- `apps/api/src/modules/cart/cart.controller.ts` + `cart.routes.ts` — `POST /cart/combos`.
- `apps/api/src/modules/order/checkout/checkout.service.ts` — line pricing via helper.
- `apps/mobile/src/features/cart/utils/cart-selectors.ts` — `getUnitPrice` reads `unitPrice`.
- Specs: new `cart-line-price.spec.ts`, new `cart-combo.spec.ts`, new `cart.validator.spec.ts` (shared-types); updated `cart-selectors.spec.ts` (+ fixture touch-ups).

## Acceptance (from the review doc)

- Combo add writes `comboBundleId` / prorated `appliedDiscount` / `discountSource: 'COMBO'` onto every bundle `CartItem`.
- `getCart` subtotal and line `unitPrice` include the discount; checkout charges the same figure (same helper call).
- Unknown/inactive bundle, foreign product, missing required item, stock shortfall → clear 4xx with nothing written.
- Overlap with plain adds is handled by the `(cartId, inventoryId)` upsert; merging same bundle keeps one line.
