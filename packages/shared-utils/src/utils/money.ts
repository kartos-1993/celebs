/**
 * Exact money arithmetic for the clients, in whole paisa.
 *
 * The API sends every money figure as a two-decimal string precisely because a
 * JSON number cannot hold a paisa reliably, and the backend keeps money as a
 * Decimal end to end. The clients were the remaining gap: they held rupees as JS
 * numbers and added them, so a cart of three 0.10 items rendered as
 * 0.30000000000000004 while checkout showed the server's 0.30. Two screens, two
 * prices, one of them not real.
 *
 * Rather than pull a Decimal dependency into three apps, the maths is done in
 * whole paisa and converted once on the way out. For a two-decimal value that is
 * exact - the rounding here is undoing the binary representation error, not
 * deciding anything.
 *
 * A value may become a plain number in a client. It may not be *computed* with
 * one.
 */

const PAISA_PER_RUPEE = 100;

/**
 * Rupees to whole paisa.
 *
 * Math.round rather than truncation, because a two-decimal price multiplied by 100
 * lands fractionally off an integer and truncating would drop a paisa off a price
 * a shopper is shown.
 */
export function toPaisa(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * PAISA_PER_RUPEE);
}

const toRupees = (paisa: number): number => paisa / PAISA_PER_RUPEE;

/** Adds two amounts exactly. */
export function moneyAdd(a: number, b: number): number {
  return toRupees(toPaisa(a) + toPaisa(b));
}

/** Adds any number of amounts exactly. */
export function moneySum(values: readonly number[]): number {
  return toRupees(values.reduce((total, value) => total + toPaisa(value), 0));
}

/** Multiplies an amount by a whole count exactly - a price times a quantity. */
export function moneyMultiply(amount: number, quantity: number): number {
  if (!Number.isInteger(quantity)) {
    throw new Error(`moneyMultiply needs a whole quantity, got ${quantity}`);
  }

  return toRupees(toPaisa(amount) * quantity);
}

/** Subtracts exactly. */
export function moneySubtract(a: number, b: number): number {
  return toRupees(toPaisa(a) - toPaisa(b));
}

/** The larger of two amounts, compared exactly. */
export function moneyMax(a: number, b: number): number {
  return toPaisa(a) >= toPaisa(b) ? a : b;
}

/**
 * A percentage of an amount, exactly.
 *
 * For a percentage discount on a price a shopper is shown. In floating point
 * `1800.50 * 7.5 / 100` is not a clean number, and the result then feeds a
 * subtraction that is quoted back to the customer.
 */
export function moneyPercentOf(amount: number, percent: number): number {
  const paisa = toPaisa(amount);
  if (!Number.isFinite(percent)) return 0;

  return toRupees(Math.round((paisa * percent) / 100));
}

/**
 * The whole-number discount percentage a shopper sees on a badge.
 *
 * Clamped at zero: a figure above the list price is not a discount, and
 * rendering it as one would be a lie in the other direction.
 */
export function discountPercentFrom(price: number, discountedPrice: number): number {
  const pricePaisa = toPaisa(price);
  if (pricePaisa <= 0) return 0;

  const savedPaisa = pricePaisa - toPaisa(discountedPrice);
  if (savedPaisa <= 0) return 0;

  return Math.round((savedPaisa / pricePaisa) * 100);
}

export type MoneyComparison = '<' | '<=' | '>' | '>=' | '=';

/**
 * Compares two amounts exactly.
 *
 * Used for the free-delivery threshold and the cash-on-delivery ceiling, both of
 * which decide whether a shopper is charged. `0.1 + 0.2 >= 0.3` is true in decimal
 * and false in binary floating point, and that difference is a customer either
 * wrongly charged delivery or wrongly refused cash on delivery.
 */
export function compareMoney(a: number, operator: MoneyComparison, b: number): boolean {
  const left = toPaisa(a);
  const right = toPaisa(b);

  switch (operator) {
    case '<':
      return left < right;
    case '<=':
      return left <= right;
    case '>':
      return left > right;
    case '>=':
      return left >= right;
    case '=':
      return left === right;
    default:
      throw new Error(`Unknown money comparison: ${operator as string}`);
  }
}
