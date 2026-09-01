import { RenderableBundleItem } from '../components/combo-bundle-item-card';
import { ComboBundleData } from '../components/combo-bundle-showcase';

export const FALLBACK_BUNDLE_ITEMS: RenderableBundleItem[] = [
  {
    id: 'item_thermal_top',
    name: 'Heavy Fleece Thermal Top',
    originalPrice: 2499,
    image:
      'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=400&auto=format&fit=crop',
    sizes: ['M', 'L', 'XL'],
    colors: ['Black', 'Grey'],
  },
  {
    id: 'item_puffer_jacket',
    name: 'Windproof Winter Puffer Coat',
    originalPrice: 5999,
    image: 'https://images.unsplash.com/photo-1544441893-675973e31985?w=400&auto=format&fit=crop',
    sizes: ['M', 'L', 'XL'],
    colors: ['Black', 'Navy'],
  },
  {
    id: 'item_thermal_bottom',
    name: 'Insulated Base Layer Pant',
    originalPrice: 1999,
    image:
      'https://images.unsplash.com/photo-1582552938357-32b906df40cb?w=400&auto=format&fit=crop',
    sizes: ['M', 'L', 'XL'],
    colors: ['Black'],
  },
];

export function getComboDisplayItems(combo: ComboBundleData | null): RenderableBundleItem[] {
  if (combo?.itemDetails && combo.itemDetails.length > 0) {
    return combo.itemDetails.map((item, idx) => {
      const prod = item.product;
      const mainImg =
        prod?.mainImages && prod.mainImages.length > 0
          ? prod.mainImages[0]
          : prod?.colorVariants &&
              prod.colorVariants.length > 0 &&
              prod.colorVariants[0]?.images?.length
            ? prod.colorVariants[0].images[0]
            : FALLBACK_BUNDLE_ITEMS[idx % FALLBACK_BUNDLE_ITEMS.length].image;

      const sizes = prod?.colorVariants
        ? Array.from(
            new Set(
              prod.colorVariants.flatMap(
                (cv) => cv.stocks?.map((s) => s.size).filter(Boolean) || [],
              ),
            ),
          )
        : [];

      const colors = prod?.colorVariants
        ? prod.colorVariants.map((cv) => cv.name).filter(Boolean)
        : [];

      return {
        id: item.id || `item_${idx}`,
        name: prod?.name || `Product ${idx + 1}`,
        originalPrice: prod?.price || 2499,
        image: mainImg,
        sizes: sizes.length > 0 ? sizes : ['S', 'M', 'L', 'XL'],
        colors: colors.length > 0 ? colors : ['Default'],
      };
    });
  }
  return FALLBACK_BUNDLE_ITEMS;
}

export function calculateComboPricing(combo: ComboBundleData | null, totalOriginal: number) {
  let finalPrice = totalOriginal;
  let savings = 0;

  if (combo) {
    if (combo.discountType === 'PERCENTAGE') {
      savings = Math.round((totalOriginal * combo.discountValue) / 100);
      finalPrice = totalOriginal - savings;
    } else {
      savings = Number(combo.discountValue);
      finalPrice = Math.max(0, totalOriginal - savings);
    }
  }

  return { finalPrice, savings };
}
