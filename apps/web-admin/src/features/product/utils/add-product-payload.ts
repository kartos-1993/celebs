import {
  SHIPPING_DEFAULTS,
  type ShippingPackagingType,
  type WarrantyType,
} from '@celebs/shared-types';
import {
  buildProductStyleRef,
  generateRetailSku,
  isPlaceholderVariant,
} from '@celebs/shared-utils';

import { uploadFiles } from '../api';
import { extractVariantsMeta } from '../fields/variant-utils';
import type { CreateProductRequest, FieldSpec } from '../types';

import {
  defaultSkuPath,
  flattenObject,
  getFirstPrice,
  getLabelMap,
  getNestedValue,
  isHexColor,
  normalizeText,
  resolveColorCode,
  toNonNegativeInteger,
  toPositiveNumber,
  toStringArray,
  variantSkuPath,
} from './add-product-helpers';

const VARIANT_PATH_PREFIX = 'sku.variants.';

interface VariantAxisSelection {
  key: string;
  values: string[];
}

/** First usable (non-blank) URL in a list, or undefined. */
function firstUsableUrl(urls?: string[]): string | undefined {
  return urls?.find((url) => typeof url === 'string' && url.trim().length > 0);
}

/**
 * COVER ORDER — THE CANONICAL RULE (documented once, obeyed by every
 * cover-derivation site in this file; mirrored by the API and restated in
 * `fields/components/shared-utils`):
 *
 *   cover = mainImages[0] ?? firstColor.galleryImages[0]
 *
 * An explicit main/cover image ALWAYS wins. The first image of the FIRST
 * color's gallery becomes the cover only when the form carries no main image
 * at all. `isUpdate` short-circuits that fallback so a deliberately cleared
 * cover is never resurrected on save.
 *
 * This helper returns the COVER LIST (the payload's `mainImages`); its head is
 * the cover. All three derivation sites consume this one function — the color
 * branch of {@link buildPayloadColorVariants} and the size-only SKU branch of
 * {@link buildPayloadSkus} read the list they are handed, and `buildProductPayload`
 * builds it here — so the three cannot drift apart.
 */
export function resolveCoverImages({
  mainImages,
  firstColorImages,
  isUpdate,
}: {
  mainImages: string[];
  firstColorImages?: string[];
  isUpdate: boolean;
}): string[] {
  if (mainImages.length > 0 || isUpdate) return mainImages;
  return firstColorImages ?? [];
}

/** Live `[key, value, …]` segments of the full N-axis cross product. */
function liveVariantSegments(axes: VariantAxisSelection[]): string[][] {
  const live = axes.filter((axis) => axis.key && axis.values.length > 0);
  if (live.length === 0) return [];
  return live.reduce<string[][]>(
    (acc, axis) =>
      acc.flatMap((prefix) => axis.values.map((value) => [...prefix, axis.key, value])),
    [[]],
  );
}

function isLiveVariantPath(key: string, livePrefixes: string[]): boolean {
  if (!key.startsWith(VARIANT_PATH_PREFIX)) return true;
  return livePrefixes.some((prefix) => key === prefix || key.startsWith(`${prefix}.`));
}

/**
 * Drops deselected-axis leftovers (e.g. a removed color's
 * `sku.variants.*` leaves) so stale paths never leak into the payload,
 * the draft, or autosave. Keeps every non-variant key untouched.
 *
 * With no live axis at all there is no live combination, so ALL
 * `sku.variants.*` keys are stale and are dropped — the docstring contract
 * holds for zero axes too (the old early `return flat` leaked them). The
 * cross product is taken over every axis, so a third axis constrains
 * pruning instead of being ignored.
 */
export function pruneOrphanVariantPaths(
  flat: Record<string, unknown>,
  axes: VariantAxisSelection[],
): Record<string, unknown> {
  const livePrefixes = liveVariantSegments(axes).map((segments) => variantSkuPath(...segments));
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(flat)) {
    if (isLiveVariantPath(key, livePrefixes)) {
      out[key] = value;
    }
  }
  return out;
}

interface MeasurementItem {
  name?: string;
  value?: unknown;
  unit?: string;
}

