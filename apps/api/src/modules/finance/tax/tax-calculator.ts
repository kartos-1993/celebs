import { Prisma } from '@/config/db.prisma';

/**
 * Nepal Fiscal & Tax Engine (VAT Act 2052 & Income Tax Act 2058)
 *
 * Implements statutory tax computations for 1P Retail and 3P Marketplace operations:
 *
 * 1. Nepal VAT Act 2052:
 *    - Standard 13% VAT applied to Platform Commission Service Fees (3P).
 *    - 13% Output VAT extraction on 1P direct sales.
 *    - Schedule 10 (अनुसूची १०) Credit Note reversals on customer returns.
 *
 * 2. Nepal Income Tax Act 2058 Section 88:
 *    - 1.5% Withholding Tax (TDS) on commission service payments to VAT-registered entities.
 *    - 15% Withholding Tax (TDS) for unregistered natural persons.
 */

export const NEPAL_STANDARD_VAT_RATE_PERCENT = new Prisma.Decimal('13.00');
export const SECTION_88_TDS_VAT_REGISTERED_RATE_PERCENT = new Prisma.Decimal('1.50');
export const ZERO_DECIMAL = new Prisma.Decimal('0.00');
export const ONE_HUNDRED = new Prisma.Decimal('100.00');
export const CURRENCY_DECIMALS = 2;

export interface NepalCommissionTaxResult {
  taxableCommission: Prisma.Decimal;
  vatRatePercent: Prisma.Decimal;
  vatAmount: Prisma.Decimal;
  grossCommissionWithVat: Prisma.Decimal;
}

export interface Section88TdsResult {
  taxableBase: Prisma.Decimal;
  tdsRatePercent: Prisma.Decimal;
  tdsAmount: Prisma.Decimal;
}

export interface SellerNetRemittanceInput {
  grossAmount: Prisma.Decimal;
  commission: Prisma.Decimal;
  vatOnCommission: Prisma.Decimal;
  tdsOnCommission?: Prisma.Decimal;
}

export interface SellerNetRemittanceResult {
  grossAmount: Prisma.Decimal;
  commission: Prisma.Decimal;
  vatOnCommission: Prisma.Decimal;
  tdsOnCommissionCredit: Prisma.Decimal;
  totalDeductions: Prisma.Decimal;
  netPayable: Prisma.Decimal;
}

export interface CommissionTaxReversalInput {
  lineSubtotal: Prisma.Decimal;
  commission: Prisma.Decimal;
  refundAmount: Prisma.Decimal;
}

export interface CommissionTaxReversalResult {
  reversedCommission: Prisma.Decimal;
  reversedVat: Prisma.Decimal;
  totalReversedCredit: Prisma.Decimal;
}

export interface CustomerVatBreakdownResult {
  grossAmount: Prisma.Decimal;
  taxableAmount: Prisma.Decimal;
  vatAmount: Prisma.Decimal;
  vatRatePercent: Prisma.Decimal;
}

/**
 * Calculates 13% Nepal VAT on platform commission.
 *
 * Under VAT Act 2052, platform commission is a taxable service fee billed to the seller.
 */
export function calculateNepalCommissionTax(
  commission: Prisma.Decimal,
  vatRatePercent: Prisma.Decimal = NEPAL_STANDARD_VAT_RATE_PERCENT,
): NepalCommissionTaxResult {
  if (commission.lessThan(ZERO_DECIMAL)) {
    throw new RangeError(`Commission cannot be negative: ${commission.toFixed(2)}`);
  }

  if (commission.isZero()) {
    return {
      taxableCommission: ZERO_DECIMAL,
      vatRatePercent,
      vatAmount: ZERO_DECIMAL,
      grossCommissionWithVat: ZERO_DECIMAL,
    };
  }

  const vatAmount = commission
    .mul(vatRatePercent)
    .div(ONE_HUNDRED)
    .toDecimalPlaces(CURRENCY_DECIMALS, Prisma.Decimal.ROUND_HALF_UP);

  const grossCommissionWithVat = commission
    .plus(vatAmount)
    .toDecimalPlaces(CURRENCY_DECIMALS, Prisma.Decimal.ROUND_HALF_UP);

  return {
    taxableCommission: commission.toDecimalPlaces(CURRENCY_DECIMALS, Prisma.Decimal.ROUND_HALF_UP),
    vatRatePercent,
    vatAmount,
    grossCommissionWithVat,
  };
}

/**
 * Calculates Section 88 Withholding Tax (TDS) from service/commission fees.
 */
export function calculateSection88Tds(
  taxableCommission: Prisma.Decimal,
  tdsRatePercent: Prisma.Decimal = SECTION_88_TDS_VAT_REGISTERED_RATE_PERCENT,
): Section88TdsResult {
  if (taxableCommission.lessThan(ZERO_DECIMAL)) {
    throw new RangeError(
      `Taxable base for TDS cannot be negative: ${taxableCommission.toFixed(2)}`,
    );
  }

  if (taxableCommission.isZero()) {
    return {
      taxableBase: ZERO_DECIMAL,
      tdsRatePercent,
      tdsAmount: ZERO_DECIMAL,
    };
  }

  const tdsAmount = taxableCommission
    .mul(tdsRatePercent)
    .div(ONE_HUNDRED)
    .toDecimalPlaces(CURRENCY_DECIMALS, Prisma.Decimal.ROUND_HALF_UP);

  return {
    taxableBase: taxableCommission.toDecimalPlaces(CURRENCY_DECIMALS, Prisma.Decimal.ROUND_HALF_UP),
    tdsRatePercent,
    tdsAmount,
  };
}

