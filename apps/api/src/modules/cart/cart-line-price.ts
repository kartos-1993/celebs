import { Prisma } from '@prisma/client';

/**
 * The single authority for what a cart line's unit price is.
 *
 * Two surfaces ask this question — `CartService.getCart` (what the shopper is
 * shown) and checkout line pricing (what the shopper is charged). They used to
 * answer it with two inline copies of the same arithmetic, one of which was
 * missing the "sale price must be below list" guard. Every divergence between
 * those copies is a cart that shows one figure and a checkout that charges
 * another, so the rule lives here exactly once and both call it.
 */
export interface CartLinePriceSource {
  price: Prisma.Decimal | number | string | null;
  discountedPrice?: Prisma.Decimal | number | string | null;
  appliedDiscount?: Prisma.Decimal | number | string | null;
}

const toDecimal = (
  value: Prisma.Decimal | number | string | null | undefined,
): Prisma.Decimal | null => {
  if (value === null || value === undefined) return null;
  return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
};

/**
 * Sale price only when it is a real discount — strictly below the list price
 * and above zero. Mirrors the client's `validDiscount` choke point so an
 * above-list or zero `discountedPrice` can never inflate a charged amount.
 */
export function resolveCartLineBasePrice(source: CartLinePriceSource): Prisma.Decimal {
  const list = toDecimal(source.price) ?? new Prisma.Decimal(0);
  const sale = toDecimal(source.discountedPrice);

  if (sale && sale.gt(0) && sale.lt(list)) return sale;
  return list;
}

/**
 * The charged per-unit price: the base price minus any per-unit combo discount,
 * floored at zero so a stale bundle can never make a line negative.
 */
export function resolveCartLineUnitPrice(source: CartLinePriceSource): Prisma.Decimal {
  const base = resolveCartLineBasePrice(source);
  const discount = toDecimal(source.appliedDiscount);
  const effective = discount && discount.gt(0) ? base.sub(discount) : base;
  const floored = effective.lt(0) ? new Prisma.Decimal(0) : effective;

  return floored.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

export interface ComboDiscountSource {
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: Prisma.Decimal | number | string;
}

export interface ComboLinePricingInput {
  listPrice: Prisma.Decimal | number | string;
  quantity: number;
}

/**
 * Prorates a bundle's discount into a per-unit discount per line (runbook 4.4):
 * PERCENTAGE takes its share of each line's LIST price (`product.price`, per
 * the runbook — deliberately not the sale price); FIXED_AMOUNT splits evenly
 * per line first, then over that line's units, so the bundle's total discount
 * stays close to `discountValue` regardless of quantities (2dp half-up, so a
 * per-line rounding drift of at most a cent is possible).
 */
export function resolveComboLineUnitDiscounts(
  bundle: ComboDiscountSource,
  lines: ComboLinePricingInput[],
): Prisma.Decimal[] {
  const value = toDecimal(bundle.discountValue) ?? new Prisma.Decimal(0);
  const lineCount = lines.length || 1;

  return lines.map((line) => {
    if (bundle.discountType === 'PERCENTAGE') {
      const list = toDecimal(line.listPrice) ?? new Prisma.Decimal(0);
      return list.mul(value).div(100).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    }

    const perLine = value.div(lineCount).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    const quantity = line.quantity > 0 ? line.quantity : 1;

    return perLine.div(quantity).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  });
}
