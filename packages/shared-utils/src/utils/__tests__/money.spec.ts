import { describe, expect, it } from 'vitest';

import {
  compareMoney,
  discountPercentFrom,
  moneyAdd,
  moneyMultiply,
  moneyPercentOf,
  moneySubtract,
  moneySum,
  toPaisa,
} from '../money';

/**
 * Exact money arithmetic over JS numbers.
 *
 * The alternative is a Decimal dependency in every client, which is not worth it:
 * once a value is a 2-decimal number, doing the maths in whole paisa is exact and
 * costs nothing. What is *not* exact is `0.1 + 0.2`, which is where a customer's
 * cart total and the server's total drift apart.
 */

describe('toPaisa', () => {
  it('rounds away the binary representation error', () => {
    // 0.07 * 100 is 7.000000000000001 in binary floating point.
    expect(toPaisa(0.07)).toBe(7);
    expect(toPaisa(0.1)).toBe(10);
    expect(toPaisa(1.15)).toBe(115);
  });

  it('leaves whole and already-exact values alone', () => {
    expect(toPaisa(0)).toBe(0);
    expect(toPaisa(1800)).toBe(180000);
    expect(toPaisa(1800.07)).toBe(180007);
  });

  it('rejects nonsense rather than producing a phantom amount', () => {
    expect(toPaisa(Number.NaN)).toBe(0);
    expect(toPaisa(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe('moneyAdd', () => {
  it('adds without drift', () => {
    expect(moneyAdd(0.1, 0.2)).toBe(0.3);
    expect(moneySum([0.1, 0.1, 0.1])).toBe(0.3);
    expect(moneySum(Array.from({ length: 10 }, () => 0.07))).toBe(0.7);
  });

  it('treats no values as zero', () => {
    expect(moneySum([])).toBe(0);
  });
});

describe('moneyMultiply', () => {
  it('multiplies a price by a whole quantity exactly', () => {
    expect(moneyMultiply(0.1, 3)).toBe(0.3);
    expect(moneyMultiply(1.15, 7)).toBe(8.05);
    expect(moneyMultiply(1999.99, 2)).toBe(3999.98);
  });
});

describe('moneySubtract', () => {
  it('subtracts without drift', () => {
    expect(moneySubtract(0.3, 0.1)).toBe(0.2);
    expect(moneySubtract(1800.07, 270.08)).toBe(1529.99);
  });
});

describe('compareMoney', () => {
  // The free-delivery threshold is judged here, so a drifting comparison puts a
  // shopper on the wrong side of it and charges them delivery they were owed.
  it('judges a threshold comparison exactly', () => {
    // 0.1 + 0.2 >= 0.3 is true in decimal, false in binary floating point.
    expect(compareMoney(0.1 + 0.2, '>=', 0.3)).toBe(true);
    expect(compareMoney(0.3, '>=', 0.3)).toBe(true);
    expect(compareMoney(0.29, '>=', 0.3)).toBe(false);
  });

  it('supports the operators a policy check needs', () => {
    expect(compareMoney(1, '<=', 1)).toBe(true);
    expect(compareMoney(1.01, '<=', 1)).toBe(false);
    expect(compareMoney(2, '>', 1)).toBe(true);
    expect(compareMoney(1, '<', 1)).toBe(false);
  });

  it('rejects an unknown operator rather than guessing', () => {
    expect(() => compareMoney(1, '=~' as '=', 1)).toThrow();
  });
});
describe('moneyPercentOf', () => {
  it('takes a percentage of an amount without drift', () => {
    // The exact division a commission or a discount performs on a listed price.
    expect(moneyPercentOf(1800.5, 7.5)).toBe(135.04);
    expect(moneyPercentOf(1000, 10)).toBe(100);
    expect(moneyPercentOf(0, 50)).toBe(0);
  });

  it('does not inherit the binary error of the division', () => {
    // 1800.50 * 7.5 / 100 is 135.03750000000002 in floating point.
    expect(moneyPercentOf(1800.5, 7.5)).toBe(moneyPercentOf(1800.5, 7.5));
    expect(moneyPercentOf(0.1, 50)).toBe(0.05);
  });
});

describe('discountPercentFrom', () => {
  it('reads the badge percentage exactly', () => {
    expect(discountPercentFrom(1800.5, 1620.45)).toBe(10);
    expect(discountPercentFrom(100, 75)).toBe(25);
  });

  it('never reports a negative discount as a deal', () => {
    expect(discountPercentFrom(100, 120)).toBe(0);
    expect(discountPercentFrom(100, 100)).toBe(0);
  });

  it('survives a free item rather than dividing by zero', () => {
    expect(discountPercentFrom(100, 0)).toBe(100);
    expect(discountPercentFrom(0, 0)).toBe(0);
  });
});
