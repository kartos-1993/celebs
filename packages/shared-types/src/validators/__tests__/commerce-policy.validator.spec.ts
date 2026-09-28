import { describe, expect, it } from 'vitest';

import {
  COMMERCE_POLICY_DEFAULTS,
  COMMERCE_SETTING_KEYS,
  isCodAllowed,
  parseCommercePolicy,
  resolveShippingFee,
} from '../commerce-policy.validator';

describe('parseCommercePolicy', () => {
  it('falls back to the pre-policy numbers when nothing is stored', () => {
    const { policy, invalidKeys } = parseCommercePolicy([]);

    expect(policy).toEqual({
      codMaxLimit: 5000,
      freeShippingThreshold: 3000,
      flatShippingFee: 150,
    });
    expect(invalidKeys).toEqual([]);
  });

  it('reads every stored value', () => {
    const { policy } = parseCommercePolicy([
      { key: COMMERCE_SETTING_KEYS.codMaxLimit, value: '9000' },
      { key: COMMERCE_SETTING_KEYS.freeShippingThreshold, value: '5000' },
      { key: COMMERCE_SETTING_KEYS.flatShippingFee, value: '200' },
    ]);

    expect(policy).toEqual({
      codMaxLimit: 9000,
      freeShippingThreshold: 5000,
      flatShippingFee: 200,
    });
  });

  it('accepts a key/value map as well as an array', () => {
    const { policy } = parseCommercePolicy({ [COMMERCE_SETTING_KEYS.codMaxLimit]: '7500' });

    expect(policy.codMaxLimit).toBe(7500);
    expect(policy.freeShippingThreshold).toBe(COMMERCE_POLICY_DEFAULTS.freeShippingThreshold);
  });

  it('ignores settings from unrelated groups', () => {
    const { policy, invalidKeys } = parseCommercePolicy([
      { key: 'notification.quiet_hours_start', value: '22:00' },
      { key: COMMERCE_SETTING_KEYS.codMaxLimit, value: '6000' },
    ]);

    expect(policy.codMaxLimit).toBe(6000);
    expect(invalidKeys).toEqual([]);
  });

  it('tolerates surrounding whitespace in a stored value', () => {
    const { policy } = parseCommercePolicy([
      { key: COMMERCE_SETTING_KEYS.codMaxLimit, value: '  6500  ' },
    ]);

    expect(policy.codMaxLimit).toBe(6500);
  });

  it('reports an unparseable value instead of silently substituting a default', () => {
    const { policy, invalidKeys } = parseCommercePolicy([
      { key: COMMERCE_SETTING_KEYS.codMaxLimit, value: 'not-a-number' },
    ]);

    expect(policy.codMaxLimit).toBe(COMMERCE_POLICY_DEFAULTS.codMaxLimit);
    expect(invalidKeys).toEqual([COMMERCE_SETTING_KEYS.codMaxLimit]);
  });

  it('reports an empty value', () => {
    const { invalidKeys } = parseCommercePolicy([
      { key: COMMERCE_SETTING_KEYS.flatShippingFee, value: '   ' },
    ]);

    expect(invalidKeys).toEqual([COMMERCE_SETTING_KEYS.flatShippingFee]);
  });

  // The regression this parser exists to prevent: `parseInt('0') || DEFAULT`
  // turns a deliberately-zeroed setting back into the default, because `0` is
  // falsy. A flat fee of 0 (free delivery) is exactly the value an admin is
  // most likely to try, so it must round-trip as 0.
  it('honours a stored zero rather than falling back to the default', () => {
    const { policy, invalidKeys } = parseCommercePolicy([
      { key: COMMERCE_SETTING_KEYS.flatShippingFee, value: '0' },
    ]);

    expect(policy.flatShippingFee).toBe(0);
    expect(invalidKeys).toEqual([]);
  });

  it('rejects a negative or fractional value', () => {
    const { invalidKeys } = parseCommercePolicy([
      { key: COMMERCE_SETTING_KEYS.codMaxLimit, value: '-100' },
      { key: COMMERCE_SETTING_KEYS.freeShippingThreshold, value: '1500.5' },
    ]);

    expect(invalidKeys).toEqual([
      COMMERCE_SETTING_KEYS.codMaxLimit,
      COMMERCE_SETTING_KEYS.freeShippingThreshold,
    ]);
  });
});

describe('resolveShippingFee', () => {
  const policy = { codMaxLimit: 5000, freeShippingThreshold: 3000, flatShippingFee: 150 };

  it('charges the flat fee below the threshold', () => {
    expect(resolveShippingFee(2999, policy)).toBe(150);
  });

  // The off-by-one that made a customer feel cheated: the app used `>=` and
  // said "free delivery applied" at exactly 3000, while the server used `>` and
  // charged 150. One shared rule means one answer.
  it('waives the fee exactly on the threshold', () => {
    expect(resolveShippingFee(3000, policy)).toBe(0);
  });

  it('waives the fee above the threshold', () => {
    expect(resolveShippingFee(3001, policy)).toBe(0);
  });

  it('charges nothing for an empty or non-finite subtotal', () => {
    expect(resolveShippingFee(0, policy)).toBe(0);
    expect(resolveShippingFee(Number.NaN, policy)).toBe(0);
  });

  it('follows a policy whose threshold moved', () => {
    const raised = { ...policy, freeShippingThreshold: 5000 };

    expect(resolveShippingFee(4000, policy)).toBe(0);
    expect(resolveShippingFee(4000, raised)).toBe(150);
  });
});

describe('isCodAllowed', () => {
  const policy = { codMaxLimit: 5000, freeShippingThreshold: 3000, flatShippingFee: 150 };

  it('allows a total on the limit', () => {
    expect(isCodAllowed(5000, policy)).toBe(true);
  });

  it('refuses a total above the limit', () => {
    expect(isCodAllowed(5001, policy)).toBe(false);
  });

  it('follows a policy whose limit moved', () => {
    expect(isCodAllowed(6000, policy)).toBe(false);
    expect(isCodAllowed(6000, { ...policy, codMaxLimit: 8000 })).toBe(true);
  });
});
