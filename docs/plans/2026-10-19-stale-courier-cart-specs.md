# Cart Zone-Pricing Specs: Sync With the Decoupled Contract

**Date:** 2026-10-19
**Branch:** `fix/stale-courier-cart-specs` (stacked on `fix/cart-delivery-weight-parity`)
**Origin:** the only remaining red in the cart module — surfaced by the C2 batch run and documented in `docs/plans/2026-10-19-combo-cart-and-line-price-authority.md` ("Batch anomalies ruled out").

## Problem

Two tests in `cart-zone-pricing.spec.ts` still assert the courier-quote era of
cart delivery pricing and fail on every run (`expected 150 to be 300`):

- `'sends the parcel to the courier rather than pricing it from a band'` — expects
  the suite's courier stub (`pathaoPriceClient.quote`, 300 above 1 kg) to price
  the cart.
- `'does not let a rate band override the courier'` — expects the courier to win
  over a rate band.

Commit `c40a2da5` (Oct 10, "decouple checkout from 3PL quotes and wire Pathao
sandbox dispatch") deliberately moved cart and checkout onto
`resolveDeliveryPricing` — destination rate bands, flat policy fee fallback, free
above the zone threshold — and never updated this spec. The spec was last written
by `39f70d21` (Oct 6). Both are pre-session; verified by stashing every C2 change
and reproducing the identical failure.

## Current contract (verified in code, not assumed)

- `cart.service.ts` `getCart` → `resolveDeliveryPricing` with
  `deliveryPricingRepository.activeRates(destination.cityId)` — general
  (`cityId = null`) bands plus the destination city's (`delivery-pricing.repository.ts:89-105`).
- `delivery-pricing.ts:70-88` `findRateBand` — a matching city band is preferred
  over a general one; an unmatched weight → flat policy fee (`:95-100`).
- `deliveryIsEstimate = destination === null` (`cart.service.ts:253`); a
  destination is an active zone on an active city (`:262-278`).
- `thresholdForAddress` (`delivery-pricing.repository.ts:50-75`) requires only an
  active zone + active city — no courier-source check. The fixture's
  "checkout refuses to quote a non-courier city" comment is stale too.

## Decision

Rewrite the two stale tests to the shipped contract, keeping their protective
intent, and correct the two stale comments. No implementation change: the shipped
behavior is the verified one — the tests are the stale surface.

1. → `prices from the destination rate card, preferring the district band over
the general one` — seeds a general band and a district band for the same
   weight bracket with different fees; asserts the district fee, and not the
   general/flat figures. (Proves the destination actually prices the cart.)
2. → `charges the flat policy fee when no band matches the parcel weight` —
   seeds a band covering a different weight; asserts the flat policy fee and not
   the band's fee. (An unmatched band must never price the parcel.)
3. Comment fixes: the district test's "the courier's answer" justification
   becomes "the destination resolves"; the fixture's courier-source rationale
   states what the code actually requires.

Cleanup note: test 1 seeds a general band (`cityId = null`), which the existing
`cityId IN (...)` cleanup cannot reach — rates are tracked by id instead.

## Acceptance

- `cart-zone-pricing.spec.ts` 9/9.
- Cart + combo modules fully green — no known red left in the cart module.
- Spec-file-only diff.
