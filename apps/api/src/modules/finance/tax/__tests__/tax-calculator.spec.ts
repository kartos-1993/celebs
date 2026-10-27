import { describe, expect, it } from 'vitest';

import {
  calculateCommissionTaxReversal,
  calculateCustomerVatBreakdown,
  calculateNepalCommissionTax,
  calculateSection88Tds,
  calculateSellerNetRemittance,
  NEPAL_STANDARD_VAT_RATE_PERCENT,
  SECTION_88_TDS_VAT_REGISTERED_RATE_PERCENT,
} from '../tax-calculator';

import { Prisma } from '@/config/db.prisma';

describe('Nepal Fiscal & Tax Engine (tax-calculator)', () => {
  describe('calculateNepalCommissionTax', () => {
    it('calculates 13% Nepal VAT on platform commission correctly', () => {
      // Order subtotal NPR 2,800 with 6% commission = NPR 168.00
      const commission = new Prisma.Decimal('168.00');
      const result = calculateNepalCommissionTax(commission);

      expect(result.taxableCommission.toFixed(2)).toBe('168.00');
      expect(result.vatRatePercent.toFixed(2)).toBe(NEPAL_STANDARD_VAT_RATE_PERCENT.toFixed(2));
      // 168.00 * 0.13 = 21.84
      expect(result.vatAmount.toFixed(2)).toBe('21.84');
      // 168.00 + 21.84 = 189.84
      expect(result.grossCommissionWithVat.toFixed(2)).toBe('189.84');
    });

    it('rounds half-up to exact 2 decimal places on odd commission fractions', () => {
      // NPR 123.45 commission: 123.45 * 0.13 = 16.0485 -> 16.05
      const commission = new Prisma.Decimal('123.45');
      const result = calculateNepalCommissionTax(commission);

      expect(result.vatAmount.toFixed(2)).toBe('16.05');
      expect(result.grossCommissionWithVat.toFixed(2)).toBe('139.50');
    });

    it('returns zero tax for zero commission', () => {
      const result = calculateNepalCommissionTax(new Prisma.Decimal('0.00'));

      expect(result.vatAmount.toFixed(2)).toBe('0.00');
      expect(result.grossCommissionWithVat.toFixed(2)).toBe('0.00');
    });

    it('rejects negative commission amounts with RangeError', () => {
      expect(() => calculateNepalCommissionTax(new Prisma.Decimal('-50.00'))).toThrow(RangeError);
    });
  });

  describe('calculateSection88Tds', () => {
    it('calculates Section 88 TDS withholding at 1.5% for VAT-registered vendors', () => {
      // 1.5% TDS on NPR 168.00 service fee = NPR 2.52
      const commission = new Prisma.Decimal('168.00');
      const result = calculateSection88Tds(commission);

      expect(result.tdsRatePercent.toFixed(2)).toBe(
        SECTION_88_TDS_VAT_REGISTERED_RATE_PERCENT.toFixed(2),
      );
      expect(result.tdsAmount.toFixed(2)).toBe('2.52');
    });

    it('supports custom TDS rates such as 15% for non-registered natural persons', () => {
      const commission = new Prisma.Decimal('168.00');
      const nonVatRate = new Prisma.Decimal('15.00');
      const result = calculateSection88Tds(commission, nonVatRate);

      // 168.00 * 0.15 = 25.20
      expect(result.tdsAmount.toFixed(2)).toBe('25.20');
    });

    it('returns zero TDS for zero commission', () => {
      const result = calculateSection88Tds(new Prisma.Decimal('0.00'));
      expect(result.tdsAmount.toFixed(2)).toBe('0.00');
    });

    it('rejects negative commission for TDS with RangeError', () => {
      expect(() => calculateSection88Tds(new Prisma.Decimal('-10.00'))).toThrow(RangeError);
    });
  });

  describe('calculateSellerNetRemittance', () => {
    it('computes net seller payout after deducting commission and 13% VAT on commission', () => {
      // 3P Sale: NPR 2,800 gross, NPR 168 commission, NPR 21.84 VAT on commission
      // Net = 2,800 - 168 - 21.84 = 2,610.16
      const grossAmount = new Prisma.Decimal('2800.00');
      const commission = new Prisma.Decimal('168.00');
      const vatOnCommission = new Prisma.Decimal('21.84');

      const remittance = calculateSellerNetRemittance({
        grossAmount,
        commission,
        vatOnCommission,
      });

      expect(remittance.netPayable.toFixed(2)).toBe('2610.16');
      expect(remittance.grossAmount.toFixed(2)).toBe('2800.00');
      expect(remittance.totalDeductions.toFixed(2)).toBe('189.84');
    });

    it('credits back TDS withheld by vendor under Section 88', () => {
      // When vendor withholds 1.5% TDS (NPR 2.52) to deposit under platform PAN:
      // Net deduction by platform = 189.84 - 2.52 = 187.32
      // Net payable = 2,800 - 187.32 = 2,612.68
      const grossAmount = new Prisma.Decimal('2800.00');
      const commission = new Prisma.Decimal('168.00');
      const vatOnCommission = new Prisma.Decimal('21.84');
      const tdsOnCommission = new Prisma.Decimal('2.52');

      const remittance = calculateSellerNetRemittance({
        grossAmount,
        commission,
        vatOnCommission,
        tdsOnCommission,
      });

      expect(remittance.netPayable.toFixed(2)).toBe('2612.68');
    });
  });

  describe('calculateCommissionTaxReversal', () => {
    it('reverses 100% of commission and 13% VAT on full order refund', () => {
      const lineSubtotal = new Prisma.Decimal('2800.00');
      const commission = new Prisma.Decimal('168.00');
      const refundAmount = new Prisma.Decimal('2800.00');

      const reversal = calculateCommissionTaxReversal({
        lineSubtotal,
        commission,
        refundAmount,
      });

      expect(reversal.reversedCommission.toFixed(2)).toBe('168.00');
      expect(reversal.reversedVat.toFixed(2)).toBe('21.84');
      expect(reversal.totalReversedCredit.toFixed(2)).toBe('189.84');
    });

    it('pro-rates commission and 13% VAT on 50% partial refund', () => {
      const lineSubtotal = new Prisma.Decimal('2800.00');
      const commission = new Prisma.Decimal('168.00');
      const refundAmount = new Prisma.Decimal('1400.00');

      const reversal = calculateCommissionTaxReversal({
        lineSubtotal,
        commission,
        refundAmount,
      });

      // 50% of 168.00 = 84.00
      expect(reversal.reversedCommission.toFixed(2)).toBe('84.00');
      // 84.00 * 0.13 = 10.92
      expect(reversal.reversedVat.toFixed(2)).toBe('10.92');
      // 84.00 + 10.92 = 94.92
      expect(reversal.totalReversedCredit.toFixed(2)).toBe('94.92');
    });

    it('caps reversal at original commission to prevent negative fee exploit', () => {
      const lineSubtotal = new Prisma.Decimal('2800.00');
      const commission = new Prisma.Decimal('168.00');
      const refundAmount = new Prisma.Decimal('3500.00'); // Goodwill/excess refund

      const reversal = calculateCommissionTaxReversal({
        lineSubtotal,
        commission,
        refundAmount,
      });

      expect(reversal.reversedCommission.toFixed(2)).toBe('168.00');
      expect(reversal.reversedVat.toFixed(2)).toBe('21.84');
    });
  });

  describe('calculateCustomerVatBreakdown (1P Direct Retail)', () => {
    it('extracts taxable amount and 13% VAT component from VAT-inclusive retail price', () => {
      // Inclusive price NPR 1,130.00
      // Taxable = 1,130 / 1.13 = 1,000.00
      // VAT = 130.00
      const inclusivePrice = new Prisma.Decimal('1130.00');
      const breakdown = calculateCustomerVatBreakdown(inclusivePrice);

      expect(breakdown.taxableAmount.toFixed(2)).toBe('1000.00');
      expect(breakdown.vatAmount.toFixed(2)).toBe('130.00');
      expect(breakdown.grossAmount.toFixed(2)).toBe('1130.00');
    });
  });
});