interface SizeFormValue {
  name?: string;
  productMeasurements?: MeasurementItem[];
  bodyMeasurements?: MeasurementItem[];
}

type UploadFn = (files: Array<File | string | null | undefined>) => Promise<string[]>;

interface BuildProductPayloadOptions {
  fields: FieldSpec[];
  status: CreateProductRequest['status'];
  values: Record<string, unknown>;
  /** Injectable for tests; defaults to the real uploader. */
  upload?: UploadFn;
  /**
   * Update mode honors explicit emptiness: cleared galleries/covers stay
   * cleared instead of resurrecting via fallbacks (create mode keeps the
   * SHEIN-style auto-derive so new products always have a cover).
   */
  isUpdate?: boolean;
}

export function buildPayloadSizes(
  selectedSizes: string[],
  sizeLabelMap: Map<string, string>,
  sizesFormValue: unknown,
) {
  const toMeasurements = (list?: MeasurementItem[]) =>
    (list || [])
      .filter((m) => m.value && String(m.value).trim() !== '')
      .map((m) => ({
        name: String(m.name || ''),
        value: String(m.value || ''),
        unit: String(m.unit || 'cm'),
      }));

  return selectedSizes.map((sizeValue) => {
    const sizeName = sizeLabelMap.get(sizeValue) || sizeValue;
    const formSizeObj = Array.isArray(sizesFormValue)
      ? (sizesFormValue as SizeFormValue[]).find((s) => s?.name === sizeName)
      : null;
    return {
      name: sizeName,
      productMeasurements: toMeasurements(formSizeObj?.productMeasurements),
      bodyMeasurements: toMeasurements(formSizeObj?.bodyMeasurements),
    };
  });
}

export function resolveVariantStockList({
  colorValue,
  selectedColors,
  colorFieldName,
  selectedSizes,
  sizeFieldName,
  sizeLabelMap,
  skuFlatValues,
  defaultStock,
}: {
  colorValue: string;
  selectedColors: string[];
  colorFieldName?: string;
  selectedSizes: string[];
  sizeFieldName?: string;
  sizeLabelMap: Map<string, string>;
  skuFlatValues: Record<string, unknown>;
  defaultStock: number;
}): Array<{ size: string; quantity: number }> {
  if (selectedColors.length > 0 && sizeFieldName && selectedSizes.length > 0) {
    return selectedSizes.map((sizeValue) => ({
      size: sizeLabelMap.get(sizeValue) || sizeValue,
      quantity:
        toNonNegativeInteger(
          skuFlatValues[
            variantSkuPath(colorFieldName as string, colorValue, sizeFieldName, sizeValue, 'stock')
          ],
        ) ?? defaultStock,
    }));
  }
  if (selectedColors.length > 0 && colorFieldName) {
    return [
      {
        size: 'default',
        quantity:
          toNonNegativeInteger(
            skuFlatValues[variantSkuPath(colorFieldName, colorValue, 'stock')],
          ) ?? defaultStock,
      },
    ];
  }
  if (sizeFieldName && selectedSizes.length > 0) {
    return selectedSizes.map((sizeValue) => ({
      size: sizeLabelMap.get(sizeValue) || sizeValue,
      quantity:
        toNonNegativeInteger(skuFlatValues[variantSkuPath(sizeFieldName, sizeValue, 'stock')]) ??
        defaultStock,
    }));
  }
  return [{ size: 'default', quantity: defaultStock }];
}

