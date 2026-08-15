import type { ProductRecord } from '../types';
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
 * Deserializes an existing ProductRecord from the API into React Hook Form state
 * for full edit-mode population (basic info, images, dynamic attrs, swatches, measurements, and SKU matrix).
 */
export function hydrateProductForm(
  product: ProductRecord,
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
    status: product.status ?? 'draft',
  };

  // 1. Hydrate Main Images
  if (Array.isArray(product.mainImages) && product.mainImages.length > 0) {
    values.mainImage = product.mainImages;
    values.mainImages = product.mainImages;
  } else if ((product as Record<string, unknown>).mainImage) {
    values.mainImage = [(product as Record<string, unknown>).mainImage as string];
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
        .map(
          (cv: { name?: string; colorName?: string } | undefined) =>
            cv?.name || cv?.colorName || '',
        )
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
        .map((s: { name?: string } | string | undefined) =>
          typeof s === 'string' ? s : s?.name || '',
        )
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
    values.sizes = product.sizes;
  }

  // 5. Hydrate Color Variants, Swatches & Gallery Images
  const uploadedAssets = dynamicRecord?.uploadedAssets as
    | {
        colorMeta?: Record<string, { swatch?: string; images?: string[]; hot?: boolean }>;
      }
    | undefined;

  if (uploadedAssets?.colorMeta && typeof uploadedAssets.colorMeta === 'object') {
    for (const [cName, meta] of Object.entries(uploadedAssets.colorMeta)) {
      const prefix = `variants.colorMeta.${cName}`;
      if (meta.swatch) values[`${prefix}.swatch`] = meta.swatch;
      if (Array.isArray(meta.images) && meta.images.length > 0)
        values[`${prefix}.images`] = meta.images;
      if (meta.hot !== undefined) values[`${prefix}.hot`] = meta.hot;
    }
  }

  if (Array.isArray(product.colorVariants)) {
    for (const cv of product.colorVariants) {
      if (!cv) continue;
      const cvRecord = cv as {
        name?: string;
        colorName?: string;
        swatch?: string;
        images?: string[];
      };
      const cName = cvRecord.name || cvRecord.colorName || 'Default';
      const prefix = `variants.colorMeta.${cName}`;
      if (cvRecord.swatch && !values[`${prefix}.swatch`]) {
        values[`${prefix}.swatch`] = cvRecord.swatch;
      }
      if (
        Array.isArray(cvRecord.images) &&
        cvRecord.images.length > 0 &&
        !values[`${prefix}.images`]
      ) {
        values[`${prefix}.images`] = cvRecord.images;
      }
    }
  }

  // 6. Hydrate SKU Matrix Table fallback for individual paths
  if (Array.isArray(product.skus) && product.skus.length > 0) {
    for (const skuItem of product.skus) {
      if (!skuItem) continue;
      const sku = skuItem as {
        color?: string;
        colorVariantName?: string;
        size?: string;
        price?: number;
        discountedPrice?: number;
        stock?: number;
        quantity?: number;
        sku?: string;
        sellerSku?: string;
        available?: boolean;
      };
      const color = sku.color || sku.colorVariantName;
      const size = sku.size;

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
