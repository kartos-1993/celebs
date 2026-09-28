import { z } from 'zod';

/**
 * Commerce policy — the business numbers that decide what a customer pays.
 *
 * These used to be hardcoded in five places across two apps, which is how the
 * cart came to promise free delivery at one threshold while the server charged
 * a delivery fee at a different one. They live in `PlatformSetting` instead, so
 * changing one is an admin edit rather than a code change plus a mobile release.
 *
 * The server is the only authority: it reads this policy and computes the real
 * total. Apps read the same policy to *display* an immediate figure, and the
 * server's number replaces it.
 */

/** Keys under which the policy is stored. Namespaced so future commerce rules
 *  (vouchers, zone delivery rates) can join them without a new mechanism. */
export const COMMERCE_SETTING_KEYS = {
  codMaxLimit: 'commerce.cod_max_limit',
  freeShippingThreshold: 'commerce.free_shipping_threshold',
  flatShippingFee: 'commerce.flat_shipping_fee',
} as const;

/**
 * Values used when a setting is absent. Each matches the number the server
 * hardcoded before the policy existed, so introducing the policy changes no
 * charge. A threshold of 0 would mean "always free", which is never intended,
 * so `0` is rejected as invalid rather than honoured — that is the one case
 * where the correct answer is genuinely "not a real value".
 */
export const COMMERCE_POLICY_DEFAULTS = {
  codMaxLimit: 5000,
  freeShippingThreshold: 3000,
  flatShippingFee: 150,
} as const;

export const commercePolicySchema = z.object({
  /** Highest order total that may be paid cash on delivery. */
  codMaxLimit: z.number().int().positive(),
  /** Order subtotal at or above which the delivery fee is waived. */
  freeShippingThreshold: z.number().int().positive(),
  /** Flat delivery fee charged below the threshold. */
  flatShippingFee: z.number().int().nonnegative(),
});

export type CommercePolicy = z.infer<typeof commercePolicySchema>;

/** One stored setting as the admin/public endpoints return it. */
export const commercePolicySettingSchema = z.object({
  key: z.string(),
  value: z.string(),
});

export type CommercePolicySetting = z.infer<typeof commercePolicySettingSchema>;

export interface CommercePolicyParseResult {
  policy: CommercePolicy;
  /**
   * Keys whose stored value was missing or unusable, so the caller can log or
   * surface it. Never silently swallowed: a bad value must not quietly become a
   * different charge.
   */
  invalidKeys: string[];
}

/**
 * Reads a numeric policy value.
 *
 * Rejects an empty string, non-numeric text, and any value below `min` instead
 * of coercing them. Note this deliberately does NOT use the common
 * `parseInt(raw) || DEFAULT` shape: `parseInt('0')` is `0`, and `0 || DEFAULT`
 * yields the default, so a deliberately-zeroed setting would silently read back
 * as the default. That is the exact class of bug this parser replaces, and the
 * flat delivery fee is the one value where `0` is a real answer.
 *
 * `min` is 0 only for the fee (free delivery) and 1 for the limits, where `0`
 * would mean "no order is ever allowed" and is a misconfiguration rather than
 * an intent.
 */
function readPolicyNumber(
  raw: string | undefined,
  key: string,
  fallback: number,
  min: number,
  invalidKeys: string[],
): number {
  if (raw === undefined) return fallback;

  const trimmed = raw.trim();
  if (trimmed === '') {
    invalidKeys.push(key);
    return fallback;
  }

  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < min) {
    invalidKeys.push(key);
    return fallback;
  }

  return parsed;
}

/** `Array.isArray` does not narrow `readonly T[]` out of a union, so the
 *  array branch needs an explicit guard. */
function isSettingArray(value: unknown): value is readonly CommercePolicySetting[] {
  return Array.isArray(value);
}

/**
 * Builds a `CommercePolicy` from raw `key`/`value` settings.
 *
 * Accepts either shape the settings endpoints produce: an array of
 * `{ key, value }` records, or a plain key/value map. Unknown keys are ignored,
 * so the commerce policy can share the settings table with unrelated groups.
 */
export function parseCommercePolicy(
  settings: readonly CommercePolicySetting[] | Readonly<Record<string, string>> | undefined | null,
): CommercePolicyParseResult {
  const values: Readonly<Record<string, string>> = isSettingArray(settings)
    ? Object.fromEntries(
        settings
          .filter((setting): setting is CommercePolicySetting => Boolean(setting?.key))
          .map((setting) => [setting.key, setting.value]),
      )
    : (settings ?? {});

  const invalidKeys: string[] = [];

  const policy: CommercePolicy = {
    codMaxLimit: readPolicyNumber(
      values[COMMERCE_SETTING_KEYS.codMaxLimit],
      COMMERCE_SETTING_KEYS.codMaxLimit,
      COMMERCE_POLICY_DEFAULTS.codMaxLimit,
      1,
      invalidKeys,
    ),
    freeShippingThreshold: readPolicyNumber(
      values[COMMERCE_SETTING_KEYS.freeShippingThreshold],
      COMMERCE_SETTING_KEYS.freeShippingThreshold,
      COMMERCE_POLICY_DEFAULTS.freeShippingThreshold,
      1,
      invalidKeys,
    ),
    flatShippingFee: readPolicyNumber(
      values[COMMERCE_SETTING_KEYS.flatShippingFee],
      COMMERCE_SETTING_KEYS.flatShippingFee,
      COMMERCE_POLICY_DEFAULTS.flatShippingFee,
      0,
      invalidKeys,
    ),
  };

  return { policy, invalidKeys };
}

/**
 * The one delivery-fee rule, shared by the server that charges and the app that
 * displays, so the two can never disagree on the boundary.
 *
 * `atOrAbove` matters: the app previously used `>=` and the server `>`, so a
 * cart sitting exactly on the threshold was told delivery was free and then
 * charged for it.
 */
export function resolveShippingFee(subtotal: number, policy: CommercePolicy): number {
  if (!Number.isFinite(subtotal) || subtotal <= 0) return 0;
  return subtotal >= policy.freeShippingThreshold ? 0 : policy.flatShippingFee;
}

/** Cash on delivery is refused above the limit; the limit itself is allowed. */
export function isCodAllowed(total: number, policy: CommercePolicy): boolean {
  return total <= policy.codMaxLimit;
}
