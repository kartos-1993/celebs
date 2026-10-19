# Mobile Combo Checkout and Campaign Destination

**Date:** 2026-10-19
**Branch:** `feat/mobile-combo-campaign-ui` (stacked on `feat/seed-data-parity`)
**Origin:** runbook Phase 5, Steps 5.5–5.7 — `docs/plans/2026-10-18-storefront-campaign-combo-agent-execution-runbook.md:743-812`.

## Problem

The backend combo/campaign work is complete, but the mobile surface still stops at
display:

1. `ComboBundleModal` already accepts `onAddToCart`, but `HomeScreen` never passes
   it. "Add Combo to Cart" builds a selection and calls nothing, then closes.
2. There is no mobile client, hook, or cart-context method for
   `POST /cart/combos`. The server endpoint shipped in C2.
3. `CampaignCountdownBanner`'s CTA is a `TouchableOpacity` with no `onPress`, and
   no `/campaign/[slug]` screen exists — the campaign is a dead end.
4. The combo showcase renders a bespoke 260px card, not a card that matches the
   standard product grid; there is no inline `ComboProductCard`.
5. A campaign product list has no mobile destination, even though
   `?campaign=` is supported end-to-end by the product API and the campaign chip
   mapping (C4) is already live.

## Verified anchors

- `apps/mobile/src/features/home/components/combo-bundle-modal.tsx:21` — optional
  `onAddToCart`; `:59-70` builds `selectedVariants` keyed by **display-item id**
  and invokes the callback without awaiting it.
- `apps/mobile/src/features/home/utils/combo-bundle-helpers.ts:21-53` — display
  rows carry the bundle-item `id`, not the product id.
  `apps/mobile/src/features/home/types.ts:48-54` — `ComboItemData` carries
  `id`, `productId`, `defaultQuantity`, `product`.
- `packages/shared-types/src/validators/cart.validator.ts:29-43` —
  `addComboToCartSchema`: `comboBundleId` + `items[{ productId,
colorVariantName, size, quantity? }]`.
- `apps/api/src/modules/cart/cart.service.ts:371-560` — the service resolves
  `quantity` from the bundle item's `defaultQuantity`, requires every
  `isRequired` item, resolves inventory by `(productId, colorVariantName, size)`
  via `findOrCreateInventory`, and rejects a shortfall. A wrong size/color pair
  therefore fails with a misleading zero-stock error after creating a useless
  inventory row.
- `apps/api/src/modules/cart/cart.routes.ts:12` — `POST /cart/combos` is public
  (`optionalAuthenticateJWT`), so the guest session header is the only identity.
- `apps/mobile/src/features/cart/context/cart-context.tsx:49-60` — the cart
  provider owns the guest session id and all cart mutations; `HomeScreen` sits
  inside it (`apps/mobile/src/app/_layout.tsx:79`).
- `apps/mobile/src/features/home/components/campaign-countdown-banner.tsx:113` —
  CTA has no `onPress`; `widget-registry.tsx:58-62` passes only
  `initialCampaigns`.
- `apps/api/src/modules/campaign/campaign.routes.ts` — public `GET
/campaigns/:slug` exists (no mobile client yet);
  `apps/mobile/src/features/home/api.ts:32-50` has only `/campaigns/active` and
  `/combos`, while `CAMPAIGN_QUERY_KEYS.detail` is already declared at `:16`.
- `apps/mobile/src/features/products/types.ts:107` — `ProductFilterParams` has
  `campaign`; `use-products.ts:32-47` forwards all filter params.
- `apps/mobile/src/features/products/hooks/use-product-card.ts:31-32,51` — the
  standard grid width is computed inline from `GRID_PADDING`/`COLUMN_GAP`.

## Decisions (and deviations from the runbook sample)

1. **Map bundle-item ids, never treat them as product ids.** The runbook's 5.6
   sample does `Object.entries(selectedVariants).map(([productId, ...])`, but
   those keys are bundle-item ids; the server would answer "A selected product is
   not part of this combo bundle". The helper resolves each bundle-item id to its
   `productId`.
2. **Use the user's actual size/color; do not invent `'M'`/`'Standard'`.** The
   modal only offers values the product declares. If any displayed row lacks a
   size or color, adding is refused **before** the network call with an actionable
   message, rather than creating a zero-stock inventory row server-side.
