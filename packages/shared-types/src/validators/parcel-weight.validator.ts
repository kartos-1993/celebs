/**
 * Parcel weight — the input every courier quote depends on.
 *
 * Couriers bill the greater of actual mass and volume, enforce a floor, and cap
 * the maximum. Getting this wrong in the cheap direction under-declares a
 * parcel: the courier charges the difference on collection, or refuses it. So
 * every rule here errs towards the heavier, more expensive answer.
 */

/** Carriers reject parcels below this. Pathao's documented floor is 0.5 kg. */
export const MIN_PARCEL_WEIGHT_KG = 0.5;

/** Above this a parcel is no longer a single-parcel shipment. */
export const MAX_PARCEL_WEIGHT_KG = 10;

/**
 * Grams per kilogram used to convert volume to a billable weight. Matches the
 * divisor the admin shipping-dimensions card already uses.
 */
export const VOLUMETRIC_DIVISOR = 5000;

/** Weight is stored and compared to the gram. */
export const WEIGHT_DECIMALS = 3;

/**
 * Rounds half-up to the nearest gram.
 *
 * `toFixed` is deliberately avoided: it rounds from the binary representation,
 * so 1.005 becomes 1.00 rather than 1.01. `Number.EPSILON` is not used either,
 * because it is a single unit in the last place of 1.0 and does not cover the
 * range of values here. Scaling by 1000 and adding a margin comfortably larger
 * than the accumulated error of a few float operations at these magnitudes
 * (weights cap at 10 kg, i.e. 10 000 grams) gives the intended tie behaviour
 * without ever being able to move a genuine non-tie.
 *
 * The authority for a stored weight is the API's `Prisma.Decimal` computation;
 * this exists so a displayed figure matches what is stored.
 */
export function roundWeightToGrams(weightKg: number): number {
  if (!Number.isFinite(weightKg)) return weightKg;
  return Math.round(weightKg * 1000 + 1e-9) / 1000;
}

export interface ParcelWeightItem {
  /** Product's recorded weight. Optional: many products have never been set. */
  weightKg: number | null | undefined;
  quantity: number;
  lengthCm?: number | null;
  widthCm?: number | null;
  heightCm?: number | null;
}

/** Volume-derived weight, or undefined when the dimensions are unusable. */
export function volumetricWeightKg(
  lengthCm: number | null | undefined,
  widthCm: number | null | undefined,
  heightCm: number | null | undefined,
): number | undefined {
  if (
    lengthCm === null ||
    lengthCm === undefined ||
    widthCm === null ||
    widthCm === undefined ||
    heightCm === null ||
    heightCm === undefined
  ) {
    return undefined;
  }

  if (lengthCm <= 0 || widthCm <= 0 || heightCm <= 0) return undefined;

  return roundWeightToGrams((lengthCm * widthCm * heightCm) / VOLUMETRIC_DIVISOR);
}

/**
 * Forces a total weight into the range a courier will actually accept: at or
 * above the floor, at or below the cap.
 */
export function clampParcelWeight(weightKg: number | null | undefined): number {
  if (weightKg === null || weightKg === undefined) return MIN_PARCEL_WEIGHT_KG;
  if (!Number.isFinite(weightKg) || weightKg <= 0) return MIN_PARCEL_WEIGHT_KG;
  return Math.min(Math.max(weightKg, MIN_PARCEL_WEIGHT_KG), MAX_PARCEL_WEIGHT_KG);
}

/**
 * The billable weight of a whole order: the sum of each line's weight times its
 * quantity, compared against the order's volumetric weight, then clamped once.
 *
 * The floor is applied to the total, not to each line. Three 0.1 kg shirts
 * travel as one 0.3 kg parcel that a courier bills at the 0.5 kg minimum, not as
 * three separate sub-minimum parcels.
 *
 * A line with no recorded weight contributes the minimum, because an unknown
 * weight is not a zero weight — that is the direction that gets a parcel
 * rejected rather than one that quietly under-declares.
 */
export function resolveParcelWeightKg(items: readonly ParcelWeightItem[]): number {
  let actualTotal = 0;
  let volumetricTotal = 0;

  for (const item of items) {
    const quantity = Number.isFinite(item.quantity) && item.quantity > 0 ? item.quantity : 0;
    if (quantity === 0) continue;

    const weight = item.weightKg;
    actualTotal +=
      (weight === null || weight === undefined ? MIN_PARCEL_WEIGHT_KG : weight) * quantity;

    // Volumetric is accumulated per line rather than as one box around
    // everything, so a bulky item is not diluted by a long run of light ones.
    const volumetric = volumetricWeightKg(item.lengthCm, item.widthCm, item.heightCm);
    if (volumetric !== undefined) {
      volumetricTotal += volumetric * quantity;
    }
  }

  // Rounded once at the end rather than per line: rounding each line first
  // would let a one-gram rounding accumulate across a large order.
  return clampParcelWeight(roundWeightToGrams(Math.max(actualTotal, volumetricTotal)));
}
