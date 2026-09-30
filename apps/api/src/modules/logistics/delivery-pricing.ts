import { Prisma } from '@/config/db.prisma';

/**
 * Delivery pricing: what the customer is charged, and what the business
 * actually pays.
 *
 * Two figures come out of one calculation on purpose. The customer charge can be
 * zero while the courier cost is not — that is what a free-delivery threshold
 * means — so keeping them separate is what makes the cost of the thresholds
 * visible instead of silent.
 *
 * Everything is `Prisma.Decimal`. This is the figure a courier invoice is
 * reconciled against and the figure the customer is charged, so it must not pass
 * through a binary float: 0.1 + 0.2 is 0.30000000000000004, and 2.675 kg is
 * 2.67499999999999982, which prices a parcel in the cheaper band.
 */

export interface RateBand {
  id: string;
  /** Null means a general rate applying to any city. */
  cityId: string | null;
  /** Half-open band [minWeightKg, maxWeightKg). */
  minWeightKg: Prisma.Decimal;
  maxWeightKg: Prisma.Decimal;
  fee: Prisma.Decimal;
  codFee: Prisma.Decimal;
  isActive: boolean;
}

export type PricingSource = 'RATE_CARD' | 'FALLBACK';

export interface DeliveryPricingInput {
  subtotal: Prisma.Decimal;
  weightKg: Prisma.Decimal;
  isCod: boolean;
  /** The destination zone's threshold; higher outside the valley. */
  freeDeliveryThreshold: Prisma.Decimal;
  /** Platform fallback, used when no rate band matches. */
  flatShippingFee: Prisma.Decimal;
  rates: readonly RateBand[];
  cityId?: string | null;
}

export interface DeliveryPricingResult {
  /** What the customer pays for delivery. */
  shippingFee: Prisma.Decimal;
  /** What the courier would charge us, whether or not the customer pays it. */
  courierFee: Prisma.Decimal;
  /** What we give up by waiving delivery. */
  absorbedCost: Prisma.Decimal;
  isFreeDelivery: boolean;
  source: PricingSource;
  matchedRateId: string | null;
}

/** Pauses and couriers bill in whole paisa, so the stored figure is rounded once. */
const MONEY_DECIMALS = 2;
const ZERO = new Prisma.Decimal(0);

const money = (value: Prisma.Decimal) =>
  value.toDecimalPlaces(MONEY_DECIMALS, Prisma.Decimal.ROUND_HALF_UP);

/**
 * Finds the band for a weight, preferring a city-specific rate.
 *
 * Bands are half-open so a parcel exactly on a boundary belongs to the higher
 * band, which is the more expensive one. A gap in the card must never produce a
 * free shipment, so an unmatched weight falls back rather than pricing at zero.
 *
 * A band with no city applies to every city; a band written for the destination
 * overrides it. Another city's band never applies.
 */
export function findRateBand(
  weightKg: Prisma.Decimal,
  rates: readonly RateBand[],
  cityId?: string | null,
): RateBand | undefined {
  const matching = rates.filter(
    (rate) =>
      rate.isActive &&
      weightKg.greaterThanOrEqualTo(rate.minWeightKg) &&
      weightKg.lessThan(rate.maxWeightKg),
  );

  const destination = cityId ?? null;

  return (
    matching.find((rate) => rate.cityId !== null && rate.cityId === destination) ??
    matching.find((rate) => rate.cityId === null)
  );
}

export function resolveDeliveryPricing(input: DeliveryPricingInput): DeliveryPricingResult {
  const band = findRateBand(input.weightKg, input.rates, input.cityId);

  // A rate band carries its own collection fee. The platform fallback is a single
  // flat number with no collection component, so it is used as-is.
  const courierFee = money(
    band ? band.fee.plus(input.isCod ? band.codFee : ZERO) : input.flatShippingFee,
  );

  const source: PricingSource = band ? 'RATE_CARD' : 'FALLBACK';
  const matchedRateId = band?.id ?? null;

  // An order with nothing in it is not shipped, so it is never charged
  // delivery — it also cannot clear a free-delivery threshold, and charging a
  // fee to an empty basket is how a stray line becomes an uncollectable parcel.
  if (input.subtotal.lessThanOrEqualTo(ZERO)) {
    return {
      shippingFee: ZERO,
      courierFee: ZERO,
      absorbedCost: ZERO,
      isFreeDelivery: true,
      source,
      matchedRateId,
    };
  }

  const qualifiesForFreeDelivery = input.subtotal.greaterThanOrEqualTo(input.freeDeliveryThreshold);

  return {
    shippingFee: qualifiesForFreeDelivery ? ZERO : courierFee,
    courierFee,
    absorbedCost: qualifiesForFreeDelivery ? courierFee : ZERO,
    isFreeDelivery: qualifiesForFreeDelivery,
    source,
    matchedRateId,
  };
}
