import { Palette } from '@/constants/theme';

/**
 * The one dot colour used when a colour variant carries no `colorCode`.
 *
 * Previously two sites invented their own: the product-card swatch capsule
 * hardcoded iOS system grey `#8e8e93` and the PDP swatch fell back to
 * `Palette.black`, so the SAME missing data rendered as two different colours
 * depending on which surface the shopper was looking at. `Palette.gray400` is
 * the neutral token: light enough to read as "no colour supplied" and dark
 * enough to stay visible against the card's white surface.
 */
export const SWATCH_DOT_FALLBACK_COLOR = Palette.gray400;

/** Canonical dot source: explicit swatch photo, else the variant's first photo. */
export function swatchDotImage(variant: {
  swatch?: string;
  images?: string[];
}): string | undefined {
  const swatch = variant.swatch?.trim();
  if (swatch) return swatch;
  const photo = variant.images?.[0];
  return typeof photo === 'string' && photo.trim() ? photo.trim() : undefined;
}

/** Canonical flat-dot fill: the seller's colourCode, else the shared fallback. */
export function swatchDotColor(variant: { colorCode?: string }): string {
  return variant.colorCode?.trim() || SWATCH_DOT_FALLBACK_COLOR;
}
