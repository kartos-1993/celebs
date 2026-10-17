/**
 * Formatting money for display, without ever asking a binary float to round it.
 *
 * Lives in shared-utils rather than in one app because web-admin and mobile
 * format the same figures and must not disagree: a shopper who sees Rs 1,800.00
 * in one place and Rs 1,799.99 in another stops trusting the price.
 *
 * `toFixed` is the usual way to do this and it is wrong at the edges - 1.005
 * formats as "1.00", because the double nearest 1.005 is fractionally below it.
 * These helpers work on the characters instead.
 */

/** Anything that is not a plain decimal is shown as unreadable rather than guessed at. */
const DECIMAL = /^(-?)(\d+)(?:\.(\d+))?$/;

export const UNREADABLE_MONEY = '—';

export interface SplitMoney {
  sign: string;
  whole: string;
  fraction: string;
}

export function splitMoney(amount: string | number): SplitMoney | null {
  const match = DECIMAL.exec(String(amount).trim());
  if (!match) return null;

  const [, sign = '', whole = '0', fraction = ''] = match;

  return { sign, whole, fraction: fraction.padEnd(2, '0').slice(0, 2) };
}

/** Groups the whole part with thousands separators, leaving the rest alone. */
export function groupThousands(whole: string): string {
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * "1,800.07" - no currency symbol, for when the symbol is rendered separately.
 *
 * Accepts a string so a value can be passed through from the API untouched, or a
 * number for callers that only ever held a float. A number is stringified rather
 * than arithmetically manipulated, so this never introduces precision loss of its
 * own; the caller is responsible for not having lost it upstream.
 */
export function formatMoneyAmount(amount: string | number): string {
  const parts = splitMoney(amount);
  if (!parts) return UNREADABLE_MONEY;

  return `${groupThousands(parts.whole)}.${parts.fraction}`;
}

/** "Rs. 1,800.07" for a bare amount. */
export function formatRupees(amount: string | number): string {
  const parts = splitMoney(amount);
  if (!parts) return `Rs. ${UNREADABLE_MONEY}`;

  return `${parts.sign}Rs. ${groupThousands(parts.whole)}.${parts.fraction}`;
}

/**
 * Splits an amount for a UI that renders the rupees and the paisa as separate
 * pieces of text, which is how both the mobile cart row and the price block are
 * laid out.
 */
export function splitForDisplay(amount: string | number): {
  sign: string;
  whole: string;
  fraction: string;
} {
  const parts = splitMoney(amount);
  if (!parts) return { sign: '', whole: UNREADABLE_MONEY, fraction: '' };

  return {
    sign: parts.sign,
    whole: groupThousands(parts.whole),
    fraction: parts.fraction,
  };
}