export function buildPayloadColorVariants({
  effectiveColors,
  selectedColors,
  colorFieldName,
  selectedSizes,
  sizeFieldName,
  colorLabelMap,
  sizeLabelMap,
  skuFlatValues,
  defaultStock,
  uploadedColorAssets,
  effectiveMainImages,
  isUpdate,
}: {
  effectiveColors: string[];
  selectedColors: string[];
  colorFieldName?: string;
  selectedSizes: string[];
  sizeFieldName?: string;
  colorLabelMap: Map<string, string>;
  sizeLabelMap: Map<string, string>;
  skuFlatValues: Record<string, unknown>;
  defaultStock: number;
  uploadedColorAssets: Record<string, { hot: boolean; images: string[]; swatch?: string }>;
  effectiveMainImages: string[];
  isUpdate: boolean;
  /** Still accepted so existing callers keep compiling; the cover now comes
      from `effectiveMainImages` (see resolveCoverImages). */
  mainImages: string[];
}) {
  return effectiveColors.map((colorValue) => {
    const isDefaultColor = isPlaceholderVariant(colorValue);
    const label = isDefaultColor ? 'Default' : colorLabelMap.get(colorValue) || colorValue;

    const stocks = resolveVariantStockList({
      colorValue,
      selectedColors,
      colorFieldName,
      selectedSizes,
      sizeFieldName,
      sizeLabelMap,
      skuFlatValues,
      defaultStock,
    });

    const assets = uploadedColorAssets[colorValue];
    const rawColor = isDefaultColor
      ? '#000000'
      : isHexColor(colorValue)
        ? colorValue
        : isHexColor(label)
          ? label
          : colorValue || label;

    let variantImages: string[];
    if (isDefaultColor) {
      variantImages = effectiveMainImages;
    } else if (assets?.images && assets.images.length > 0) {
      variantImages = assets.images;
    } else if (isUpdate) {
      variantImages = assets?.images ?? [];
    } else {
      // CANONICAL COVER ORDER (see resolveCoverImages): a color with no gallery
      // of its own inherits the cover LIST, not the raw `mainImages`. Those two
      // differ exactly in the case the rule exists for — no main image, so
      // `mainImages` is empty while the cover came from the first color's
      // gallery. Reading `mainImages` here shipped that color with zero images
      // even though the product had a cover.
      variantImages = effectiveMainImages;
    }

    return {
      name: label,
      colorCode: resolveColorCode(rawColor),
      swatch: assets?.swatch || undefined,
      images: variantImages,
      stocks,
    };
  });
}

export function buildPayloadVariantOptions(
  colorFieldName?: string,
  selectedColors: string[] = [],
  colorLabelMap?: Map<string, string>,
  sizeFieldName?: string,
  selectedSizes: string[] = [],
  sizeLabelMap?: Map<string, string>,
): CreateProductRequest['variantOptions'] {
  const options: CreateProductRequest['variantOptions'] = [];
  if (colorFieldName && selectedColors.length > 0) {
    options.push({
      name: 'Color',
      values: selectedColors.map((c) => colorLabelMap?.get(c) || c),
    });
  }
  if (sizeFieldName && selectedSizes.length > 0) {
    options.push({
      name: 'Size',
      values: selectedSizes.map((s) => sizeLabelMap?.get(s) || s),
    });
  }
  return options;
}

