import { RenderableBundleItem } from '../components/combo-bundle-item-card';
import { ComboBundleData } from '../components/combo-bundle-showcase';

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
    const image = prod.mainImages?.[0] ?? colorImages[0] ?? '';
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
  const original = Number.isFinite(totalOriginal) ? Math.max(0, totalOriginal) : 0;
  let finalPrice = original;
  let savings = 0;

  if (combo) {
    if (combo.discountType === 'PERCENTAGE') {
      savings = Math.round((original * finiteOrZero(combo.discountValue)) / 100);
      finalPrice = original - savings;
    } else {
      savings = finiteOrZero(combo.discountValue);
      finalPrice = Math.max(0, original - savings);
    }
  }

  return { finalPrice, savings };
}
