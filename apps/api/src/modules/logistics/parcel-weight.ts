import {
  MAX_PARCEL_WEIGHT_KG,
  MIN_PARCEL_WEIGHT_KG,
  VOLUMETRIC_DIVISOR,
  WEIGHT_DECIMALS,
} from '@celebs/shared-types';

import { Prisma } from '@/config/db.prisma';

/**
 * Authoritative billable-weight arithmetic.
 *
 * The shared `resolveParcelWeightKg` produces the same figure for display, but
 * it works in floating point. A courier settles against the weight stored on
 * the order, so the stored value is computed here in `Prisma.Decimal`:
 *
 *   - `0.7 * 3` is 2.0999999999999996 in binary; Decimal gives exactly 2.1.
 *   - `toFixed` rounds 1.005 down to 1.00; `toDecimalPlaces(ROUND_HALF_UP)`
 *     gives 1.01.
 *
 * Every result is rounded half-up to the gram, and a weight is never reported
 * as zero: a parcel no courier will accept gets the floor, which is the
 * expensive direction, never the cheap one.
 */

export interface BillableLineInput {
  weightKg: number | null | undefined;
  quantity: number;
  lengthCm?: number | null;
  widthCm?: number | null;
  heightCm?: number | null;
}

function roundWeight(value: Prisma.Decimal): Prisma.Decimal {
  return value.toDecimalPlaces(WEIGHT_DECIMALS, Prisma.Decimal.ROUND_HALF_UP);
}

/** Volume-derived weight, or undefined when the dimensions are unusable. */
export function volumetricWeightDecimal(
  lengthCm: number | null | undefined,
  widthCm: number | null | undefined,
  heightCm: number | null | undefined,
): Prisma.Decimal | undefined {
  if (lengthCm == null || widthCm == null || heightCm == null) return undefined;
  if (lengthCm <= 0 || widthCm <= 0 || heightCm <= 0) return undefined;

  return new Prisma.Decimal(lengthCm)
    .mul(new Prisma.Decimal(widthCm))
    .mul(new Prisma.Decimal(heightCm))
    .div(new Prisma.Decimal(VOLUMETRIC_DIVISOR));
}

/** Forces a total weight into the range a courier will accept. */
export function clampWeightDecimal(weight: Prisma.Decimal): Prisma.Decimal {
  if (weight.lte(0)) return new Prisma.Decimal(MIN_PARCEL_WEIGHT_KG);
  if (weight.gt(MAX_PARCEL_WEIGHT_KG)) return new Prisma.Decimal(MAX_PARCEL_WEIGHT_KG);
  return weight;
}

/**
 * Billable weight of one order line: mass and volume compared, quantity
 * applied, then clamped. A product with no recorded weight contributes the
 * minimum, because an unknown weight is not a zero weight.
 */
export function computeBillableLineWeightKg(input: BillableLineInput): Prisma.Decimal {
  const quantity = Number.isFinite(input.quantity) && input.quantity > 0 ? input.quantity : 0;
  if (quantity === 0) return new Prisma.Decimal(MIN_PARCEL_WEIGHT_KG);

  const unit =
    input.weightKg === null || input.weightKg === undefined || !Number.isFinite(input.weightKg)
      ? new Prisma.Decimal(MIN_PARCEL_WEIGHT_KG)
      : new Prisma.Decimal(input.weightKg);

  const volumetric = volumetricWeightDecimal(input.lengthCm, input.widthCm, input.heightCm);
  const billable = volumetric && volumetric.gt(unit) ? volumetric : unit;

  return clampWeightDecimal(roundWeight(billable.mul(new Prisma.Decimal(quantity))));
}

/** Sums line weights into the order's billable weight, in Decimal. */
export function sumBillableWeightKg(weights: readonly Prisma.Decimal[]): Prisma.Decimal {
  const total = weights.reduce((sum, weight) => sum.add(weight), new Prisma.Decimal(0));
  return clampWeightDecimal(roundWeight(total));
}
