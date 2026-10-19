# Cart Delivery Pricing: Same Billable Weight as Checkout

**Date:** 2026-10-19
**Branch:** `fix/cart-delivery-weight-parity` (stacked on `feat/combo-cart-and-line-price-authority`)
**Origin:** discovered while implementing C2 — `docs/plans/2026-10-19-combo-cart-and-line-price-authority.md`, "Discovered while editing".

## Problem

The cart can show a delivery fee the customer will not be charged — the same defect
class C2 removed from line pricing, still live on the delivery axis.

`CartService.getCart` prices delivery from **declared** weight (`packageWeightKg ×
quantity`, `cart.service.ts:165-167` → `:250`) while its volumetric-aware
`billableWeightKg` accumulation (`:186-198`) is never read: its only appearance is
its own accumulation on the right-hand side.

`CheckoutService` prices the same delivery from **billable** weight: per-line
`computeBillableLineWeightKg` (mass vs volume, `parcel-weight.ts:89-101`) summed
and passed to the same `resolveDeliveryPricing` (`checkout.service.ts:214-220`,
`:265-279`).

A product whose volumetric weight exceeds its declared weight — large, light goods;
40×30×20 cm is 4.8 kg volumetric at the 5000 divisor — lands in a cheaper band on
the cart than checkout charges.

## Verified anchors

- `cart.service.ts:165-184` — vendor-grouped `previewParcels` built with
  `declaredWeightKg` and `goodsAmount`.
- `cart.service.ts:186-198` — `billableWeightKg` accumulated per available line
  (same call shape as checkout) but never read.
- `cart.service.ts:250-261` — `totalWeightKg` from parcel declared weights feeds
  `resolveDeliveryPricing`.
- `checkout.service.ts:214-220, 265-279` — billable per line → sum → same resolver.
- `parcel-weight.ts:89-107` — `computeBillableLineWeightKg`: `max(mass, volume) ×
quantity`, gram-rounded, clamped `[0.5, 10]` kg; `sumBillableWeightKg` sums and
  clamps. `VOLUMETRIC_DIVISOR = 5000` (`parcel-weight.validator.ts:20`).
- Since `c40a2da5` ("decouple checkout from 3PL quotes"), the parcels'
  `goodsAmount` / `vendorId` / `lineIds` have no consumer; their only surviving
  use is the declared-weight sum — vestigial machinery.

## Decision

1. Feed `resolveDeliveryPricing` the line-accumulated `billableWeightKg` — the
   identical call shape checkout uses — and delete the vestigial parcel machinery
   (`previewParcels`, the `QuoteSellerParcelInput` import, `PLATFORM_VENDOR_ID` if
   it falls dead).
2. No change to `resolveDeliveryPricing`, rate bands, thresholds, or the response
   shape: this is a weight-input fix, not a pricing-model change.
3. Checkout untouched.

## Test plan — new spec `cart-delivery-weight-parity.spec.ts`

- **RED case:** product 0.5 kg declared, 40×30×20 cm (4.8 kg volumetric), quantity
  1; city bands `[0,1) = 100` and `[4,5) = 260` → cart must show **260**
  (declared-only pricing shows 100).
- **Guard case:** declared 4.5 kg with small dims (0.2 kg volumetric) → still
  **260**: max-of-both, never volumetric-only.
- Fixtures and cleanup mirror `cart-zone-pricing.spec.ts`.

## Acceptance

- `cart.shippingFee` for a dims-heavy product equals the band for its billable
  weight — the same figure checkout's resolver call computes.
- Vestigial parcel machinery removed; `tsc` 0; cart/combo suites green.
- The pre-existing `cart-zone-pricing.spec.ts` courier pair stays untouched
  (separate stale-spec concern, documented in the C2 log).
