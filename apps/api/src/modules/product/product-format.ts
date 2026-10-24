import { Prisma, type Product } from '@prisma/client';

import { isPlaceholderVariant, validDiscount } from '@celebs/shared-utils';

import { HEX_COLOR_PATTERN, isFilledString } from './product-assets';

type StorefrontColorVariant = {
  name: string;
  colorCode?: string;
  swatch?: string;
  images: string[];
  stocks?: Array<{ size: string; quantity: number }>;
};

/**
 * Derives storefront color variants from dynamic-form color metadata
 * (`dynamicData.variants.colorMeta.<Key>`), falling back to the legacy
 * `colorVariants` column.
 *
 * CRITICAL FIX: Preserves the `stocks` array and merges live Postgres
 * `ProductInventory` quantities (quantity - reservedQuantity) so mobile & web
 * storefronts evaluate real-time out-of-stock and inventory states accurately.
 *
 * WONTFIX: client must satisfy `colorVariantSchema` (required `colorCode`,
 * `url()`-only `swatch`/`images`). This read path is stored-data-only by design:
 * it never invents a missing `colorCode`, never validates image URLs, and never
 * coerces a rejected payload. Fixing the payload is client work, not presenter
 * work — the schema stays strict.
 *
 * Module-private: zero external importers (grep-verified), so the export keyword
 * would only be dead public surface.
 */
const resolveStorefrontColorVariants = (
  storedColorVariants: unknown,
  dynamicData: unknown,
  inventories?: unknown,
): StorefrontColorVariant[] => {
  const dynamicDataObj =
    dynamicData && typeof dynamicData === 'object'
      ? (dynamicData as Record<string, unknown>)
      : undefined;
  const variantsRoot = dynamicDataObj?.variants as Record<string, unknown> | undefined;
  const colorMetaMap = variantsRoot?.colorMeta as Record<string, unknown> | undefined;

  const storedColorVariantsList = Array.isArray(storedColorVariants)
    ? (storedColorVariants as Array<Record<string, unknown>>)
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
        const matchingStored = storedColorVariantsList.find(
          (l) => l.name === name || (typeof l.colorCode === 'string' && l.colorCode === key),
        );
        // Stored-data-only: images are exactly what was stored; the swatch is
        // never prepended into the gallery (no invented duplicates).
        const images = Array.isArray(metaObj.images)
          ? (metaObj.images as unknown[]).filter(isFilledString)
          : [];
        const initialStocks = Array.isArray(metaObj.stocks)
          ? (metaObj.stocks as Array<{ size: string; quantity: number }>)
          : Array.isArray(matchingStored?.stocks)
            ? (matchingStored.stocks as Array<{ size: string; quantity: number }>)
            : [];
        const stocks = applyLiveStock(name, initialStocks);
        const variantStockTotal = stocks.reduce((sum, s) => sum + Math.max(0, s.quantity ?? 0), 0);
        const inStock = stocks.length > 0 ? variantStockTotal > 0 : true;

        return {
          name,
          colorCode: HEX_COLOR_PATTERN.test(key) ? key : undefined,
          // Stored-data-only: no `images[0]` fallback when no swatch was stored.
          swatch: isFilledString(metaObj.swatch) ? metaObj.swatch : undefined,
          images,
          stocks,
          inStock,
        };
      });
    if (derived.length > 0) return derived;
  }

  if (storedColorVariantsList.length > 0) {
    return storedColorVariantsList.map((variant) => {
      const images = Array.isArray(variant.images)
        ? (variant.images as unknown[]).filter(isFilledString)
        : [];
      const name = isFilledString(variant.name) ? variant.name : 'Variant';
      const initialStocks = Array.isArray(variant.stocks)
        ? (variant.stocks as Array<{ size: string; quantity: number }>)
        : [];
      const stocks = applyLiveStock(name, initialStocks);
      const variantStockTotal = stocks.reduce((sum, s) => sum + Math.max(0, s.quantity ?? 0), 0);
      const inStock = stocks.length > 0 ? variantStockTotal > 0 : true;

      return {
        name,
        colorCode: isFilledString(variant.colorCode) ? variant.colorCode : undefined,
        // Stored-data-only: no `images[0]` fallback when no swatch was stored.
        swatch: isFilledString(variant.swatch) ? variant.swatch : undefined,
        images,
        stocks,
        inStock,
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
  // WONTFIX: client must satisfy `idSchema` (UUID) for `categoryId` /
  // `subcategoryId` on write. This read path never invents an id: a relation that
  // was not loaded surfaces as null, and a raw UUID string never leaks as a
  // category object. The schema stays strict.
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

  const resolvedVariants = resolveStorefrontColorVariants(
    prod.colorVariants,
    prod.dynamicData,
    prod.inventories,
  );

  const rawInventories = Array.isArray(prod.inventories)
    ? (prod.inventories as Array<{ quantity?: number; reservedQuantity?: number }>)
    : [];

  const inventoryStockTotal = rawInventories.reduce(
    (sum, inv) => sum + Math.max(0, (inv?.quantity ?? 0) - (inv?.reservedQuantity ?? 0)),
    0,
  );

  const rawVariantStock = resolvedVariants.reduce((sum, v) => {
    if (!Array.isArray(v.stocks)) return sum;
    return sum + v.stocks.reduce((sSum, s) => sSum + Math.max(0, s.quantity ?? 0), 0);
  }, 0);

  const rawSkuStock = Array.isArray(prod.skus)
    ? (prod.skus as Array<{ stock?: number }>).reduce(
        (sum, s) => sum + Math.max(0, Number(s?.stock ?? 0) || 0),
        0,
      )
    : 0;

  // Relational PostgreSQL ProductInventory is authoritative when loaded.
  // Fallback to static JSON variant/SKU stock only when rawInventories is empty.
  const derivedStockTotal =
    rawInventories.length > 0 ? inventoryStockTotal : Math.max(rawVariantStock, rawSkuStock);

  // Stock is read BEFORE the carrier is dropped: a colourless product holds its
  // quantity on the carrier row, and that is exactly the stock the storefront
  // must see. Also considers raw SKU stock and relational PostgreSQL ProductInventory.
  const inStock = derivedStockTotal > 0;

  // CONTRACT: the size-only carrier is NOT a colour. It stays in storage (the
  // inventory matrix and the publish floor need it) but never reaches a client:
  // a product whose only variant is the carrier reports no colour axis.
  const colorVariants = resolvedVariants.filter((cv) => !isPlaceholderVariant(cv.name));
  const hasColorAxis = colorVariants.length > 0;

  const price = prod.price != null ? Number(prod.price) : 0;
  const base: Record<string, unknown> = {
    ...prod,
    id: prod.id,
    brandId: prod.brandId || null,
    brand: prod.brand || (brandRefObj ? brandRefObj.name : null),
    brandRef: brandRefObj,
    price,
    colorVariants,
    hasColorAxis,
    inStock,
    _derivedStockTotal: derivedStockTotal,
    // Presenters hide invalid deals: only 0 < discounted < price is emitted.
    discountedPrice: validDiscount(price, prod.discountedPrice),
    // CONTRACT: non-object categories surface as NULL (never a raw UUID string).
    category: categoryObj ?? null,
    subcategory: subcategoryObj ?? null,
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
