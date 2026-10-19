import { moneyMax, moneyPercentOf, moneySubtract } from '@celebs/shared-utils';

import { RenderableBundleItem } from '../components/combo-bundle-item-card';
import { ComboBundleData } from '../components/combo-bundle-showcase';

import { firstRenderableImage } from '@/utils/image';

/** Finite non-negative number, or undefined. Tolerates a NULL API price. */
function finiteOrZero(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Projects the backend-declared bundle items onto renderable rows.
 *
 * Nothing is invented: no demo/Unsplash imagery, no default price, no default
 * S/M/L/XL size list, no 'Default' color. A row the API did not hydrate is
 * dropped, and the caller renders its empty state.
 */
export function getComboDisplayItems(combo: ComboBundleData | null): RenderableBundleItem[] {
  const itemDetails = combo?.itemDetails ?? combo?.items ?? [];
  if (itemDetails.length === 0) return [];

  return itemDetails.flatMap((item, idx) => {
    const prod = item.product;
    if (!prod?.id) return [];

    const colorImages = prod.colorVariants?.flatMap((cv) => cv.images ?? []) ?? [];
    // The derived `cover` is the field the API sends; a colour gallery is the
    // per-colour override that only some bundle rows carry.
    const image = prod.cover?.trim() ?? firstRenderableImage(colorImages) ?? '';
    const sizes = Array.from(
      new Set(
        (prod.colorVariants ?? []).flatMap(
          (cv) => (cv.stocks ?? []).map((s) => s.size).filter(Boolean) as string[],
        ),
      ),
    );
    const colors = (prod.colorVariants ?? []).map((cv) => cv.name).filter(Boolean);

    return [
      {
        id: item.id || `item_${idx}`,
        productId: prod.id,
        name: prod.name ?? '',
        originalPrice: finiteOrZero(prod.price),
        image,
        sizes,
        colors,
      },
    ];
  });
}

export function calculateComboPricing(combo: ComboBundleData | null, totalOriginal: number) {
  const original = Number.isFinite(totalOriginal) ? moneyMax(0, totalOriginal) : 0;
  let finalPrice = original;
  let savings = 0;

  if (combo) {
    // Exact: this is a percentage of a price the shopper is shown, and the
    // difference between the float answer and the decimal one is a rupee on a
    // large bundle.
    if (combo.discountType === 'PERCENTAGE') {
      savings = moneyPercentOf(original, finiteOrZero(combo.discountValue));
      finalPrice = moneySubtract(original, savings);
    } else {
      savings = moneyMax(0, finiteOrZero(combo.discountValue));
      finalPrice = moneyMax(0, moneySubtract(original, savings));
    }
  }

  return { finalPrice, savings };
}
