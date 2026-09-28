import { type AdminProductDetail, SHIPPING_DEFAULTS } from '@celebs/shared-types';

import type { ProductFormValues } from '../types';

import {
  assignDeep,
  defaultSkuPath,
  normalizeText,
  resolveMatrixAxes,
  type SkuMatrixAxes,
  skuVariantPath,
} from './add-product-helpers';

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
 * The axis keys a product with NO `variantFields` metadata is read under.
 * `buildPayloadSkus` has always written `selectedOptions: { Color, Size }`, so
 * these are the keys its stored rows are actually under.
 */
const DEFAULT_SKU_AXIS_KEYS = ['Color', 'Size'];

/**
 * The axes THIS product's matrix renders, read from the same source the cells
 * read them: the persisted schema axes in `dynamicData.variantFields`, in
 * declaration order. So a category that names its axes `Shade` / `Length`, or
 * declares a third axis, hydrates into the path its cells register instead of
 * one no cell can resolve. The `Color`/`Size` literals are only the fallback for
 * a product with no axis metadata at all.
 *
 * Resolution, order, and the colour/size slots all come from the shared
 * {@link resolveMatrixAxes} — the same function `buildProductPayload` reads its
 * axis keys through — so the two halves of the round trip cannot disagree about
 * what this product's axes are called or in what order they are walked.
 */
export function resolveSkuAxes(product: AdminProductDetail): SkuMatrixAxes {
  const dynamicRecord = product.dynamicData as
    | { variantFields?: Array<{ key?: string; kind?: string }> }
    | undefined;
  const declared = Array.isArray(dynamicRecord?.variantFields) ? dynamicRecord.variantFields : [];
  return resolveMatrixAxes(declared, DEFAULT_SKU_AXIS_KEYS);
}

/**
 * The `sku.variants.*` prefix one stored SKU row hydrates into, or `undefined`
 * when the row selects no variant (that row is the product's single
 * `sku.default` row).
 *
 * `axisValues` is the row's `[axisKey, value]` pairs in the product's DECLARED
 * axis order — the order the cells walk the axes in — so this generalises to N
 * axes exactly as `skuVariantPath` does, and a row that leaves one axis
 * unselected is dropped from the path just as the cells drop it from theirs.
 *
 * Every segment goes through `skuVariantPath` — the exact builder
 * `sku-table-utils` re-exports as the cells' `skuVariantPath` — so the writer's
 * path EQUALS the name a cell registers BY CONSTRUCTION, `sanitizeVariantKey`
 * encoding included (a `28.5` or `6 [slim]` value lands where the cell reads
 * it). The old builder hardcoded `Color`/`Size` segment names and skipped the
 * sanitiser, which orphaned every cell on a differently-named axis.
 */
export function resolveSkuPathPrefix(
  axisValues: ReadonlyArray<readonly [string, string]>,
): string | undefined {
  const segments = axisValues.flatMap(([key, value]) => [key, value]);
  return segments.length > 0 ? skuVariantPath(...segments) : undefined;
}

/**
 * `default` is the placeholder an unselected axis carries, not a variant, so
 * it is dropped before any path is built.
 */
const usableAxisValue = (value: string | undefined): string | undefined => {
  const text = normalizeText(value);
  return text && text.toLowerCase() !== 'default' ? text : undefined;
};

export interface SkuCellData {
  price: string;
  specialPrice: string;
  stock: string;
  sellerSku: string;
  available: boolean;
}

/**
 * Writes the five matrix fields under `pathPrefix` as NESTED form state — the
 * shape a `useController` cell actually reads. Writing them as literal dotted
 * keys made the cell and the payload disagree about which copy of a price was
 * real, and the stale one won.
 */
