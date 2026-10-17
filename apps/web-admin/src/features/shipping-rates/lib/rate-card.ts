import { MAX_QUOTABLE_PARCEL_KG, MIN_FREE_DELIVERY_THRESHOLD } from '@celebs/shared-types';

/**
 * Validation for the rate card form.
 *
 * Kept as pure functions so the rules are tested without rendering anything. They
 * mirror the API's rules on purpose: the point is to catch an obvious mistake
 * before a round trip, not to be the only thing standing between a typo and a
 * stored price. The server still refuses an overlapping band.
 */

export const GENERAL_CITY = '__general__';

export interface BandDraft {
  id: string | null;
  cityId: string;
  minWeightKg: string;
  maxWeightKg: string;
  fee: string;
  codFee: string;
}

export const emptyBand = (): BandDraft => ({
  id: null,
  cityId: GENERAL_CITY,
  minWeightKg: '',
  maxWeightKg: '',
  fee: '',
  codFee: '',
});

/**
 * Parses a field that holds money or weight.
 *
 * Returns null rather than NaN so a caller cannot accidentally push NaN into a
 * payload, and trims first because a pasted " 80 " is a number an admin meant.
 */
export const asNumber = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

/** A band with no width would match no parcel and price nothing, forever. */
export function validateBand(draft: BandDraft): string[] {
  const problems: string[] = [];
  const min = asNumber(draft.minWeightKg);
  const max = asNumber(draft.maxWeightKg);
  const fee = asNumber(draft.fee);
  const codFee = draft.codFee.trim() ? asNumber(draft.codFee) : 0;

  if (min === null) problems.push('Minimum weight is required.');
  if (max === null) problems.push('Maximum weight is required.');
  if (min !== null && max !== null && max <= min) {
    problems.push('Maximum weight must be greater than minimum weight.');
  }
  if (max !== null && max > MAX_QUOTABLE_PARCEL_KG) {
    problems.push(`Cannot quote above ${MAX_QUOTABLE_PARCEL_KG} kg.`);
  }
  if (min !== null && min < 0) problems.push('Minimum weight cannot be negative.');
  if (fee === null || fee < 0) problems.push('Fee is required.');
  if (codFee === null || codFee < 0) problems.push('Cash on delivery fee cannot be negative.');

  return problems;
}

/** Thresholds are whole rupees; a threshold of 1 would make every order free. */
export function validateThreshold(value: string): string | null {
  const parsed = asNumber(value);

  if (parsed === null) return 'Enter the amount in NPR.';
  if (!Number.isInteger(parsed)) return 'Enter a whole amount of NPR.';
  if (parsed < MIN_FREE_DELIVERY_THRESHOLD) {
    return `Enter at least NPR ${MIN_FREE_DELIVERY_THRESHOLD}.`;
  }

  return null;
}

/** The payload the API expects, with the general city sent as null. */
export function toRatePayload(draft: BandDraft) {
  return {
    cityId: draft.cityId === GENERAL_CITY ? null : draft.cityId,
    minWeightKg: asNumber(draft.minWeightKg)!,
    maxWeightKg: asNumber(draft.maxWeightKg)!,
    fee: asNumber(draft.fee)!,
    codFee: draft.codFee.trim() ? asNumber(draft.codFee)! : 0,
  };
}
