import { Prisma, type Product } from '@prisma/client';

import { HEX_COLOR_PATTERN, isFilledString } from './product-assets';

/**
 * Derives storefront color variants from dynamic-form color metadata
 * (`dynamicData.variants.colorMeta.<Key>`), falling back to the legacy
 * `colorVariants` column.
 *
 * CRITICAL FIX: Preserves the `stocks` array and merges live Postgres
 * `ProductInventory` quantities (quantity - reservedQuantity) so mobile & web
 * storefronts evaluate real-time out-of-stock and inventory states accurately.
 */
export const resolveStorefrontColorVariants = (
  legacyVariants: unknown,
  dynamicData: unknown,
  inventories?: unknown,
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

  // Build live inventory lookup map if Postgres ProductInventory records are loaded
  const inventoryMap = new Map<string, number>();
  if (Array.isArray(inventories) && inventories.length > 0) {
    for (const inv of inventories as Array<{
      colorVariantName?: string;
      size?: string;
      quantity?: number;
      reservedQuantity?: number;
    }>) {
      if (inv?.colorVariantName && inv?.size) {
        const key = `${inv.colorVariantName.trim().toLowerCase()}|${inv.size.trim().toLowerCase()}`;
        const available = Math.max(0, (inv.quantity ?? 0) - (inv.reservedQuantity ?? 0));
        inventoryMap.set(key, available);
      }
    }
  }

  const applyLiveStock = (
    variantName: string,
    stockList: Array<{ size: string; quantity: number }>,
  ): Array<{ size: string; quantity: number }> => {
    if (inventoryMap.size === 0) return stockList;
    return stockList.map((stk) => {
      const key = `${variantName.trim().toLowerCase()}|${stk.size.trim().toLowerCase()}`;
      const liveQty = inventoryMap.get(key);
      return {
        size: stk.size,
        quantity: typeof liveQty === 'number' ? liveQty : stk.quantity,
      };
    });
  };

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
        const initialStocks = Array.isArray(metaObj.stocks)
          ? (metaObj.stocks as Array<{ size: string; quantity: number }>)
          : Array.isArray(matchingLegacy?.stocks)
            ? (matchingLegacy.stocks as Array<{ size: string; quantity: number }>)
            : [];
        const stocks = applyLiveStock(name, initialStocks);

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
      const name = isFilledString(variant.name) ? variant.name : 'Variant';
      const initialStocks = Array.isArray(variant.stocks)
        ? (variant.stocks as Array<{ size: string; quantity: number }>)
        : [];
      const stocks = applyLiveStock(name, initialStocks);

      return {
        name,
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

  const colorVariants = resolveStorefrontColorVariants(
    prod.colorVariants,
    prod.dynamicData,
    prod.inventories,
  );

  const hasTrackedStock = colorVariants.some(
    (cv) => Array.isArray(cv.stocks) && cv.stocks.length > 0,
  );
  const inStock = hasTrackedStock
    ? colorVariants.some(
        (cv) => Array.isArray(cv.stocks) && cv.stocks.some((stk) => (stk.quantity ?? 0) > 0),
      )
    : true;

  const base: Record<string, unknown> = {
    ...prod,
    id: prod.id,
    brandId: prod.brandId || null,
    brand: prod.brand || (brandRefObj ? brandRefObj.name : null),
    brandRef: brandRefObj,
    price: prod.price != null ? Number(prod.price) : 0,
    colorVariants,
    inStock,
    discountedPrice: prod.discountedPrice != null ? Number(prod.discountedPrice) : undefined,
    category: categoryObj || prod.categoryId,
    subcategory: subcategoryObj || prod.subcategoryId,
  };

  // Strip raw relation objects that were only needed for computation
  delete base.inventories;

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
