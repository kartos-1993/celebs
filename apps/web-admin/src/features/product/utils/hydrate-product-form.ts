import type { AdminProductDetail } from '@celebs/shared-types';

import type { ProductFormValues } from '../hooks/use-product-form';

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
    price:
      product.price !== undefined && product.price !== null ? Number(product.price) : undefined,
    discountedPrice:
      product.discountedPrice !== undefined && product.discountedPrice !== null
        ? Number(product.discountedPrice)
        : undefined,
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
  const colorNames = Array.isArray(product.colorVariants)
    ? product.colorVariants
        .map((cv: unknown) => {
          if (!cv || typeof cv !== 'object') return '';
          const record = cv as { name?: string; colorName?: string };
          return record.name || record.colorName || '';
        })
        .filter(Boolean)
    : [];

  if (colorNames.length > 0) {
    values.Color = colorNames;
    values.color = colorNames;
    values.colors = colorNames;
    values['Available Colors'] = colorNames;
  }

  const sizeNames = Array.isArray(product.sizes)
    ? product.sizes
        .map((s: unknown) => {
          if (typeof s === 'string') return s;
          if (s && typeof s === 'object') return (s as { name?: string }).name || '';
          return '';
        })
        .filter(Boolean)
    : [];

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
  // Canonical rule: gallery keys MUST equal the axis values set above
  // (display labels). Anything else orphans on read (payload) or write.
  const uploadedAssets = dynamicRecord?.uploadedAssets as
    | {
        colorMeta?: Record<string, { swatch?: string; images?: string[]; hot?: boolean }>;
      }
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
    // The storefront presenter prepends the swatch into images: strip it
    // back out so re-saving does not duplicate it into the gallery.
    if (swatch && images[0] === swatch) {
      images = images.slice(1);
    }
    const prefix = `variants.colorMeta.${cName}`;
    if (swatch) values[`${prefix}.swatch`] = swatch;
    if (images.length > 0) values[`${prefix}.images`] = images;
    const hot = stored && (stored as { hot?: boolean }).hot;
    if (hot !== undefined) values[`${prefix}.hot`] = hot;
  }

  // 6. Hydrate SKU Matrix Table fallback for individual paths
  if (Array.isArray(product.skus) && product.skus.length > 0) {
    for (const skuItem of product.skus) {
      if (!skuItem) continue;
      const sku = skuItem as Record<string, unknown>;
      const color =
        extractSkuOption(sku, 'Color') ||
        (typeof sku.colorVariantName === 'string' ? sku.colorVariantName : undefined);
      const size = extractSkuOption(sku, 'Size');

      if (color && size) {
        const pathPrefixes = [
          `sku.variants.${color}.${size}`,
          `sku.variants.Color.${color}.Size.${size}`,
        ];
        for (const pathPrefix of pathPrefixes) {
          values[`${pathPrefix}.price`] = sku.price !== undefined ? String(sku.price) : '';
          values[`${pathPrefix}.specialPrice`] =
            sku.discountedPrice !== undefined ? String(sku.discountedPrice) : '';
          values[`${pathPrefix}.stock`] =
            sku.stock !== undefined
              ? String(sku.stock)
              : sku.quantity !== undefined
                ? String(sku.quantity)
                : '';
          values[`${pathPrefix}.sellerSku`] = sku.sku || sku.sellerSku || '';
          values[`${pathPrefix}.available`] = sku.available ?? true;
        }
      }
    }
  }

  return values;
}
