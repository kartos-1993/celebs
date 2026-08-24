import { Prisma, type Product } from '@prisma/client';

import { HEX_COLOR_PATTERN, isFilledString } from './product-assets';

/**
 * Derives storefront color variants from the dynamic-form color metadata
 * (`dynamicData.variants.colorMeta.<Key>`), falling back to the legacy
 * `colorVariants` column when no dynamic metadata exists.
 */
export const resolveStorefrontColorVariants = (
  legacyVariants: unknown,
  dynamicData: unknown,
): Array<{ name: string; colorCode?: string; swatch?: string; images: string[] }> => {
  const dynamicDataObj =
    dynamicData && typeof dynamicData === 'object'
      ? (dynamicData as Record<string, unknown>)
      : undefined;
  const variantsRoot = dynamicDataObj?.variants as Record<string, unknown> | undefined;
  const colorMetaMap = variantsRoot?.colorMeta as Record<string, unknown> | undefined;

  if (colorMetaMap && typeof colorMetaMap === 'object') {
    const derived = Object.entries(colorMetaMap)
      .filter(([, meta]) => meta && typeof meta === 'object')
      .map(([key, meta]) => {
        const metaObj = meta as Record<string, unknown>;
        const images = [
          ...(isFilledString(metaObj.swatch) ? [metaObj.swatch] : []),
          ...(Array.isArray(metaObj.images)
            ? (metaObj.images as unknown[]).filter(isFilledString)
            : []),
        ];
        return {
          name: isFilledString(metaObj.name) ? metaObj.name.trim() : key,
          colorCode: HEX_COLOR_PATTERN.test(key) ? key : undefined,
          // Dots fall back to the variant's first product image when no
          // dedicated swatch was uploaded (SHEIN-style thumbnails)
          swatch: isFilledString(metaObj.swatch) ? metaObj.swatch : images[0],
          images,
        };
      });
    if (derived.length > 0) return derived;
  }

  if (Array.isArray(legacyVariants)) {
    return (legacyVariants as Array<Record<string, unknown>>).map((variant) => {
      const images = Array.isArray(variant.images)
        ? (variant.images as unknown[]).filter(isFilledString)
        : [];
      return {
        name: isFilledString(variant.name) ? variant.name : 'Variant',
        colorCode: isFilledString(variant.colorCode) ? variant.colorCode : undefined,
        swatch: isFilledString(variant.swatch) ? variant.swatch : images[0],
        images,
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

  return {
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
};
