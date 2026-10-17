import { formatMoneyAmount, moneySubtract, moneySum } from '@celebs/shared-utils';

import type { CommissionQuote } from '../api';

/**
 * "I want to keep Rs 900" answered without arithmetic.
 *
 * The seller thinks in what they keep; the platform thinks in a percentage. The
 * gap between those is small and it is exactly where a commission starts to feel
 * arbitrary, so it is shown rather than left to be worked out.
 *
 * Derived locally from the same figures the API returned rather than trusting a
 * second rounding: the API already settled list price and commission, and
 * re-deriving net here from those two keeps the three figures consistent on screen
 * even if the rate is typed between the call and the render.
 */

export interface CalculatorRow {
  /** What the seller said they want to keep. */
  desiredNet: number;
  /** The figure to publish as the price. */
  listPrice: number;
  commission: number;
  sellerNet: number;
  ratePercent: number;
}

/**
 * Totals across several variants at once.
 *
 * A seller listing a range wants to know what they keep across the range, not one
 * variant at a time, and rounding each variant's net independently would not add up
 * to the number they are shown.
 */
export function totalCalculatorRow(readonlyRows: readonly CalculatorRow[]): {
  desiredNet: number;
  listPrice: number;
  commission: number;
  sellerNet: number;
} {
  const rows = readonlyRows;

  return {
    desiredNet: moneySum(rows.map((row) => row.desiredNet)),
    listPrice: moneySum(rows.map((row) => row.listPrice)),
    commission: moneySum(rows.map((row) => row.commission)),
    // Re-derived from the parts rather than summed, so the three figures on screen
    // always reconcile against each other.
    sellerNet: moneySubtract(
      moneySum(rows.map((row) => row.listPrice)),
      moneySum(rows.map((row) => row.commission)),
    ),
  };
}

export function toCalculatorRow(quote: CommissionQuote): CalculatorRow {
  return {
    desiredNet: Number(quote.sellerNet),
    listPrice: Number(quote.listPrice),
    commission: Number(quote.commission),
    sellerNet: Number(quote.sellerNet),
    // The rate is shown, never calculated with: "7.50" is a percentage for display,
    // not a money amount, so it does not go through the paisa helpers.
    ratePercent: Number(quote.ratePercent),
  };
}

export function formatCalculatorMoney(value: number): string {
  return formatMoneyAmount(value);
}