export function assignSkuValues(
  values: ProductFormValues,
  pathPrefix: string,
  skuData: SkuCellData,
): void {
  for (const [field, value] of Object.entries(skuData)) {
    assignDeep(values, `${pathPrefix}.${field}`, value);
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

/**
 * The one place a colour's stored gallery is read.
 *
 * A stored gallery that still carries its swatch as `images[0]` would render
 * that photo twice in the form (the swatch tile plus a gallery thumbnail), so
 * the head is dropped FOR DISPLAY and the exact URL removed is recorded as
 * `strippedSwatchHead`. The payload builder restores precisely that recorded
 * URL on save, so a save that touches no images round-trips the stored gallery
 * byte-identically instead of losing the swatch photo for good. The server's
 * admin detail returns the stored array verbatim for the same reason: the strip
 * is a presentation transform, never a persisted one.
 */
function readColorGallery(
  swatch: string | undefined,
  storedImages: string[] | undefined,
  fallbackImages: string[] | undefined,
): { images: string[]; strippedSwatchHead?: string } {
  const source = storedImages && storedImages.length > 0 ? storedImages : (fallbackImages ?? []);
  if (swatch && source[0] === swatch) {
    return { images: source.slice(1), strippedSwatchHead: swatch };
  }
  return { images: [...source] };
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
    const { images, strippedSwatchHead } = readColorGallery(
      swatch,
      stored?.images,
      Array.isArray(fallback?.images) ? fallback.images : undefined,
    );
    const prefix = `variants.colorMeta.${cName}`;
    if (swatch) assignDeep(values, `${prefix}.swatch`, swatch);
    if (images.length > 0) assignDeep(values, `${prefix}.images`, images);
    if (strippedSwatchHead) assignDeep(values, `${prefix}.strippedSwatchHead`, strippedSwatchHead);
    const hot = stored && (stored as { hot?: boolean }).hot;
    if (hot !== undefined) assignDeep(values, `${prefix}.hot`, hot);
  }
}

/**
 * Pre-`selectedOptions` columns: a stored row from before the options block
 * carried the colour/size on dedicated columns instead. Keyed by axis slot, not
 * by axis key, so a schema that really is named `Size` resolves through
 * `extractSkuOption` first and only falls through to this when it is not.
 */
const LEGACY_AXIS_COLUMNS = { color: 'colorVariantName', size: 'size' } as const;

export function hydrateSkuMatrix(product: AdminProductDetail, values: ProductFormValues): void {
  if (!Array.isArray(product.skus) || product.skus.length === 0) return;

  const axes = resolveSkuAxes(product);

  for (const skuItem of product.skus) {
    if (!skuItem) continue;
    const sku = skuItem as Record<string, unknown>;

    // Read every declared axis under its REAL key, in the product's declared
    // order, and keep only the axes this row actually selects — the cells drop
    // an unselected axis from their paths too, so the two agree segment for
    // segment or the row lands nowhere.
    const axisValues: Array<[string, string]> = [];
    for (const key of axes.keys) {
      const slot = key === axes.color ? 'color' : key === axes.size ? 'size' : undefined;
      const legacyColumn = slot ? LEGACY_AXIS_COLUMNS[slot] : undefined;
      const legacy = legacyColumn ? sku[legacyColumn] : undefined;
      const value = usableAxisValue(
        extractSkuOption(sku, key) ?? (typeof legacy === 'string' ? legacy : undefined),
      );
      if (value) axisValues.push([key, value]);
    }

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

    const cells: SkuCellData = {
      price: priceVal,
      specialPrice: splPriceVal,
      stock: stockVal,
      sellerSku: sellerSkuVal,
      available: availableVal,
    };

    const pathPrefix = resolveSkuPathPrefix(axisValues);
    if (pathPrefix) {
      assignSkuValues(values, pathPrefix, cells);
    } else {
      const defaultPrice = product.price !== undefined ? String(product.price) : '';
      const defaultSplPrice =
        product.discountedPrice !== undefined ? String(product.discountedPrice) : '';

      for (const [field, value] of Object.entries({
        ...cells,
        price: priceVal || defaultPrice,
        specialPrice: splPriceVal || defaultSplPrice,
      })) {
        assignDeep(values, defaultSkuPath(field), value);
      }
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
 * Re-populates the SHARED (product-level) gallery into the cover field.
 *
 * This is what makes the shared gallery reachable in edit mode at all: a seller
 * who uploaded one must see it and be able to change or clear it, otherwise the
 * stored `mainImages` is invisible in the only form that can write it back. A
 * product with NO shared gallery leaves the field empty, which is the honest
 * representation — the cover then comes from the first colour's first photo.
 *
 * Written under the canonical `mainImages` key (the write contract's name, and
 * the name the server's field spec publishes) plus the legacy singular alias,
 * because `useProductSchema`'s success-path FALLBACK_FIELD_SCHEMA — which this
 * file does not own — still declares its cover field as `mainImage`.
 */
function hydrateCoverGallery(product: AdminProductDetail, values: ProductFormValues): void {
  const stored = product.mainImages;
  const gallery = Array.isArray(stored) && stored.length > 0 ? [...stored] : undefined;
  if (gallery) {
    values.mainImages = gallery;
    values.mainImage = [...gallery];
    return;
  }
  const legacy = product as unknown as Record<string, unknown>;
  if (typeof legacy.mainImage === 'string' && legacy.mainImage) {
    values.mainImages = [legacy.mainImage];
    values.mainImage = [legacy.mainImage];
  }
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
  hydrateCoverGallery(product, values);

  // 2. Hydrate Dynamic Data attributes & SKU structure
  const dynamicRecord = product.dynamicData as Record<string, unknown> | undefined;
  const dynamicValues =
    (dynamicRecord?.values as Record<string, unknown> | undefined) || dynamicRecord || {};

  if (typeof dynamicValues === 'object' && dynamicValues !== null) {
    // `assignDeep` for every key, so a legacy record that stored a dotted
    // custom-field name flat (`'Fabric.Care'`) rehydrates as the nested shape
    // `buildPayloadDynamicValues` writes back — same writer in both directions.
    for (const [k, v] of Object.entries(dynamicValues)) {
      assignDeep(values, k, v);
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
    // `assignDeep`, not a bracket write: a schema may name an axis with a dot
    // (`Fit.Type`), and a literal dotted key would be a second, unreachable
    // representation of a field the cells read nested.
    if (vf.kind === 'color' && colorNames.length > 0) {
      assignDeep(values, vf.key, colorNames);
    } else if (vf.kind === 'size' && sizeNames.length > 0) {
      assignDeep(values, vf.key, sizeNames);
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