/**
 * Calculates net seller payout after deducting commission and VAT on commission,
 * with optional credit for Section 88 TDS withheld by vendor.
 */
export function calculateSellerNetRemittance(
  input: SellerNetRemittanceInput,
): SellerNetRemittanceResult {
  const gross = input.grossAmount.toDecimalPlaces(CURRENCY_DECIMALS, Prisma.Decimal.ROUND_HALF_UP);
  const comm = input.commission.toDecimalPlaces(CURRENCY_DECIMALS, Prisma.Decimal.ROUND_HALF_UP);
  const vat = input.vatOnCommission.toDecimalPlaces(
    CURRENCY_DECIMALS,
    Prisma.Decimal.ROUND_HALF_UP,
  );
  const tdsCredit = (input.tdsOnCommission ?? ZERO_DECIMAL).toDecimalPlaces(
    CURRENCY_DECIMALS,
    Prisma.Decimal.ROUND_HALF_UP,
  );

  // Total deductions billed to seller = Commission + VAT on Commission
  const totalBilled = comm.plus(vat);
  // Net deduction retained by platform = totalBilled - tdsCredit
  const netDeductions = totalBilled.minus(tdsCredit);
  const netPayable = gross
    .minus(netDeductions)
    .toDecimalPlaces(CURRENCY_DECIMALS, Prisma.Decimal.ROUND_HALF_UP);

  return {
    grossAmount: gross,
    commission: comm,
    vatOnCommission: vat,
    tdsOnCommissionCredit: tdsCredit,
    totalDeductions: totalBilled,
    netPayable,
  };
}

/**
 * Calculates reversed commission and 13% VAT on commission during full or partial refunds.
 * Generates exact figures for Nepal IRD Schedule 10 Credit Notes (बिक्री फिर्ता खाता).
 */
export function calculateCommissionTaxReversal(
  input: CommissionTaxReversalInput,
): CommissionTaxReversalResult {
  if (input.refundAmount.lessThanOrEqualTo(ZERO_DECIMAL) || input.commission.isZero()) {
    return {
      reversedCommission: ZERO_DECIMAL,
      reversedVat: ZERO_DECIMAL,
      totalReversedCredit: ZERO_DECIMAL,
    };
  }

  // Cap refund ratio at 100% to prevent negative fee exploit
  const isFullRefund = input.refundAmount.greaterThanOrEqualTo(input.lineSubtotal);

  const rawReversedCommission = isFullRefund
    ? input.commission
    : input.commission.mul(input.refundAmount).div(input.lineSubtotal);

  const roundedReversedCommission = rawReversedCommission.toDecimalPlaces(
    CURRENCY_DECIMALS,
    Prisma.Decimal.ROUND_HALF_UP,
  );

  const reversedCommission = roundedReversedCommission.lessThan(input.commission)
    ? roundedReversedCommission
    : input.commission;

  const reversedVat = reversedCommission
    .mul(NEPAL_STANDARD_VAT_RATE_PERCENT)
    .div(ONE_HUNDRED)
    .toDecimalPlaces(CURRENCY_DECIMALS, Prisma.Decimal.ROUND_HALF_UP);

  const totalReversedCredit = reversedCommission.plus(reversedVat);

  return {
    reversedCommission,
    reversedVat,
    totalReversedCredit,
  };
}

/**
 * Extracts taxable subtotal and 13% VAT component from VAT-inclusive retail price (1P Direct Sales).
 *
 * Taxable = Gross / 1.13
 * VAT = Gross - Taxable
 */
export function calculateCustomerVatBreakdown(
  inclusivePrice: Prisma.Decimal,
  vatRatePercent: Prisma.Decimal = NEPAL_STANDARD_VAT_RATE_PERCENT,
): CustomerVatBreakdownResult {
  if (inclusivePrice.lessThanOrEqualTo(ZERO_DECIMAL)) {
    return {
      grossAmount: ZERO_DECIMAL,
      taxableAmount: ZERO_DECIMAL,
      vatAmount: ZERO_DECIMAL,
      vatRatePercent,
    };
  }

  const divisor = ONE_HUNDRED.plus(vatRatePercent).div(ONE_HUNDRED);
  const taxableAmount = inclusivePrice
    .div(divisor)
    .toDecimalPlaces(CURRENCY_DECIMALS, Prisma.Decimal.ROUND_HALF_UP);
  const vatAmount = inclusivePrice.minus(taxableAmount);

  return {
    grossAmount: inclusivePrice.toDecimalPlaces(CURRENCY_DECIMALS, Prisma.Decimal.ROUND_HALF_UP),
    taxableAmount,
    vatAmount,
    vatRatePercent,
  };
}
