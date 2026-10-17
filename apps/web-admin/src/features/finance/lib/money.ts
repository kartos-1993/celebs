/**
 * Money, read off the wire as exact strings.
 *
 * Every figure here arrives from the API as a fixed two-decimal string because a
 * JSON number cannot hold a paisa reliably - 0.1 + 0.2 is 0.30000000000000004 in
 * binary floating point, and that error would land in a settlement a courier then
 * argues with us about. So these helpers work on the characters and never call
 * parseFloat: a number would reintroduce exactly the rounding the API went to the
 * trouble to avoid.
 *
 * The parsing and thousands-grouping are shared with the mobile app, so the two
 * cannot render the same figure differently. What lives here is only what is
 * specific to a settlement: which currency, and whether a variance is a shortfall.
 */

import { groupThousands, splitMoney,UNREADABLE_MONEY } from '@celebs/shared-utils';

const DEFAULT_CURRENCY = 'NPR';

/** Zero means no units and no paisa: -0.01 is one paisa short, not zero. */
function isZero(parts: { whole: string; fraction: string }): boolean {
  return parts.whole.replace(/^0+(?=\d)/, '') === '0' && parts.fraction === '00';
}

/**
 * Renders a figure, or a dash when it cannot be read.
 *
 * An unreadable amount is never coerced to zero. Zero is a real answer here - a
 * courier who collected nothing - and showing it in place of a value we failed to
 * parse would quietly understate what is owed.
 */
export function formatMoney(amount: string, currency: string = DEFAULT_CURRENCY): string {
  const parts = splitMoney(amount);
  if (!parts) return `${currency} ${UNREADABLE_MONEY}`;

  return `${parts.sign}${currency} ${groupThousands(parts.whole)}.${parts.fraction}`;
}

/**
 * Whether the courier paid less than we worked out they should.
 *
 * Compares characters, so -0.00 is recognised as agreement rather than as a
 * shortfall hiding behind a signed zero.
 */
export function isShortfall(variance: string): boolean {
  const parts = splitMoney(variance);
  if (!parts) return false;

  return parts.sign === '-' && !isZero(parts);
}

/**
 * The net an accountant sees while typing a statement, before anything is saved.
 *
 * Returns null rather than a guess when either figure is half-typed or malformed:
 * a preview that fills in the missing half would show a variance that is not the
 * one about to be recorded, which is worse than showing none.
 *
 * Arithmetic is done in whole paisa rather than on decimals. It is the same reason
 * as above - 0.1 + 0.2 in binary floating point is not 0.3 - and integer paisa are
 * exact. Third decimal places are refused rather than rounded, because the column
 * this feeds is two decimals wide and silently dropping one would hide a fraction
 * of a paisa that the database would not have accepted anyway.
 */
export function netFromDeclared(collected: string, fees: string): string | null {
  const TYPABLE = /^\d+(\.\d{1,2})?$/;

  const toPaisa = (value: string): number | null => {
    const trimmed = value.trim();
    if (!TYPABLE.test(trimmed)) return null;

    const [whole = '0', fraction = ''] = trimmed.split('.');

    return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  };

  const collectedPaisa = toPaisa(collected);
  const feesPaisa = toPaisa(fees);
  if (collectedPaisa === null || feesPaisa === null) return null;

  const net = collectedPaisa - feesPaisa;
  const sign = net < 0 ? '-' : '';
  const absolute = Math.abs(net);

  return `${sign}${Math.floor(absolute / 100)}.${String(absolute % 100).padStart(2, '0')}`;
}
export function formatSignedVariance(variance: string): string {
  const parts = splitMoney(variance);
  if (!parts) return UNREADABLE_MONEY;

  const magnitude = formatMoney(variance.replace(/^-/, ''));

  if (isShortfall(variance)) return `${magnitude} short`;
  if (parts.sign === '-' || isZero(parts)) return 'Agreed';

  return `${magnitude} over`;
}
