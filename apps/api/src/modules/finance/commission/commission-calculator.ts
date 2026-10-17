import { Prisma } from '@/config/db.prisma';

/**
 * Commission, per line, in Decimal.
 *
 * The rule the whole design rests on:
 *
 *   sellerNet = gross - commission
 *
 * Never `gross * (1 - rate)`. Those two disagree by a paisa on many prices,
 * because the multiply rounds a third time. Over a month of orders the ledger
 * stops tying to the payouts and nobody can say which figure is right - which is
 * exactly the distrust we are trying to build away. One derivation, one rounding.
 *
 * The rate is a percentage held to two decimals: 7.50 means seven and a half
 * percent, and a superadmin typing `7.5` means the same thing.
 */

export const COMMISSION_RATE_DECIMALS = 2;
export const ZERO = new Prisma.Decimal(0);

/** The largest rate we accept. Above it a seller would owe us money. */
export const MAX_COMMISSION_PERCENT = new Prisma.Decimal(100);

/** 100 as a percentage: 7.50% of 3601 is 7.50 / 100 of it. */
const ONE_HUNDRED_PERCENT = new Prisma.Decimal(100);

/**
 * Commission on one order line.
 *
 * Rounded half-up, once. A line is the unit because a per-order calculation lets a
 * seller reduce their commission by splitting a sale into more orders - rounding
 * then favours whoever fragments.
 */
export function commissionForLine(
  grossAmount: Prisma.Decimal,
  ratePercent: Prisma.Decimal,
): Prisma.Decimal {
  if (grossAmount.lessThanOrEqualTo(ZERO)) return ZERO;

  // A negative or absurd rate is rejected at the point it is written, so this is a
  // guard rather than a rule: it must never silently produce a negative charge.
  if (ratePercent.lessThan(ZERO) || ratePercent.greaterThan(MAX_COMMISSION_PERCENT)) {
    throw new RangeError(`Commission rate out of range: ${ratePercent.toFixed(2)}%`);
  }

  // Divided by 100, not scaled: the rate is already expressed in percent, so
  // multiplying by it again would charge a hundred times over.
  const commission = grossAmount.mul(ratePercent).div(ONE_HUNDRED_PERCENT);

  return commission.toDecimalPlaces(COMMISSION_RATE_DECIMALS, Prisma.Decimal.ROUND_HALF_UP);
}

/**
 * What the seller keeps on a line.
 *
 * Derived by subtraction so it can never disagree with the commission recorded
 * beside it.
 */
export function sellerNetForLine(
  grossAmount: Prisma.Decimal,
  commissionAmount: Prisma.Decimal,
): Prisma.Decimal {
  return grossAmount
    .minus(commissionAmount)
    .toDecimalPlaces(COMMISSION_RATE_DECIMALS, Prisma.Decimal.ROUND_HALF_UP);
}

/**
 * The rate that actually applied to a gross amount.
 *
 * Not equal to the nominal rate, and that is expected rather than a defect: a
 * two-decimal list price cannot represent `1 / 0.925` exactly, so a seller
 * targeting Rs 900 net lists at 972.97 and the effective rate is 7.4997%.
 *
 * Surfaced in the seller's calculator so the figure they see can be checked by
 * subtracting the commission from the gross. Bounded and worst on cheap goods,
 * where one paisa of rounding is a visible share of the price.
 */
export function effectiveRatePercent(
  grossAmount: Prisma.Decimal,
  commissionAmount: Prisma.Decimal,
): Prisma.Decimal {
  if (grossAmount.lessThanOrEqualTo(ZERO)) return ZERO;

  return commissionAmount
    .mul(ONE_HUNDRED_PERCENT)
    .div(grossAmount)
    .toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP);
}

export interface RefundableLine {
  lineId: string;
  vendorId: string;
  subtotal: Prisma.Decimal;
  commissionAmount: Prisma.Decimal;
}

export interface CommissionReversal {
  lineId: string;
  vendorId: string;
  amount: Prisma.Decimal;
}

/**
 * How much commission a refund hands back, per seller.
 *
 * A refunded order returns the seller nothing - no money, no product - so the
 * commission has to go back too. Keeping it would mean banking a cut of a sale
 * that never completed, which is precisely the money a return policy exists to
 * protect, and the seller would see commission taken against a sale they did not
 * get paid for.
 *
 * Proportional on a partial refund, and **capped at the commission actually
 * taken** on that line. A goodwill credit or a post-refund price correction can
 * refund more than the goods were worth; without the cap that would pay out
 * commission which was never charged, turning a refund into revenue.
 *
 * Lines that paid no commission are skipped rather than returned as zero, so the
 * caller cannot post a zero-valued reversal.
 */
export function commissionReversals(
  lines: readonly RefundableLine[],
  refundAmount: Prisma.Decimal,
): CommissionReversal[] {
  if (!refundAmount.greaterThan(ZERO)) return [];

  const chargeable = lines.filter((line) => line.commissionAmount.greaterThan(ZERO));
  if (chargeable.length === 0) return [];

  const totalSubtotal = chargeable.reduce(
    (total, line) => total.plus(line.subtotal),
    new Prisma.Decimal(0),
  );

  if (!totalSubtotal.greaterThan(ZERO)) return [];

  // A refund covering the whole order returns every rupee of commission, rather
  // than the rounded-down remainder of a proportional split.
  const isFullRefund = refundAmount.greaterThanOrEqualTo(totalSubtotal);

  return chargeable.map((line) => {
    const share = isFullRefund
      ? line.commissionAmount
      : line.commissionAmount.mul(refundAmount).div(totalSubtotal);

    const rounded = share.toDecimalPlaces(COMMISSION_RATE_DECIMALS, Prisma.Decimal.ROUND_HALF_UP);
    // The cap stops a goodwill refund paying out commission that was never
    // charged, which would turn a refund into revenue.
    const amount = rounded.lessThan(line.commissionAmount) ? rounded : line.commissionAmount;

    return { lineId: line.lineId, vendorId: line.vendorId, amount };
  });
}

/**
 * The price a seller should list at to keep a target amount after commission.
 *
 * This is the seller's tool, so it rounds the list price up to a whole paisa and
 * then derives the commission from it. The seller then nets exactly what they
 * asked for rather than a paisa less.
 *
 * A rate of 100% has no solution - there is no list price that nets anything - so
 * it is refused rather than returning Infinity.
 */
export function listPriceForNet(
  desiredNet: Prisma.Decimal,
  ratePercent: Prisma.Decimal,
): { listPrice: Prisma.Decimal; commission: Prisma.Decimal; sellerNet: Prisma.Decimal } {
  if (desiredNet.lessThanOrEqualTo(ZERO)) {
    throw new RangeError('A target amount must be greater than zero');
  }

  if (ratePercent.greaterThanOrEqualTo(MAX_COMMISSION_PERCENT)) {
    throw new RangeError(
      `A commission of ${ratePercent.toFixed(2)}% leaves no list price that nets ${desiredNet.toFixed(2)}`,
    );
  }

  const retainedPercent = ONE_HUNDRED_PERCENT.minus(ratePercent);
  const rawListPrice = desiredNet.mul(100).div(retainedPercent);

  const listPrice = rawListPrice.toDecimalPlaces(
    COMMISSION_RATE_DECIMALS,
    Prisma.Decimal.ROUND_HALF_UP,
  );
  const commission = listPrice.minus(desiredNet);

  return {
    listPrice,
    commission: commission.toDecimalPlaces(COMMISSION_RATE_DECIMALS, Prisma.Decimal.ROUND_HALF_UP),
    sellerNet: sellerNetForLine(listPrice, commission),
  };
}
