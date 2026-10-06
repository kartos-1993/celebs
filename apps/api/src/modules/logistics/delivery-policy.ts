import { money } from './money';

import { Prisma } from '@/config/db.prisma';

const ZERO = new Prisma.Decimal(0);

/**
 * Turns a quoted courier cost into the four numbers checkout needs.
 *
 * The distinction this file exists to protect: what the *customer* pays for
 * delivery is not what the *courier* costs us. The moment those are one number,
 * a free-delivery threshold becomes free money on every order above it - the
 * threshold waives the charge, and nothing records that the courier still
 * invoiced us. So `courierCost` is carried alongside `customerCharge` all the way
 * to settlement, and `absorbedCost` is the size of that gap.
 *
 * `codPercentage` is a fraction, not a percentage. Pathao returned `cod_percentage:
 * 0.01` for one percent, and treating it as a percent value costs a factor of
 * 100 in whichever direction we get it wrong.
 */
export interface DeliveryPolicyInput {
  /** Goods total for the order, already exact. */
  subtotal: Prisma.Decimal;
  /** Sum of the courier's per-seller quotes. Passes through untouched. */
  quotedCourierFee: Prisma.Decimal;
  /** City threshold above which delivery is waived for the customer. */
  freeDeliveryThreshold: Prisma.Decimal;
  isCod: boolean;
  /** The courier's own cash-handling rate, as a fraction: 0.01 is one percent. */
  codPercentage: Prisma.Decimal;
}

export interface DeliveryPolicyResult {
  /** What the customer is billed for delivery. Zero when waived. */
  customerCharge: Prisma.Decimal;
  /** What the courier will invoice us, regardless of what we charged. */
  courierCost: Prisma.Decimal;
  /** The courier's percentage charge for collecting cash. Zero unless COD. */
  codHandlingFee: Prisma.Decimal;
  /** Delivery we paid for and did not charge back. */
  absorbedCost: Prisma.Decimal;
  /** Goods total, carried so a caller can reconcile its own arithmetic. */
  subtotal: Prisma.Decimal;
  /** What the customer owes in total: goods, delivery and any handling. */
  totalPayable: Prisma.Decimal;
  /** What the courier collects on a COD order, excluding handling. */
  amountToCollect: Prisma.Decimal;
  isFreeDelivery: boolean;
}

/**
 * A quoted fee is clamped rather than trusted. A negative courier fee is not a
 * refund, it is a broken upstream response, and subtracting it from the customer's
 * bill would be inventing a discount nobody agreed to.
 */
function nonNegative(value: Prisma.Decimal): Prisma.Decimal {
  return value.isNegative() ? ZERO : value;
}

export function applyDeliveryPolicy(input: DeliveryPolicyInput): DeliveryPolicyResult {
  const subtotal = nonNegative(input.subtotal);
  const courierCost = nonNegative(input.quotedCourierFee);

  // An empty basket has nothing to deliver. Without this, a quote of 0 on a
  // subtotal of 0 would still clear the threshold comparison and be reported as
  // free delivery, which reads as a discount on nothing.
  if (subtotal.isZero()) {
    return {
      subtotal,
      customerCharge: ZERO,
      courierCost: ZERO,
      codHandlingFee: ZERO,
      absorbedCost: ZERO,
      totalPayable: ZERO,
      amountToCollect: ZERO,
      isFreeDelivery: false,
    };
  }

  const isFreeDelivery =
    !input.freeDeliveryThreshold.isNegative() &&
    subtotal.greaterThanOrEqualTo(input.freeDeliveryThreshold);

  const customerCharge = isFreeDelivery ? ZERO : courierCost;

  // The courier charges on what it collects, and on a free-delivery COD order the
  // customer still walks away with the goods. Measured: 1500 collected cost 15.
  const amountToCollect = money(subtotal.add(customerCharge));
  const codHandlingFee = input.isCod
    ? money(amountToCollect.mul(nonNegative(input.codPercentage)))
    : ZERO;

  // Only the free-delivery case is an absorption. Otherwise the customer is paying
  // the courier's cost plus the handling, and we hold no delivery margin.
  const absorbedCost = isFreeDelivery ? money(courierCost.add(codHandlingFee)) : ZERO;

  return {
    subtotal,
    customerCharge,
    courierCost,
    codHandlingFee,
    absorbedCost,
    totalPayable: money(amountToCollect.add(codHandlingFee)),
    amountToCollect,
    isFreeDelivery,
  };
}