3. **Omit `quantity`.** The server's contract resolves it from the bundle item's
   `defaultQuantity`; sending `1` (as the sample does) would override the authored
   bundle quantity.
4. **Displayed rows are the payload source of truth.** `getComboDisplayItems`
   gains the already-known `productId`. `buildComboCartInput` reuses those rows
   and refuses if the bundle declares rows the API could not hydrate — the server
   would reject the incomplete bundle anyway.
5. **No optimistic combo patch.** The server allocates the bundle discount across
   lines (`resolveComboLineUnitDiscounts`); the client cannot reproduce the exact
   per-unit prices. The mutation replaces the cached cart from the response.
6. **Cart context owns the mutation.** Add `addComboToCart` to `CartContextType`
   instead of resolving the guest session in `HomeScreen` a second time.
7. **One combo card.** Build `ComboProductCard` and rewrite the showcase to render
   it; do not keep two card implementations. Width comes from a shared
   `getProductCardWidth` extracted from `use-product-card`, so it matches the
   standard grid exactly.
8. **Campaign screen fetches the campaign by slug**, not by filtering
   `/campaigns/active`: a deep link to a sale that ended minutes ago still renders
   its real title/banner instead of a 404-by-omission. Products come from
   `useProducts({ campaign: slug })`. C7 is respected: no product-card contract
   change and no global campaign badge.
9. **One countdown implementation.** Extract `useCountdown(endDate)` and use it in
   both the banner and the campaign screen instead of a second `setInterval`.
10. **Navigation stays in the host.** Add `onPressCampaign` to
    `SDUIActionHandlers`; the widget registry forwards it to the banner, and
    `HomeScreen` pushes `/campaign/[slug]`.
11. **Scope exclusions.** Step 5.1 shipped in `fix/mobile-stock-availability`
    (`68a7cab9`); 5.3 was superseded by C4 and is already live; 5.4 (search
    debounce) belongs to the parked 2026-10-17 plan and is not touched here.

## Steps

1. Shared primitives: `getProductCardWidth`, `useCountdown`, `ComboSelectedVariants`
   in `home/types.ts`, and `productId` on `RenderableBundleItem`.
2. Cart client: `addComboToCartApi`, `useAddComboToCartMutation`,
   `addComboToCart` in `CartContextType` + provider.
3. Pure `buildComboCartInput(combo, selectedVariants)`.
4. `ComboProductCard` + styles; showcase rewired to it.
5. `HomeScreen`: pass `onAddToCart`, toast failures, open the cart sheet on
   success; add the campaign navigation handler.
6. Banner `onPress` + widget registry + `Stack.Screen` registration.
7. `/campaign/[slug]`: header (back, cart, countdown), themed hero, 2-column
   `FlashList`, loading/empty/error states.
8. Gates and execution log.

## Tests (RED first)

- `features/home/utils/__tests__/combo-cart-input.spec.ts`
  - resolves bundle-item id → product id;
  - keeps the selected size/color;
  - omits `quantity` (server default);
  - throws on a missing size/color, naming the product;
  - throws when a declared bundle row was not renderable;
  - supports the `items` fallback when `itemDetails` is absent.
- `features/products/utils/__tests__/card-layout.spec.ts`
  - matches the standard two-column formula;
  - clamps at a sane minimum for narrow windows.
- `features/home/components/__tests__/mobile-combo-campaign-wiring.spec.ts`
  (source pins, matching the existing node-env test style)
  - cart client posts `/cart/combos`;
  - `HomeScreen` passes `onAddToCart` and navigates with
    `/campaign/[slug]`;
  - the banner CTA carries `onPress`;
  - `_layout.tsx` registers the campaign route;
  - the campaign screen uses `useProducts({ campaign: slug })` and the detail
    hook.
- Existing specs must stay green: `combo-bundle-helpers.spec.ts`,
  `campaign-content.spec.ts`, `use-category-filters.spec.ts`.

## Gates

- `npx vitest run <new specs>` from `apps/mobile` (RED → GREEN).
- Full `npm test` (vitest) in `apps/mobile`.
- `npx tsc --noEmit` in `apps/mobile` — zero errors.
- No changes under `apps/api` or `packages/*`; no product-card contract change.