export function buildPayloadSkus({
  colorFieldName,
  sizeFieldName,
  selectedColors,
  selectedSizes,
  colorLabelMap,
  sizeLabelMap,
  uploadedColorAssets,
  effectiveMainImages,
  skuFlatValues,
  flatValues,
  price,
  brand,
  productName,
}: {
  colorFieldName?: string;
  sizeFieldName?: string;
  selectedColors: string[];
  selectedSizes: string[];
  colorLabelMap: Map<string, string>;
  sizeLabelMap: Map<string, string>;
  uploadedColorAssets: Record<string, { images: string[] }>;
  /** No longer read: the cover list (`effectiveMainImages`) is the single source
      for the per-SKU image. Still accepted so existing callers keep compiling. */
  mainImages: string[];
  effectiveMainImages: string[];
  skuFlatValues: Record<string, unknown>;
  flatValues: Record<string, unknown>;
  price: number;
  brand: string;
  productName: string;
}): NonNullable<CreateProductRequest['skus']> {
  const brandForSku = normalizeText(brand);
  const styleRefForSku = buildProductStyleRef(normalizeText(productName));
  const buildSkuCode = (fallbackParts: string[]): string =>
    generateRetailSku({
      brandToken: brandForSku || undefined,
      styleRef: styleRefForSku,
      options: fallbackParts,
    });

  const readCell = (parts: string[], field: string): unknown =>
    skuFlatValues[variantSkuPath(...parts, field)];

  // CANONICAL COVER ORDER (see resolveCoverImages): `effectiveMainImages` is the
  // cover list built there, so its head IS the cover — mainImages[0], else the
  // first color's first gallery image. Resolved through one helper so the
  // size-only branch below cannot drift from the color branch.
  const coverImage = firstUsableUrl(effectiveMainImages);

  const builtSkus: NonNullable<CreateProductRequest['skus']> = [];
  const sellerSkuPaths: string[] = [];

  const pushSku = (selectedOptions: Record<string, string>, parts: string[], image?: string) => {
    // A discount cell is NEVER the price. With a blank price cell the row
    // keeps the resolved product price and `collectPricingErrors` reports
    // "add a valid price" for that row — synthesizing `price = discount`
    // shipped a full-price SKU that silently ate the discount.
    const cellPrice = toPositiveNumber(readCell(parts, 'price')) ?? price;
    const cellDiscounted = toPositiveNumber(readCell(parts, 'specialPrice'));
    // No `sku.default.stock` fallback: a blank variant cell used to inherit
    // the default quantity and every blank row shipped stock. Explicit
    // per-variant stock is required (collectPricingErrors flags the blank).
    const cellStock = toNonNegativeInteger(readCell(parts, 'stock')) ?? 0;
    const rawSellerSku = normalizeText(readCell(parts, 'sellerSku'));
    builtSkus.push({
      skuCode: rawSellerSku || buildSkuCode(Object.values(selectedOptions)),
      selectedOptions,
      price: cellPrice,
      discountedPrice:
        cellDiscounted !== undefined && cellDiscounted < cellPrice ? cellDiscounted : undefined,
      stock: cellStock,
      image: image || effectiveMainImages[0] || undefined,
      isDefault: builtSkus.length === 0,
    });
    sellerSkuPaths.push(variantSkuPath(...parts, 'sellerSku'));
  };

  if (colorFieldName && sizeFieldName && selectedColors.length > 0 && selectedSizes.length > 0) {
    for (const colorValue of selectedColors) {
      const colorLabel = colorLabelMap.get(colorValue) || colorValue;
      // CANONICAL COVER ORDER (see resolveCoverImages): a color with no gallery
      // of its own inherits the cover LIST, not the raw `mainImages`. Those two
      // differ exactly in the case the rule exists for — no main image, so
      // `mainImages` is empty while the cover came from the first color's
      // gallery. Reading `mainImages` here gave that SKU's row a different
      // (empty) image source than the color branch and the size-only branch.
      const colorImages = uploadedColorAssets[colorValue]?.images?.length
        ? uploadedColorAssets[colorValue].images
        : effectiveMainImages;
      for (const sizeValue of selectedSizes) {
        const sizeLabel = sizeLabelMap.get(sizeValue) || sizeValue;
        pushSku(
          { Color: colorLabel, Size: sizeLabel },
          [colorFieldName, colorValue, sizeFieldName, sizeValue],
          colorImages[0],
        );
      }
    }
  } else if (colorFieldName && selectedColors.length > 0) {
    for (const colorValue of selectedColors) {
      const colorLabel = colorLabelMap.get(colorValue) || colorValue;
      // Same cover list as the color branch above — never raw `mainImages`.
      const colorImages = uploadedColorAssets[colorValue]?.images?.length
        ? uploadedColorAssets[colorValue].images
        : effectiveMainImages;
      pushSku({ Color: colorLabel }, [colorFieldName, colorValue], colorImages[0]);
    }
  } else if (sizeFieldName && selectedSizes.length > 0) {
    for (const sizeValue of selectedSizes) {
      const sizeLabel = sizeLabelMap.get(sizeValue) || sizeValue;
      // Size-only products have no per-color gallery, so every row's image is
      // the canonical cover resolved above.
      pushSku({ Size: sizeLabel }, [sizeFieldName, sizeValue], coverImage);
    }
  } else {
    // The product truly has no variants: `sku.default.*` is its own row, so
    // the default-branch stock fallback is correct here and only here.
    const rawDefaultSku = normalizeText(flatValues[defaultSkuPath('sellerSku')]);
    const defaultPrice = toPositiveNumber(flatValues[defaultSkuPath('price')]) ?? price;
    const defaultSpecialPrice = toPositiveNumber(flatValues[defaultSkuPath('specialPrice')]);
    const defaultStock = toNonNegativeInteger(flatValues[defaultSkuPath('stock')]) ?? 0;

    builtSkus.push({
      skuCode: rawDefaultSku || buildSkuCode([]),
      selectedOptions: {},
      price: defaultPrice,
      discountedPrice:
        defaultSpecialPrice !== undefined && defaultSpecialPrice < defaultPrice
          ? defaultSpecialPrice
          : undefined,
      stock: defaultStock,
      image: effectiveMainImages[0] || undefined,
      isDefault: true,
    });
    sellerSkuPaths.push(defaultSkuPath('sellerSku'));
  }

  assertUniqueSkuCodes(builtSkus, sellerSkuPaths);

  return builtSkus;
}

