import { describe, expect, it } from 'vitest';

import { COMMERCE_POLICY_DEFAULTS, COMMERCE_SETTING_KEYS } from '@celebs/shared-types';

import {
  COMMERCE_FIELDS,
  POLICY_FIELD_BY_KEY,
  validateCommerceField,
} from '../lib/commerce-settings';

describe('commerce settings form', () => {
  it('edits exactly the keys the policy reads', () => {
    // A field bound to the wrong key would save a value checkout never sees.
    // The free-delivery threshold is absent on purpose: it is per delivery zone,
    // not a platform-wide number.
    expect(COMMERCE_FIELDS.map((field) => field.key).sort()).toEqual(
      [COMMERCE_SETTING_KEYS.codMaxLimit, COMMERCE_SETTING_KEYS.flatShippingFee].sort(),
    );
  });

  it('maps every key to a real policy field', () => {
    for (const [key, field] of Object.entries(POLICY_FIELD_BY_KEY)) {
      expect(COMMERCE_POLICY_DEFAULTS).toHaveProperty(field);
      expect(key).toBeTruthy();
    }
  });

  it('accepts a positive whole number', () => {
    expect(validateCommerceField('7500', false)).toBeNull();
  });

  it('accepts zero only for the delivery fee', () => {
    // Zero delivery fee means free delivery, which is a real setting.
    expect(validateCommerceField('0', true)).toBeNull();
    // A zero ceiling or threshold would block every order.
    expect(validateCommerceField('0', false)).toBe('Must be greater than 0');
  });

  it('rejects blanks, text, fractions and negatives', () => {
    expect(validateCommerceField('', false)).toBe('Enter a value');
    expect(validateCommerceField('   ', false)).toBe('Enter a value');
    expect(validateCommerceField('abc', false)).toBe('Whole numbers only');
    expect(validateCommerceField('1500.5', false)).toBe('Whole numbers only');
    expect(validateCommerceField('-1', false)).toBe('Cannot be negative');
  });

  it('tolerates surrounding whitespace', () => {
    expect(validateCommerceField('  3000  ', false)).toBeNull();
  });
});
