import { Prisma, type Product } from '@prisma/client';

import { HEX_COLOR_PATTERN, isFilledString } from './product-assets';

/**
 * Derives storefront color variants from dynamic-form color metadata
 * (`dynamicData.variants.colorMeta.<Key>`), falling back to the legacy
 * `colorVariants` column.
 *
 * CRITICAL FIX: Preserves the `stocks` array so mobile & web storefronts
 * can evaluate out-of-stock and inventory states without false in-stock claims.
 */
export const resolveStorefrontColorVariants = (
  legacyVariants: unknown,
  dynamicData: unknown,
): Array<{
  name: string;
  colorCode?: string;
  swatch?: string;
  images: string[];
  stocks?: Array<{ size: string; quantity: number }>;
}> => {
  const dynamicDataObj =
    dynamicData && typeof dynamicData === 'object'
      ? (dynamicData as Record<string, unknown>)
      : undefined;
  const variantsRoot = dynamicDataObj?.variants as Record<string, unknown> | undefined;
  const colorMetaMap = variantsRoot?.colorMeta as Record<string, unknown> | undefined;

  const legacyList = Array.isArray(legacyVariants)
    ? (legacyVariants as Array<Record<string, unknown>>)
    : [];

  if (colorMetaMap && typeof colorMetaMap === 'object') {
    const derived = Object.entries(colorMetaMap)
      .filter(([, meta]) => meta && typeof meta === 'object')
      .map(([key, meta]) => {
        const metaObj = meta as Record<string, unknown>;
        const name = isFilledString(metaObj.name) ? metaObj.name.trim() : key;
        const matchingLegacy = legacyList.find(
          (l) => l.name === name || (typeof l.colorCode === 'string' && l.colorCode === key),
        );
        const images = [
          ...(isFilledString(metaObj.swatch) ? [metaObj.swatch] : []),
          ...(Array.isArray(metaObj.images)
            ? (metaObj.images as unknown[]).filter(isFilledString)
            : []),
        ];
        const stocks = Array.isArray(metaObj.stocks)
          ? (metaObj.stocks as Array<{ size: string; quantity: number }>)
          : Array.isArray(matchingLegacy?.stocks)
            ? (matchingLegacy.stocks as Array<{ size: string; quantity: number }>)
            : [];

        return {
          name,
          colorCode: HEX_COLOR_PATTERN.test(key) ? key : undefined,
          // Dots fall back to the variant's first product image when no
          // dedicated swatch was uploaded
          swatch: isFilledString(metaObj.swatch) ? metaObj.swatch : images[0],
          images,
          stocks,
        };
      });
    if (derived.length > 0) return derived;
  }

  if (legacyList.length > 0) {
    return legacyList.map((variant) => {
      const images = Array.isArray(variant.images)
        ? (variant.images as unknown[]).filter(isFilledString)
        : [];
      const stocks = Array.isArray(variant.stocks)
        ? (variant.stocks as Array<{ size: string; quantity: number }>)
        : [];

      return {
        name: isFilledString(variant.name) ? variant.name : 'Variant',
        colorCode: isFilledString(variant.colorCode) ? variant.colorCode : undefined,
        swatch: isFilledString(variant.swatch) ? variant.swatch : images[0],
        images,
        stocks,
      };
    });
  }

  return [];
};

export const formatProductResponse = (
  product:
    | Product
    | (Prisma.ProductGetPayload<object> & Record<string, unknown>)
    | Record<string, unknown>
    | null,
  options?: { isElevated?: boolean },
): Record<string, unknown> | null => {
  if (!product) return null;
  const prod = product as Record<string, unknown>;
  const categoryObj =
    prod.category && typeof prod.category === 'object'
      ? (prod.category as Record<string, unknown>)
      : null;
  const subcategoryObj =
    prod.subcategory && typeof prod.subcategory === 'object'
      ? (prod.subcategory as Record<string, unknown>)
      : null;
  const brandRefObj =
    prod.brandRef && typeof prod.brandRef === 'object'
      ? (prod.brandRef as Record<string, unknown>)
      : null;

  const base: Record<string, unknown> = {
    ...prod,
    id: prod.id,
    brandId: prod.brandId || null,
    brand: prod.brand || (brandRefObj ? brandRefObj.name : null),
    brandRef: brandRefObj,
    price: prod.price != null ? Number(prod.price) : 0,
    colorVariants: resolveStorefrontColorVariants(prod.colorVariants, prod.dynamicData),
    discountedPrice: prod.discountedPrice != null ? Number(prod.discountedPrice) : undefined,
    category: categoryObj || prod.categoryId,
    subcategory: subcategoryObj || prod.subcategoryId,
  };

  // Scrub internal staff moderation and audit fields on public / non-elevated calls
  if (!options?.isElevated) {
    delete base.reviewNote;
    delete base.rejectionReasonCategory;
    delete base.rejectionSubcategories;
    delete base.rejectionFields;
    delete base.reviewHistory;
    delete base.reviewedBy;
    delete base.reviewedAt;
    delete base.createdBy;
    delete base.updatedBy;
  }

  return base;
};