/**
 * Client-side pre-empt of the server 409: a duplicate skuCode is rejected
 * there anyway, so name the offending code AND the sellerSku cells to fix.
 */
function assertUniqueSkuCodes(
  builtSkus: NonNullable<CreateProductRequest['skus']>,
  sellerSkuPaths: string[],
): void {
  const firstSeen = new Map<string, string>();
  builtSkus.forEach((sku, index) => {
    const previousPath = firstSeen.get(sku.skuCode);
    if (previousPath) {
      throw new Error(
        `Duplicate SKU code "${sku.skuCode}" — set a unique sellerSku in ${previousPath} and ${sellerSkuPaths[index]}.`,
      );
    }
    firstSeen.set(sku.skuCode, sellerSkuPaths[index]);
  });
}

const EXCLUDED_DYNAMIC_FIELD_NAMES = new Set([
  'name',
  'brand',
  'brandId',
  'description',
  'price',
  'specialPrice',
  'categoryId',
  'subcategoryId',
  'mainImage',
  'sizes',
  'skus',
  'status',
]);

/**
 * Structural form namespaces that are persisted by dedicated payload keys
 * (`skus[]`, `dynamicData.variants.colorMeta`, `sizes[]`, shipping/warranty).
 * A custom field under one of these prefixes must not be smuggled into
 * `dynamicData.values`.
 */
const RESERVED_DYNAMIC_PREFIXES = new Set([
  'sku',
  'variants',
  'colorMeta',
  'sizes',
  'size_chart',
  'mainImage',
  'mainImages',
]);

/** Dot-free namespace for the variant axis selections carried in dynamicData. */
export const DYNAMIC_AXES_KEY = 'variantAxes';

function isReservedDynamicPath(name: string): boolean {
  const root = name.split('.')[0] ?? name;
  return RESERVED_DYNAMIC_PREFIXES.has(root);
}

/**
 * Writes `dotted.name` as nested objects, so no key in the result can ever be
 * read back as an RHF dot-path.
 */
function assignDeep(target: Record<string, unknown>, dottedName: string, value: unknown): void {
  const parts = dottedName.split('.').filter(Boolean);
  let cursor = target;
  for (const part of parts.slice(0, -1)) {
    const child = cursor[part];
    if (!child || typeof child !== 'object' || Array.isArray(child)) {
      cursor[part] = {};
    }
    cursor = cursor[part] as Record<string, unknown>;
  }
  const leaf = parts[parts.length - 1];
  if (leaf) cursor[leaf] = value;
}

function collectAxisValues(
  values: Record<string, unknown>,
  axisFieldNames: Array<string | undefined>,
): Record<string, string[]> {
  const axes: Record<string, string[]> = {};
  for (const axisName of axisFieldNames) {
    if (!axisName) continue;
    const selected = toStringArray(values[axisName]);
    if (selected.length > 0) {
      axes[axisName] = selected;
    }
  }
  return axes;
}

function isDynamicCustomField(name: string, axisFieldNames: Array<string | undefined>): boolean {
  if (EXCLUDED_DYNAMIC_FIELD_NAMES.has(name)) return false;
  if (axisFieldNames.includes(name)) return false;
  return !isReservedDynamicPath(name);
}

function isPresentValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== '';
}

