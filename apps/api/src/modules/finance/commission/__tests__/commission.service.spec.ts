import { CommissionScope } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import { rankByPrecedence } from '../commission.service';

import { Prisma } from '@/config/db.prisma';

const rule = (
  scope: CommissionScope,
  ratePercent: string,
  target: { categoryId?: string | null; vendorId?: string | null } = {},
) => ({
  scope,
  categoryId: target.categoryId ?? null,
  vendorId: target.vendorId ?? null,
  ratePercent: new Prisma.Decimal(ratePercent),
});

/**
 * Precedence is the whole reason rules are separate rows rather than one number
 * on a settings table: a seller who has negotiated a rate must not be silently
 * charged the category rate on a line that happens to match both.
 */
describe('rankByPrecedence', () => {
  const line = { categoryId: 'cat1', subcategoryId: 'sub2', vendorId: 'vendor1' };

  it('puts a seller agreement above everything else', () => {
    const ranked = rankByPrecedence(
      [
        rule(CommissionScope.GLOBAL, '10'),
        rule(CommissionScope.CATEGORY, '8', { categoryId: 'cat1' }),
        rule(CommissionScope.VENDOR, '5', { vendorId: 'vendor1' }),
      ],
      line,
    );

    expect(ranked[0]?.ratePercent.toFixed(2)).toBe('5.00');
    expect(ranked[0]?.scope).toBe(CommissionScope.VENDOR);
  });

  it('prefers a subcategory over its parent', () => {
    const ranked = rankByPrecedence(
      [
        rule(CommissionScope.CATEGORY, '9', { categoryId: 'cat1' }),
        rule(CommissionScope.CATEGORY, '6', { categoryId: 'sub2' }),
        rule(CommissionScope.GLOBAL, '10'),
      ],
      line,
    );

    expect(ranked[0]?.ratePercent.toFixed(2)).toBe('6.00');
    expect(ranked[1]?.ratePercent.toFixed(2)).toBe('9.00');
  });

  it('falls back to the marketplace rate when nothing narrower applies', () => {
    const ranked = rankByPrecedence([rule(CommissionScope.GLOBAL, '10')], line);

    expect(ranked[0]?.ratePercent.toFixed(2)).toBe('10.00');
  });

  it('ranks a rule meant for some other seller last, so it cannot win', () => {
    const ranked = rankByPrecedence(
      [
        rule(CommissionScope.VENDOR, '1', { vendorId: 'someone-else' }),
        rule(CommissionScope.GLOBAL, '10'),
      ],
      line,
    );

    expect(ranked[0]?.ratePercent.toFixed(2)).toBe('10.00');
    expect(ranked[1]?.vendorId).toBe('someone-else');
  });

  it('ranks a rule for an unrelated category last', () => {
    const ranked = rankByPrecedence(
      [
        rule(CommissionScope.CATEGORY, '2', { categoryId: 'some-other-category' }),
        rule(CommissionScope.GLOBAL, '10'),
      ],
      line,
    );

    expect(ranked[0]?.ratePercent.toFixed(2)).toBe('10.00');
  });

  it('returns nothing when no rule exists, so the rate is zero', () => {
    expect(rankByPrecedence([], line)).toEqual([]);
  });
});
