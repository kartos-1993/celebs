/**
 * Money, read off the wire as exact strings.
 *
 * Every figure here arrives from the API as a fixed two-decimal string because a
 * JSON number cannot hold a paisa reliably - 0.1 + 0.2 is 0.30000000000000004 in
 * binary floating point, and that error would land in a settlement a courier then
 * argues with us about. So these helpers work on the characters and never call
 * parseFloat: a number would reintroduce exactly the rounding the API went to the
 * trouble to avoid.
 */

const DEFAULT_CURRENCY = 'NPR';

/** Anything that is not a plain decimal is shown as unreadable rather than guessed at. */
const DECIMAL = /^(-?)(\d+)(?:\.(\d+))?$/;

export const UNREADABLE_MONEY = '—';

function splitDecimal(amount: string): { sign: string; whole: string; fraction: string } | null {
  const match = DECIMAL.exec(amount.trim());
  if (!match) return null;

  const [, sign = '', whole = '0', fraction = ''] = match;

  return { sign, whole, fraction: fraction.padEnd(2, '0').slice(0, 2) };
}

/** Zero means no units and no paisa: -0.01 is one paisa short, not zero. */
function isZero(parts: { whole: string; fraction: string }): boolean {
  return parts.whole.replace(/^0+(?=\d)/, '') === '0' && parts.fraction === '00';
}

function withThousands(whole: string): string {
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Renders a figure, or a dash when it cannot be read.
 *
 * An unreadable amount is never coerced to zero. Zero is a real answer here - a
 * courier who collected nothing - and showing it in place of a value we failed to
 * parse would quietly understate what is owed.
 */
export function formatMoney(amount: string, currency: string = DEFAULT_CURRENCY): string {
  const parts = splitDecimal(amount);
  if (!parts) return `${currency} ${UNREADABLE_MONEY}`;

  return `${parts.sign}${currency} ${withThousands(parts.whole)}.${parts.fraction}`;
}

/**
 * Whether the courier paid less than we worked out they should.
 *
 * Compares characters, so -0.00 is recognised as agreement rather than as a
 * shortfall hiding behind a signed zero.
 */
export function isShortfall(variance: string): boolean {
  const parts = splitDecimal(variance);
  if (!parts) return false;

  return parts.sign === '-' && !isZero(parts);
}

/**
 * The line an accountant reads off a settlement: who is short, and by how much.
 *
 * Plain zero is a real outcome and gets said out loud, because "Agreed" is the
 * only version of this that anybody disputes nothing about.
 */
export function formatSignedVariance(variance: string): string {
  const parts = splitDecimal(variance);
  if (!parts) return UNREADABLE_MONEY;

  const magnitude = formatMoney(variance.replace(/^-/, ''));

  if (isShortfall(variance)) return `${magnitude} short`;
  if (parts.sign === '-' || isZero(parts)) return 'Agreed';

  return `${magnitude} over`;
}
