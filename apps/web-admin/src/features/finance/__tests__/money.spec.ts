import { describe, expect, it } from 'vitest';

import { formatMoney, formatSignedVariance, isShortfall } from '../lib/money';

describe('formatMoney', () => {
  it('groups thousands and always shows two decimal places', () => {
    expect(formatMoney('1800.00')).toBe('NPR 1,800.00');
    expect(formatMoney('1800')).toBe('NPR 1,800.00');
    expect(formatMoney('1234567.5')).toBe('NPR 1,234,567.50');
  });

  it('keeps paisa that a JSON number would have rounded away', () => {
    // 0.1 + 0.2 lands on 0.30000000000000004 in binary floating point.
    expect(formatMoney('0.30')).toBe('NPR 0.30');
    expect(formatMoney('1999.99')).toBe('NPR 1,999.99');
  });

  it('shows zero rather than an empty cell', () => {
    expect(formatMoney('0')).toBe('NPR 0.00');
    expect(formatMoney('0.00')).toBe('NPR 0.00');
  });

  it('puts the sign outside the currency, so a shortfall reads as one', () => {
    expect(formatMoney('-200.00')).toBe('-NPR 200.00');
  });

  it('refuses to guess at a figure it cannot read', () => {
    expect(formatMoney('not-a-number')).toBe('NPR —');
    expect(formatMoney('')).toBe('NPR —');
  });

  it('honours the currency the row was actually recorded in', () => {
    expect(formatMoney('1800.00', 'USD')).toBe('USD 1,800.00');
  });
});

describe('isShortfall', () => {
  it('treats less than zero as money owed to us', () => {
    expect(isShortfall('-0.01')).toBe(true);
    expect(isShortfall('-200.00')).toBe(true);
  });

  it('does not call an exact match a shortfall', () => {
    expect(isShortfall('0')).toBe(false);
    expect(isShortfall('0.00')).toBe(false);
    expect(isShortfall('200.00')).toBe(false);
  });
});

describe('formatSignedVariance', () => {
  it('labels a courier who paid short', () => {
    expect(formatSignedVariance('-200.00')).toBe('NPR 200.00 short');
  });

  it('labels a courier who paid over as in our favour', () => {
    expect(formatSignedVariance('200.00')).toBe('NPR 200.00 over');
  });

  it('says the two sides agree, rather than showing a zero', () => {
    expect(formatSignedVariance('0.00')).toBe('Agreed');
    expect(formatSignedVariance('-0.00')).toBe('Agreed');
  });

  it('refuses to sign a figure it cannot read', () => {
    expect(formatSignedVariance('abc')).toBe('—');
  });
});