/**
 * Custom-field values for `dynamicData.values`. Dotted schema field names are
 * nested (never stored as dotted keys) so nothing here can collide with an RHF
 * path, structural namespaces stay out (they are persisted elsewhere), and the
 * variant axis selections are recorded under the reserved, dot-free
 * {@link DYNAMIC_AXES_KEY} namespace.
 */
export function buildPayloadDynamicValues(
  fields: FieldSpec[],
  values: Record<string, unknown>,
  colorFieldName?: string,
  sizeFieldName?: string,
): Record<string, unknown> {
  const axisFieldNames = [colorFieldName, sizeFieldName];
  const result: Record<string, unknown> = {};
  for (const field of fields) {
    if (!isDynamicCustomField(field.name, axisFieldNames)) continue;
    const value = getNestedValue(values, field.name);
    if (isPresentValue(value)) {
      assignDeep(result, field.name, value);
    }
  }
  const axes = collectAxisValues(values, axisFieldNames);
  if (Object.keys(axes).length > 0) {
    result[DYNAMIC_AXES_KEY] = axes;
  }
  return result;
}

export function buildCanonicalColorMeta(
  uploadedColorAssets: Record<string, { hot: boolean; images: string[]; swatch?: string }>,
): Record<string, { swatch?: string; images: string[]; hot: boolean }> {
  const result: Record<string, { swatch?: string; images: string[]; hot: boolean }> = {};
  for (const [colorValue, assets] of Object.entries(uploadedColorAssets)) {
    result[colorValue] = {
      swatch: assets.swatch,
      images: assets.images,
      hot: assets.hot,
    };
  }
  return result;
}

