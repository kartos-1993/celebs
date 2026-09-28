/**
 * Name of the size-only CARRIER variant — plumbing, never a colour.
 *
 * A product with no colour axis (one black jacket, three sizes) still has to
 * satisfy the persisted shape that inventory rows and the publish floor depend
 * on, so it keeps one entry under this name. `buildVariantKey` strips the
 * segment, which is exactly what lets those rows bind to size-only SKUs.
 *
 * Read paths must not present it as a colour: a product whose only variant is
 * the carrier has NO colour axis, and reports `colorVariants: []` plus an
 * explicit `hasColorAxis: false` instead.
 */
export const PRODUCT_CARRIER_VARIANT = 'Default';

/** Lower-cased carrier name: the key segment and placeholder test both use it. */
const CARRIER_SEGMENT = PRODUCT_CARRIER_VARIANT.toLowerCase();

/**
 * Identifies whether a given variant label or option is a dummy placeholder ('default', '', null, undefined).
 */
export function isPlaceholderVariant(value?: string | null): boolean {
  if (!value) return true;
  const trimmed = value.trim();
  if (!trimmed) return true;
  return trimmed.toLowerCase() === CARRIER_SEGMENT;
}

/**
 * Builds a canonical variant composite key by trimming, lowercasing,
 * filtering out dummy/default placeholders, sorting alphabetically, and joining with ':::'.
 */
export function buildVariantKey(values: Array<string | undefined | null>): string {
  return values
    .map((v) => (v ? v.trim().toLowerCase() : ''))
    .filter((v) => Boolean(v) && v !== CARRIER_SEGMENT)
    .sort()
    .join(':::');
}
