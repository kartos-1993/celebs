# Mobile Stock Availability Fix — List Card "OUT OF STOCK" False Positive

**Date:** 2026-10-18
**Branch:** `fix/mobile-stock-availability` (stacked on `fix/tenant-scope-and-cache-auth-hardening`)
**Origin:** review correction C3 — mobile-only fix in `stock.ts` helpers; the extend-the-13-key-card-contract approach is rejected.

## Problem (reproduced live)

The storefront list card payload (`GET /products`) ships `inStock: true` but its
`colorVariants` carry **no `stocks` rows** — the list projection
(`PRODUCT_LIST_SELECT`) selects `colorVariants`/`skus` but not the
`ProductInventory` rows that the detail presenter merges in. Verified live:

```json
{ "inStock": true, "colorVariants": [{ "name": "Black", "images": ["…"] }] }
```

Mobile then judges that payload with fail-closed helpers:

- `isProductFullyOutOfStock` (`stock.ts:108-133`) only trusts `inStock === true`
  when there are **no** color variants; with variants present it falls through
  to `variants.every(isVariantOutOfStock)` — and `isVariantOutOfStock` treats a
  missing `stocks` array as depleted (`stock.ts:102-106`).
- `use-product-card.ts:186-187` compounds it: the selected variant is judged
  with the same fail-closed rule, so every card renders "OUT OF STOCK".

The PDP is fine: the detail payload ships `stocks` per variant, so fail-closed
there remains correct (and is pinned by existing specs).

## Server contract (why `inStock` is trustworthy on cards)

`product-format.ts:176-199` derives `inStock = derivedStockTotal > 0` from the
max of: live variant rows (when resolved), **SKU stock** (`skus` IS selected on
the list projection), and relational `ProductInventory` totals. A card-level
`inStock: true` therefore reflects real sellable stock — it is the only
authoritative inventory signal on the card surface.

## Decision

Mobile-only fix (C3). Do **not** expand the 13-key card contract with
per-variant `stocks` — the list projection intentionally omits them and the
card-level boolean already answers the card's question ("can this be bought at
all?"). PDP semantics stay untouched.

## Changes

1. `apps/mobile/src/features/products/utils/stock.ts`
   - `isTrackedVariantOutOfStock(variant)`: true only when the variant ships an
     inventory array (`Array.isArray(variant.stocks)`) and every tracked entry
     is depleted. An omitted array = unknown on the card surface → defers to
     the product-level signal, preserving fail-closed for tracked-but-empty.
   - `isProductFullyOutOfStock`: variant-level judgment applies only when at
     least one variant tracks inventory; otherwise fall back to
     `inStock === true` / positive `totalStock`, and fail closed without a
     signal. (Unifies the previous no-variants branch with the fix.)
2. `apps/mobile/src/features/products/hooks/use-product-card.ts`
   - Selected-variant check uses the tracked-only helper, so an untracked list
     variant can no longer force every card OOS; product-level result governs.

Failure modes preserved: tracked-empty/depleted variants stay OOS
(`stocks: []`), no-signal payloads stay OOS, PDP behavior unchanged.

## Verification

- RED first: new specs asserting a stocks-omitted card with `inStock: true` is
  **not** fully OOS (currently true → failing).
- Guards: `stocks: []` and depleted tracked variants still OOS; mixed payloads
  with any tracked variant defer to variant rows; no-flag payloads stay OOS.
- `vitest run` for the products feature + full mobile suite; typecheck delta.

## Acceptance

List cards with `inStock: true` and stocks-omitted variants render buyable;
genuinely depleted products still render OUT OF STOCK on both card and PDP.
