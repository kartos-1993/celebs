import { COMMERCE_POLICY_DEFAULTS, type CommercePolicy } from '@celebs/shared-types';

/**
 * Validation for the commerce settings form.
 *
 * Kept out of the page so the rules can be tested directly, and so the same
 * rule is not restated in a message and in a check.
 */
export const POLICY_FIELD_BY_KEY = {
  'commerce.cod_max_limit': 'codMaxLimit',
  'commerce.free_shipping_threshold': 'freeShippingThreshold',
  'commerce.flat_shipping_fee': 'flatShippingFee',
} as const satisfies Record<string, keyof CommercePolicy>;

export type CommercePolicyKey = keyof typeof POLICY_FIELD_BY_KEY;

export interface CommerceField {
  key: CommercePolicyKey;
  label: string;
  description: string;
  defaultValue: number;
  /** Only the delivery fee may be 0, which means free delivery. */
  allowZero: boolean;
}

export const COMMERCE_FIELDS: readonly CommerceField[] = [
  {
    key: 'commerce.cod_max_limit',
    label: 'Cash on Delivery maximum',
    description: 'Highest order total that may be paid cash on delivery.',
    defaultValue: COMMERCE_POLICY_DEFAULTS.codMaxLimit,
    allowZero: false,
  },
  {
    key: 'commerce.free_shipping_threshold',
    label: 'Free delivery threshold',
    description: 'Order subtotal at or above which delivery is free.',
    defaultValue: COMMERCE_POLICY_DEFAULTS.freeShippingThreshold,
    allowZero: false,
  },
  {
    key: 'commerce.flat_shipping_fee',
    label: 'Flat delivery fee (NPR)',
    description: 'Delivery fee below the threshold. Use 0 for free delivery.',
    defaultValue: COMMERCE_POLICY_DEFAULTS.flatShippingFee,
    allowZero: true,
  },
];

/**
 * Returns a message when the value cannot be saved, or null when it is valid.
 *
 * Zero is valid only for the delivery fee: a zero COD ceiling or threshold would
 * stop every order, which is a misconfiguration rather than an intent.
 */
export function validateCommerceField(value: string, allowZero: boolean): string | null {
  const trimmed = value.trim();
  if (trimmed === '') return 'Enter a value';

  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed)) return 'Whole numbers only';
  if (parsed < 0) return 'Cannot be negative';
  if (parsed === 0 && !allowZero) return 'Must be greater than 0';

  return null;
}
