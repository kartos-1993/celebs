import { describe, expect, it } from 'vitest';

import { applyDeliveryPolicy } from '../delivery-policy';

import { Prisma } from '@/config/db.prisma';

const dec = (value: string | number) => new Prisma.Decimal(value);

/**
 * Where a quoted delivery cost becomes four numbers.
 *
 * The customer charge and the courier cost are deliberately separate. A
 * free-delivery threshold means the customer pays nothing while the courier still
 * charges us, and collapsing the two hides the cost of that promise - which is how
 * a threshold quietly starts costing more than the margin it was meant to win.
 *
 * Measured against the courier: 0.9 kg is 150 to Pokhara and 210 to Bardibas, so
 * the courier's side cannot be derived from anything we hold. It arrives as a
 * quote and passes through untouched.
 */
describe('applyDeliveryPolicy', () => {
  const policy = {
    subtotal: dec('2400.00'),
    quotedCourierFee: dec('300.00'),
    freeDeliveryThreshold: dec('5000.00'),
    isCod: false,
    codPercentage: dec('0.01'),
  };

  it('charges the customer the quoted cost below the threshold', () => {
    const result = applyDeliveryPolicy(policy);

    expect(result.customerCharge.toFixed(2)).toBe('300.00');
    expect(result.courierCost.toFixed(2)).toBe('300.00');
    expect(result.isFreeDelivery).toBe(false);
    expect(result.absorbedCost.toFixed(2)).toBe('0.00');
  });

  // The promise costs money even when the customer is not charged for it.
  it('absorbs the quoted cost when the threshold waives delivery', () => {
    const result = applyDeliveryPolicy({ ...policy, subtotal: dec('5000.00') });

    expect(result.customerCharge.toFixed(2)).toBe('0.00');
    expect(result.courierCost.toFixed(2)).toBe('300.00');
    expect(result.isFreeDelivery).toBe(true);
    expect(result.absorbedCost.toFixed(2)).toBe('300.00');
  });

  it('adds the courier cash-handling charge only on COD', () => {
    const prepaid = applyDeliveryPolicy(policy);
    const cod = applyDeliveryPolicy({ ...policy, isCod: true });

    expect(prepaid.codHandlingFee.toFixed(2)).toBe('0.00');
    // 2400 goods + 300 delivery = 2700 collected, and 1% of that is the handling
    // charge. Measured against the courier: 1500 collected cost 15.
    expect(cod.codHandlingFee.toFixed(2)).toBe('27.00');
    expect(cod.totalPayable.toFixed(2)).toBe('2727.00');
  });

  it('still owes handling on free delivery, because goods are still collected', () => {
    // Correcting an expectation I wrote wrong here. The customer collects the
    // 5000 of goods even though delivery is free, and Pathao's handling fee is a
    // percentage of what it collects - measured, 1500 collected cost 15. So the
    // courier still charges us 1% of the goods and we absorb it. Reading
    // "delivery is free" as "the collection is free" would have understated this
    // by 50 on every free-delivery COD order.
    const result = applyDeliveryPolicy({ ...policy, isCod: true, subtotal: dec('5000.00') });

    expect(result.customerCharge.toFixed(2)).toBe('0.00');
    expect(result.codHandlingFee.toFixed(2)).toBe('50.00');
    expect(result.courierCost.toFixed(2)).toBe('300.00');
    // Both the delivery and the handling were ours to pay.
    expect(result.absorbedCost.toFixed(2)).toBe('350.00');
  });

  it('handles a quote of nothing, rather than dividing by it', () => {
    const result = applyDeliveryPolicy({ ...policy, quotedCourierFee: dec('0.00') });

    expect(result.customerCharge.toFixed(2)).toBe('0.00');
    expect(result.totalPayable.toFixed(2)).toBe('2400.00');
  });

  it('never quotes a negative charge, whatever it is handed', () => {
    const result = applyDeliveryPolicy({ ...policy, quotedCourierFee: dec('-50.00') });

    expect(result.courierCost.toFixed(2)).toBe('0.00');
    expect(result.customerCharge.toFixed(2)).toBe('0.00');
  });

  it('treats an empty basket as nothing to deliver', () => {
    const result = applyDeliveryPolicy({ ...policy, subtotal: dec('0.00') });

    expect(result.customerCharge.toFixed(2)).toBe('0.00');
    expect(result.courierCost.toFixed(2)).toBe('0.00');
  });

  it('reconciles: what the customer pays equals the goods plus the charge', () => {
    const result = applyDeliveryPolicy({ ...policy, isCod: true });

    expect(result.totalPayable.toFixed(2)).toBe(
      result.subtotal.plus(result.customerCharge).plus(result.codHandlingFee).toFixed(2),
    );
  });
});