export async function buildProductPayload({
  fields,
  status,
  values,
  upload = uploadFiles,
  isUpdate = false,
}: BuildProductPayloadOptions): Promise<CreateProductRequest> {
  const flatValues = flattenObject(values);
  const { variants: variantMeta, colorFieldName } = extractVariantsMeta(fields);
  const sizeFieldName = variantMeta.find((variant) => variant.kind === 'size')?.key;
  const colorLabelMap = getLabelMap(fields, colorFieldName);
  const sizeLabelMap = getLabelMap(fields, sizeFieldName);

  const selectedColors = colorFieldName ? toStringArray(values[colorFieldName]) : [];
  const selectedSizes = sizeFieldName ? toStringArray(values[sizeFieldName]) : [];

  const skuFlatValues = pruneOrphanVariantPaths(flatValues, [
    ...(colorFieldName ? [{ key: colorFieldName, values: selectedColors }] : []),
    ...(sizeFieldName ? [{ key: sizeFieldName, values: selectedSizes }] : []),
  ]);

  const [mainImages, ...colorAssetEntries] = await Promise.all([
    upload(Array.isArray(values.mainImage) ? (values.mainImage as Array<File | string>) : []),
    ...selectedColors.map(async (colorValue) => {
      const prefix = `variants.colorMeta.${colorValue}`;
      const [swatchUrls, images] = await Promise.all([
        upload([flatValues[`${prefix}.swatch`] as File | string | undefined]),
        upload(
          Array.isArray(flatValues[`${prefix}.images`])
            ? (flatValues[`${prefix}.images`] as Array<File | string>)
            : [],
        ),
      ]);
      return [
        colorValue,
        {
          swatch: swatchUrls[0],
          images,
          hot: Boolean(flatValues[`${prefix}.hot`]),
        },
      ] as const;
    }),
  ]);

  const uploadedColorAssets: Record<string, { hot: boolean; images: string[]; swatch?: string }> =
    Object.fromEntries(colorAssetEntries);

  // COVER ORDER (canonical rule documented once on resolveCoverImages): the
  // cover is `mainImages[0]`, and only a product with no main image at all falls
  // back to the first image of the FIRST color's gallery. `effectiveMainImages`
  // is that cover LIST — its head is the cover the color branch and the
  // size-only SKU branch both read, so the three sites cannot drift.
  const firstColorGalleryImages = selectedColors.length
    ? uploadedColorAssets[selectedColors[0]]?.images
    : undefined;
  const effectiveMainImages = resolveCoverImages({
    mainImages,
    firstColorImages: firstColorGalleryImages,
    isUpdate,
  });

  const price = getFirstPrice(values, '.price');
  if (price === undefined) {
    throw new Error('Add a valid price before publishing the product.');
  }

  const discountedPrice = getFirstPrice(values, '.specialPrice');
  if (discountedPrice !== undefined && discountedPrice >= price) {
    throw new Error('Discounted price must be less than the regular price.');
  }

  const defaultStock = toNonNegativeInteger(flatValues[defaultSkuPath('stock')]) ?? 0;
  const effectiveColors = selectedColors.length > 0 ? selectedColors : ['default'];

  const sizes = buildPayloadSizes(selectedSizes, sizeLabelMap, values.sizes);

  const colorVariants = buildPayloadColorVariants({
    effectiveColors,
    selectedColors,
    colorFieldName,
    selectedSizes,
    sizeFieldName,
    colorLabelMap,
    sizeLabelMap,
    skuFlatValues,
    defaultStock,
    uploadedColorAssets,
    effectiveMainImages,
    isUpdate,
    mainImages,
  });

  const builtVariantOptions = buildPayloadVariantOptions(
    colorFieldName,
    selectedColors,
    colorLabelMap,
    sizeFieldName,
    selectedSizes,
    sizeLabelMap,
  );

  const builtSkus = buildPayloadSkus({
    colorFieldName,
    sizeFieldName,
    selectedColors,
    selectedSizes,
    colorLabelMap,
    sizeLabelMap,
    uploadedColorAssets,
    mainImages,
    effectiveMainImages,
    skuFlatValues,
    flatValues,
    price,
    brand: String(values.brand || ''),
    productName: String(values.name || ''),
  });

  const canonicalColorMeta = buildCanonicalColorMeta(uploadedColorAssets);
  const dynamicValues = buildPayloadDynamicValues(fields, values, colorFieldName, sizeFieldName);

  return {
    name: normalizeText(values.name),
    brandId:
      typeof values.brandId === 'string' && values.brandId.trim().length > 0
        ? values.brandId.trim()
        : undefined,
    brand: normalizeText(values.brand) || undefined,
    description: normalizeText(values.description),
    price,
    discountedPrice,
    categoryId: String(values.categoryId || ''),
    subcategoryId: String(values.subcategoryId || ''),
    sizes,
    colorVariants,
    mainImages: effectiveMainImages,
    dynamicData: {
      values: dynamicValues,
      variants: {
        colorMeta: canonicalColorMeta,
      },
    },
    // No tags/featured input exists anywhere under features/product (grep
    // evidence: the only hits were this file, the barcode modal, and the review
    // queue types). So create takes the schema defaults and any value a draft
    // happens to carry, while update OMITS both keys — `buildProductUpdateData`
    // guards on `!== undefined`, so omitting keeps the stored tags/featured
    // instead of resetting them to [] / false on every save.
    ...(isUpdate ? {} : { tags: toStringArray(values.tags), featured: values.featured === true }),
    skus: builtSkus,
    variantOptions: builtVariantOptions,
    status,
    packageWeightKg: toPositiveNumber(values.packageWeightKg) ?? SHIPPING_DEFAULTS.packageWeightKg,
    packageLengthCm: toPositiveNumber(values.packageLengthCm) ?? undefined,
    packageWidthCm: toPositiveNumber(values.packageWidthCm) ?? undefined,
    packageHeightCm: toPositiveNumber(values.packageHeightCm) ?? undefined,
    packagingType:
      typeof values.packagingType === 'string' && values.packagingType
        ? (values.packagingType as ShippingPackagingType)
        : SHIPPING_DEFAULTS.packagingType,
    isFragile: Boolean(values.isFragile),
    hasBatteryOrLiquid: Boolean(values.hasBatteryOrLiquid),
    warrantyType:
      typeof values.warrantyType === 'string' && values.warrantyType
        ? (values.warrantyType as WarrantyType)
        : SHIPPING_DEFAULTS.warrantyType,
    warrantyPeriod: normalizeText(values.warrantyPeriod) || undefined,
    warrantyPolicy: normalizeText(values.warrantyPolicy) || undefined,
    isNonReturnable: Boolean(values.isNonReturnable),
  };
}
