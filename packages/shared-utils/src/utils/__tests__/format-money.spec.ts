import { describe, expect, it } from 'vitest';

import {
  formatMoneyAmount,
  formatRupees,
  groupThousands,
  splitForDisplay,
  splitMoney,
  UNREADABLE_MONEY,
} from '../format-money';

/**
 * The reason this exists rather than toFixed: 1.005 formats as "1.00" because the
 * double nearest it is fractionally below. These cases are the ones a formatter
 * built on toFixed gets wrong.
 */
describe('splitMoney', () => {
  it('pads a missing fraction to two places', () => {
    expect(splitMoney('1800')).toEqual({ sign: '', whole: '1800', fraction: '00' });
    expect(splitMoney('1800.5')).toEqual({ sign: '', whole: '1800', fraction: '50' });
    expect(splitMoney('1800.07')).toEqual({ sign: '', whole: '1800', fraction: '07' });
  });

  it('keeps the sign separate from the digits', () => {
    expect(splitMoney('-200.00')?.sign).toBe('-');
  });

  it('refuses to guess at something that is not a decimal', () => {
    expect(splitMoney('abc')).toBeNull();
    expect(splitMoney('')).toBeNull();
    expect(splitMoney('1,800')).toBeNull();
  });
});

describe('groupThousands', () => {
  it('groups from the right', () => {
    expect(groupThousands('1')).toBe('1');
    expect(groupThousands('1800')).toBe('1,800');
    expect(groupThousands('1234567')).toBe('1,234,567');
    expect(groupThousands('1234567890')).toBe('1,234,567,890');
  });
});

describe('formatMoneyAmount', () => {
  it('never produces the toFixed rounding error', () => {
    // (1.005).toFixed(2) === "1.00"
    expect(formatMoneyAmount('1.005')).toBe('1.00');
    expect(formatMoneyAmount('1800.07')).toBe('1,800.07');
    expect(formatMoneyAmount('0.1')).toBe('0.10');
  });

  it('shows a dash rather than zero for an unreadable figure', () => {
    // Zero is a real answer - a free delivery - and must not stand in for a
    // value we failed to parse.
    expect(formatMoneyAmount('nope')).toBe(UNREADABLE_MONEY);
  });
});

describe('formatRupees', () => {
  it('puts the sign outside the currency', () => {
    expect(formatRupees('1800.07')).toBe('Rs. 1,800.07');
    expect(formatRupees('-200.00')).toBe('-Rs. 200.00');
  });
});

describe('splitForDisplay', () => {
  it('gives the UI separate pieces without reassembling a float', () => {
    expect(splitForDisplay('1234567.89')).toEqual({
      sign: '',
      whole: '1,234,567',
      fraction: '89',
    });
  });

  it('degrades visibly rather than rendering NaN', () => {
    expect(splitForDisplay('broken').whole).toBe(UNREADABLE_MONEY);
  });
});
