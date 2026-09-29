import { Prisma } from '@/config/db.prisma';

/**
 * Delivery pricing: what the customer is charged, and what the business
 * actually pays.
 *
 * Two figures come out of one calculation on purpose. The customer charge can be
 * zero while the courier cost is not — that is what a free-delivery threshold
 * means — so keeping them separate is what makes the cost of the thresholds
 * visible instead of silent.
 */

export interface RateBand {
  id: string;
  /** Null means a general rate applying to any city. */
  cityId: string | null;
  /** Half-open band [minWeightKg, maxWeightKg). */
  minWeightKg: number;
  maxWeightKg: number;
  fee: number;
  codFee: number;
  isActive: boolean;
}

export type PricingSource = 'RATE_CARD' | 'FALLBACK';

export interface DeliveryPricingInput {
  subtotal: number;
  weightKg: number;
  isCod: boolean;
  /** The destination zone's threshold; higher outside the valley. */
  freeDeliveryThreshold: number;
  /** Platform fallback, used when no rate band matches. */
  flatShippingFee: number;
  rates: readonly RateBand[];
  cityId?: string | null;
}

export interface DeliveryPricingResult {
  /** What the customer pays for delivery. */
  shippingFee: number;
  /** What the courier would charge us, whether or not the customer pays it. */
  courierFee: number;
  /** What we give up by waiving delivery. */
  absorbedCost: number;
  isFreeDelivery: boolean;
  source: PricingSource;
  matchedRateId: string | null;
}

/**
 * Finds the band for a weight, preferring a city-specific rate.
 *
 * Bands are half-open so a parcel exactly on a boundary belongs to the higher
 * band, which is the more expensive one. A gap in the card must never produce a
 * free shipment, so an unmatched weight falls back rather than pricing at zero.
 */
export function findRateBand(
  weightKg: number,
  rates: readonly RateBand[],
  cityId?: string | null,
): RateBand | undefined {
  const candidates = rates.filter(
    (rate) =>
      rate.isActive &&
      rate.cityId === (cityId ?? null) &&
      weightKg >= rate.minWeightKg &&
      weightKg < rate.maxWeightKg,
  );

  if (candidates.length === 0) return undefined;

  // Most specific match wins: a city rate over a general one.
  return candidates.reduce((best, rate) => (rate.cityId ? rate : best), candidates[0]!);
}

export function resolveDeliveryPricing(input: DeliveryPricingInput): DeliveryPricingResult {
  const band = findRateBand(input.weightKg, input.rates, input.cityId);

  const courierFee = band
    ? new Prisma.Decimal(band.fee).plus(input.isCod ? band.codFee : 0)
    : new Prisma.Decimal(input.flatShippingFee);

  // An order with nothing in it is not shipped, so it is never charged
  // delivery — it also cannot clear a free-delivery threshold, and charging a
  // fee to an empty basket is how a stray line becomes an uncollectable parcel.
  const isEmptyOrder = !Number.isFinite(input.subtotal) || input.subtotal <= 0;
  if (isEmptyOrder) {
    return {
      shippingFee: 0,
      courierFee: 0,
      absorbedCost: 0,
      isFreeDelivery: true,
      source: band ? 'RATE_CARD' : 'FALLBACK',
      matchedRateId: band?.id ?? null,
    };
  }

  const qualifiesForFreeDelivery = input.subtotal >= input.freeDeliveryThreshold;

  return {
    shippingFee: qualifiesForFreeDelivery ? 0 : courierFee.toNumber(),
    courierFee: courierFee.toNumber(),
    absorbedCost: qualifiesForFreeDelivery ? courierFee.toNumber() : 0,
    isFreeDelivery: qualifiesForFreeDelivery,
    source: band ? 'RATE_CARD' : 'FALLBACK',
    matchedRateId: band?.id ?? null,
  };
}
