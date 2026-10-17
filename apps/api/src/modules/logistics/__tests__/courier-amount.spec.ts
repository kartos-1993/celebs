import { describe, expect, it } from 'vitest';

import { courierWholeRupees } from '../courier-amount';

import { Prisma } from '@/config/db.prisma';

/**
 * Pathao accepts `amount_to_collect` as an integer only - 1500.75 is rejected
 * with a 422. So a paisa has to be resolved before an order is handed over, and
 * the direction of that rounding is a money decision, not a formatting one.
 */

describe('courierWholeRupees', () => {
  it('passes whole rupees through unchanged', () => {
    expect(courierWholeRupees(new Prisma.Decimal(2550))).toBe(2550);
    expect(courierWholeRupees(new Prisma.Decimal('2550.00'))).toBe(2550);
    expect(courierWholeRupees(new Prisma.Decimal(0))).toBe(0);
  });

  // Floors, never rounds up. Asking a customer for more than their order says is
  // a dispute; collecting a paisa less is a bounded platform cost.
  it('drops the paisa rather than rounding up', () => {
    expect(courierWholeRupees(new Prisma.Decimal('2550.99'))).toBe(2550);
    expect(courierWholeRupees(new Prisma.Decimal('2550.01'))).toBe(2550);
    expect(courierWholeRupees(new Prisma.Decimal('0.50'))).toBe(0);
    expect(courierWholeRupees(new Prisma.Decimal('0.99'))).toBe(0);
  });

  // The whole reason this helper exists: these are values a binary float cannot
  // represent, so 0.1 + 0.2 must not leak into a figure a courier collects.
  it('does not inherit binary floating point error', () => {
    expect(courierWholeRupees(new Prisma.Decimal('0.1').plus('0.2'))).toBe(0);
    expect(courierWholeRupees(new Prisma.Decimal('2.675'))).toBe(2);
  });

  it('keeps precision a float would lose', () => {
    // 9007199254740.99 exceeds what a double can represent distinctly.
    expect(courierWholeRupees(new Prisma.Decimal('9007199254740.99'))).toBe(9007199254740);
  });
});
