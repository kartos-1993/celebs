import { type AdminProductDetail, SHIPPING_DEFAULTS } from '@celebs/shared-types';

import type { ProductFormValues } from '../types';

export const toCategoryPath = (cat: unknown): string[] => {
  if (!cat || typeof cat !== 'object') return [];
  const c = cat as { path?: string | string[]; name?: string };
  if (Array.isArray(c.path)) return c.path;
  if (typeof c.path === 'string' && c.path) {
    return c.path
      .split('/')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (c.name) return [c.name];
  return [];
};

/**
 * Normalizes SKU option retrieval across legacy flat fields and dynamic selectedOptions.
 */
export function extractSkuOption(
  sku: Record<string, unknown>,
  optionKey: string,
): string | undefined {
  const directVal = sku[optionKey] ?? sku[optionKey.toLowerCase()];
  if (typeof directVal === 'string' && directVal.trim()) return directVal.trim();

  const selectedOptions = sku.selectedOptions;
  if (selectedOptions && typeof selectedOptions === 'object') {
    const targetKey = optionKey.toLowerCase();
    for (const [key, val] of Object.entries(selectedOptions as Record<string, unknown>)) {
      if (key.toLowerCase() === targetKey && val !== undefined && val !== null) {
        return String(val).trim();
      }
    }
  }
  return undefined;
}

/**
 * Resolves form field path prefixes for SKU variant combinations.
 * Replaces nested ternaries with explicit, readable branches.
 */
export function resolveSkuPathPrefixes(color?: string, size?: string): string[] {
  if (color && size) {
    return [`sku.variants.${color}.${size}`, `sku.variants.Color.${color}.Size.${size}`];
  }
  if (color) {
    return [`sku.variants.${color}`, `sku.variants.color.${color}`, `sku.variants.Color.${color}`];
  }
  if (size) {
    return [`sku.variants.${size}`, `sku.variants.size.${size}`, `sku.variants.Size.${size}`];
  }
  return [];
}

export function assignSkuValues(
  values: ProductFormValues,
  pathPrefixes: string[],
  skuData: {
    price: string;
    specialPrice: string;
    stock: string;
    sellerSku: string;
    available: boolean;
  },
): void {
  for (const pathPrefix of pathPrefixes) {
    values[`${pathPrefix}.price`] = skuData.price;
    values[`${pathPrefix}.specialPrice`] = skuData.specialPrice;
    values[`${pathPrefix}.stock`] = skuData.stock;
    values[`${pathPrefix}.sellerSku`] = skuData.sellerSku;
    values[`${pathPrefix}.available`] = skuData.available;
  }
}

export function extractColorNames(colorVariants: unknown): string[] {
  if (!Array.isArray(colorVariants)) return [];
  return colorVariants
    .map((cv: unknown) => {
      if (!cv || typeof cv !== 'object') return '';
      const record = cv as { name?: string; colorName?: string };
      return record.name || record.colorName || '';
    })
    .filter(Boolean);
}

export function extractSizeNames(sizes: unknown): string[] {
  if (!Array.isArray(sizes)) return [];
  return sizes
    .map((s: unknown) => {
      if (typeof s === 'string') return s;
      if (s && typeof s === 'object') return (s as { name?: string }).name || '';
      return '';
    })
    .filter(Boolean);
}

export function hydrateColorVariantsAndGallery(
  product: AdminProductDetail,
  values: ProductFormValues,
  colorNames: string[],
): void {
  const dynamicRecord = product.dynamicData as Record<string, unknown> | undefined;
  const uploadedAssets = dynamicRecord?.uploadedAssets as
    | { colorMeta?: Record<string, { swatch?: string; images?: string[]; hot?: boolean }> }
    | undefined;
  const storedMeta =
    uploadedAssets?.colorMeta && typeof uploadedAssets.colorMeta === 'object'
      ? uploadedAssets.colorMeta
      : {};

  const variantsByName = new Map(
    (Array.isArray(product.colorVariants) ? product.colorVariants : [])
      .filter(Boolean)
      .map((cv: unknown) => {
        const record = cv as { name?: string; colorName?: string };
        return [record.name || record.colorName || 'Default', cv] as const;
      }),
  );

  for (const cName of colorNames) {
    const stored = storedMeta[cName];
    const fallback = variantsByName.get(cName) as
      | { swatch?: string; images?: string[] }
      | undefined;
    const swatch = stored?.swatch ?? fallback?.swatch;
    let images =
      stored?.images && stored.images.length > 0
        ? [...stored.images]
        : Array.isArray(fallback?.images)
          ? [...fallback.images]
          : [];

    if (swatch && images[0] === swatch) {
      images = images.slice(1);
    }
    const prefix = `variants.colorMeta.${cName}`;
    if (swatch) values[`${prefix}.swatch`] = swatch;
    if (images.length > 0) values[`${prefix}.images`] = images;
    const hot = stored && (stored as { hot?: boolean }).hot;
    if (hot !== undefined) values[`${prefix}.hot`] = hot;

    if (!values.variants || typeof values.variants !== 'object') {
      values.variants = { colorMeta: {} };
    }
    const variantsObj = values.variants as Record<string, unknown>;
    if (!variantsObj.colorMeta || typeof variantsObj.colorMeta !== 'object') {
      variantsObj.colorMeta = {};
    }
    const colorMetaObj = variantsObj.colorMeta as Record<string, Record<string, unknown>>;
    colorMetaObj[cName] = {
      ...(colorMetaObj[cName] || {}),
      ...(swatch ? { swatch } : {}),
      ...(images.length > 0 ? { images } : {}),
      ...(hot !== undefined ? { hot } : {}),
    };
  }
}

export function hydrateSkuMatrix(product: AdminProductDetail, values: ProductFormValues): void {
  if (!Array.isArray(product.skus) || product.skus.length === 0) return;

  for (const skuItem of product.skus) {
    if (!skuItem) continue;
    const sku = skuItem as Record<string, unknown>;

    const rawColor =
      extractSkuOption(sku, 'Color') ||
      (typeof sku.colorVariantName === 'string' ? sku.colorVariantName : undefined);
    const color = rawColor && rawColor.toLowerCase() !== 'default' ? rawColor : undefined;

    const rawSize =
      extractSkuOption(sku, 'Size') || (typeof sku.size === 'string' ? sku.size : undefined);
    const size = rawSize && rawSize.toLowerCase() !== 'default' ? rawSize : undefined;

    const priceVal = sku.price !== undefined ? String(sku.price) : '';
    const splPriceVal = sku.discountedPrice !== undefined ? String(sku.discountedPrice) : '';
    const stockVal =
      sku.stock !== undefined
        ? String(sku.stock)
        : sku.quantity !== undefined
          ? String(sku.quantity)
          : '';
    const sellerSkuVal = String(sku.skuCode || sku.sku || sku.sellerSku || '');
    const availableVal = sku.available !== false;

    const pathPrefixes = resolveSkuPathPrefixes(color, size);

    if (pathPrefixes.length > 0) {
      assignSkuValues(values, pathPrefixes, {
        price: priceVal,
        specialPrice: splPriceVal,
        stock: stockVal,
        sellerSku: sellerSkuVal,
        available: availableVal,
      });
    } else {
      const defaultPrice = product.price !== undefined ? String(product.price) : '';
      const defaultSplPrice =
        product.discountedPrice !== undefined ? String(product.discountedPrice) : '';

      values['sku.default.price'] = priceVal || defaultPrice;
      values['sku.default.specialPrice'] = splPriceVal || defaultSplPrice;
      values['sku.default.stock'] = stockVal;
      values['sku.default.sellerSku'] = sellerSkuVal;
      values['sku.default.available'] = availableVal;
    }
  }
}

export function hydrateShippingAndWarranty(
  product: AdminProductDetail,
  values: ProductFormValues,
): void {
  values.packageWeightKg = product.packageWeightKg ?? SHIPPING_DEFAULTS.packageWeightKg;
  values.packageLengthCm = product.packageLengthCm ?? undefined;
  values.packageWidthCm = product.packageWidthCm ?? undefined;
  values.packageHeightCm = product.packageHeightCm ?? undefined;
  values.packagingType = product.packagingType ?? SHIPPING_DEFAULTS.packagingType;
  values.isFragile = Boolean(product.isFragile);
  values.hasBatteryOrLiquid = Boolean(product.hasBatteryOrLiquid);
  values.warrantyType = product.warrantyType ?? SHIPPING_DEFAULTS.warrantyType;
  values.warrantyPeriod = product.warrantyPeriod ?? '';
  values.warrantyPolicy = product.warrantyPolicy ?? '';
  values.isNonReturnable = Boolean(product.isNonReturnable);
}

/**
 * Deserializes an existing ProductRecord from the API into React Hook Form state
 * for full edit-mode population (basic info, images, dynamic attrs, swatches, measurements, and SKU matrix).
 */
export function hydrateProductForm(
  product: AdminProductDetail,
  existingFormValues: ProductFormValues = {},
): ProductFormValues {
  const toId = (value: unknown): string => {
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object') {
      return String((value as { id?: string | number }).id ?? '');
    }
    return '';
  };

  const values: ProductFormValues = {
    ...existingFormValues,
    name: product.name ?? '',
    brand: product.brand ?? '',
    description: product.description ?? '',
    categoryId: toId(product.categoryId),
    subcategoryId: toId(product.subcategoryId || product.categoryId),
    price: product.price != null ? Number(product.price) : undefined,
    discountedPrice: product.discountedPrice != null ? Number(product.discountedPrice) : undefined,
    status: (product.status?.toLowerCase() as ProductFormValues['status']) ?? 'draft',
  };

  // 1. Hydrate Main Images
  if (Array.isArray(product.mainImages) && product.mainImages.length > 0) {
    values.mainImage = product.mainImages;
    values.mainImages = product.mainImages;
  } else {
    const legacy = product as unknown as Record<string, unknown>;
    if (typeof legacy.mainImage === 'string' && legacy.mainImage) {
      values.mainImage = [legacy.mainImage];
    }
  }

  // 2. Hydrate Dynamic Data attributes & SKU structure
  const dynamicRecord = product.dynamicData as Record<string, unknown> | undefined;
  const dynamicValues =
    (dynamicRecord?.values as Record<string, unknown> | undefined) || dynamicRecord || {};

  if (typeof dynamicValues === 'object' && dynamicValues !== null) {
    for (const [k, v] of Object.entries(dynamicValues)) {
      if (k === 'sku') {
        values.sku = v;
      } else {
        values[k] = v;
      }
    }
  }

  // 3. Hydrate Variant Selections (Color & Size keys)
  const colorNames = extractColorNames(product.colorVariants);
  if (colorNames.length > 0) {
    values.Color = colorNames;
    values.color = colorNames;
    values.colors = colorNames;
    values['Available Colors'] = colorNames;
  }

  const sizeNames = extractSizeNames(product.sizes);
  if (sizeNames.length > 0) {
    values.Size = sizeNames;
    values.size = sizeNames;
    values.sizes_list = sizeNames;
    values['Available Sizes'] = sizeNames;
  }

  // Match against variantFields declared in dynamicData
  const variantFields =
    (dynamicRecord?.variantFields as Array<{ key: string; kind: string }> | undefined) || [];
  for (const vf of variantFields) {
    if (vf.kind === 'color' && colorNames.length > 0) {
      values[vf.key] = colorNames;
    } else if (vf.kind === 'size' && sizeNames.length > 0) {
      values[vf.key] = sizeNames;
    }
  }

  // 4. Hydrate Sizes & Measurements table
  if (Array.isArray(product.sizes) && product.sizes.length > 0) {
    values.sizes = product.sizes as ProductFormValues['sizes'];
  }

  // 5. Hydrate Color Variants, Swatches & Gallery Images
  hydrateColorVariantsAndGallery(product, values, colorNames);

  // 6. Hydrate SKU Matrix Table fallback for individual paths
  hydrateSkuMatrix(product, values);

  // 7. Hydrate Shipping & Warranty
  hydrateShippingAndWarranty(product, values);

  return values;
}
