/**
 * Identifies whether a given variant label or option is a dummy placeholder ('default', '', null, undefined).
 */
export function isPlaceholderVariant(value?: string | null): boolean {
  if (!value) return true;
  const trimmed = value.trim();
  if (!trimmed) return true;
  return trimmed.toLowerCase() === 'default';
}

/**
 * Builds a canonical variant composite key by trimming, lowercasing,
 * filtering out dummy/default placeholders, sorting alphabetically, and joining with ':::'.
 */
export function buildVariantKey(values: Array<string | undefined | null>): string {
  return values
    .map((v) => (v ? v.trim().toLowerCase() : ''))
    .filter((v) => Boolean(v) && v !== 'default')
    .sort()
    .join(':::');
}
