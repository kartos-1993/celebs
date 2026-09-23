import { uploadFiles } from '../api';
import { pathFor } from '../fields/components/sku-table-utils';
import { extractVariantsMeta } from '../fields/variant-utils';
import type { CreateProductRequest } from '../types';
import type { FieldSpec } from '../types';

import {
  flattenObject,
  getFirstPrice,
  getLabelMap,
  isHexColor,
  normalizeText,
  resolveColorCode,
  sanitizeVariantKey,
  toNonNegativeInteger,
  toPositiveNumber,
  toStringArray,
} from './add-product-helpers';
import { generateCollisionProofBaseSku } from './generate-sku-helpers';

/**
 * Drops deselected-axis leftovers (e.g. a removed color's
 * `sku.variants.*` leaves) so stale paths never leak into the payload,
 * the draft, or autosave. Keeps every non-variant key untouched.
 */
export function pruneOrphanVariantPaths(
  flat: Record<string, unknown>,
  axes: Array<{ key: string; values: string[] }>,
): Record<string, unknown> {
  const live = axes.filter((axis) => axis.key && axis.values.length > 0);
  if (live.length === 0) return flat;
  const allowed = new Set<string>();
  const prefixFor = (...parts: string[]) =>
    ['sku', 'variants', ...parts.map(sanitizeVariantKey)].join('.');
  if (live.length === 1) {
    for (const value of live[0].values) {
      allowed.add(prefixFor(live[0].key, value));
    }
  } else {
    const [first, second] = live;
    for (const firstValue of first.values) {
      for (const secondValue of second.values) {
        allowed.add(prefixFor(first.key, firstValue, second.key, secondValue));
      }
    }
  }
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(flat)) {
    if (!key.startsWith('sku.variants.')) {
      out[key] = value;
      continue;
    }
    if ([...allowed].some((prefix) => key === prefix || key.startsWith(`${prefix}.`))) {
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

  // Forget deselected axes before reading a single cell: orphan leaves
  // from removed colors/sizes must not resurrect in payload or draft.
  const skuFlatValues = pruneOrphanVariantPaths(flatValues, [
    ...(colorFieldName ? [{ key: colorFieldName, values: selectedColors }] : []),
    ...(sizeFieldName ? [{ key: sizeFieldName, values: selectedSizes }] : []),
  ]);

  // Upload main images and all per-color assets concurrently
  // (previously a serial for-of loop — one round trip per swatch/gallery).
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

  // Cover auto-derive: explicit main images win; otherwise the first
  // selected color gallery provides the cover (SHEIN card behavior).
  // Updates honor explicit emptiness: a cleared cover stays cleared.
  const firstSelectedColor = selectedColors[0];
  const firstGalleryImages =
    firstSelectedColor !== undefined ? (uploadedColorAssets[firstSelectedColor]?.images ?? []) : [];
  const effectiveMainImages = mainImages.length > 0 || isUpdate ? mainImages : firstGalleryImages;

  const price = getFirstPrice(values, '.price');
  if (price === undefined) {
    throw new Error('Add a valid price before publishing the product.');
  }

  const discountedPrice = getFirstPrice(values, '.specialPrice');
  if (discountedPrice !== undefined && discountedPrice >= price) {
    throw new Error('Discounted price must be less than the regular price.');
  }

  const defaultStock = toNonNegativeInteger(flatValues['sku.default.stock']) ?? 0;
  const effectiveColors = selectedColors.length > 0 ? selectedColors : ['default'];

  const sizes = selectedSizes.map((sizeValue) => {
    const sizeName = sizeLabelMap.get(sizeValue) || sizeValue;
    const formSizeObj = Array.isArray(values.sizes)
      ? (values.sizes as SizeFormValue[]).find((s) => s?.name === sizeName)
      : null;
    const toMeasurements = (list?: MeasurementItem[]) =>
      (list || [])
        .filter((m) => m.value && String(m.value).trim() !== '')
        .map((m) => ({
          name: String(m.name || ''),
          value: String(m.value || ''),
          unit: String(m.unit || 'cm'),
        }));
    return {
      name: sizeName,
      productMeasurements: toMeasurements(formSizeObj?.productMeasurements),
      bodyMeasurements: toMeasurements(formSizeObj?.bodyMeasurements),
    };
  });

  const colorVariants = effectiveColors.map((colorValue) => {
    const label =
      colorValue === 'default' ? 'Default' : colorLabelMap.get(colorValue) || colorValue;

    let stocks: Array<{ size: string; quantity: number }> = [];
    if (selectedColors.length > 0 && sizeFieldName && selectedSizes.length > 0) {
      stocks = selectedSizes.map((sizeValue) => ({
        size: sizeLabelMap.get(sizeValue) || sizeValue,
        quantity:
          toNonNegativeInteger(
            skuFlatValues[
              pathFor(colorFieldName as string, colorValue, sizeFieldName, sizeValue, 'stock')
            ],
          ) ?? defaultStock,
      }));
    } else if (selectedColors.length > 0 && colorFieldName) {
      stocks = [
        {
          size: 'default',
          quantity:
            toNonNegativeInteger(skuFlatValues[pathFor(colorFieldName, colorValue, 'stock')]) ??
            defaultStock,
        },
      ];
    } else if (sizeFieldName && selectedSizes.length > 0) {
      stocks = selectedSizes.map((sizeValue) => ({
        size: sizeLabelMap.get(sizeValue) || sizeValue,
        quantity:
          toNonNegativeInteger(skuFlatValues[pathFor(sizeFieldName, sizeValue, 'stock')]) ??
          defaultStock,
      }));
    } else {
      stocks = [{ size: 'default', quantity: defaultStock }];
    }

    const assets = uploadedColorAssets[colorValue];
    const rawColor =
      colorValue === 'default'
        ? '#000000'
        : isHexColor(colorValue)
          ? colorValue
          : isHexColor(label)
            ? label
            : colorValue || label;

    return {
      name: label,
      colorCode: resolveColorCode(rawColor),
      swatch: assets?.swatch || undefined,
      // Updates preserve emptied galleries; creates fall back to mains.
      images: assets?.images?.length
        ? assets.images
        : isUpdate
          ? (assets?.images ?? [])
          : mainImages,
      stocks,
    };
  });

  // Build variantOptions from actual selections (BE inventory maps skus by Color+Size).
  const builtVariantOptions: CreateProductRequest['variantOptions'] = [];
  if (colorFieldName && selectedColors.length > 0) {
    builtVariantOptions.push({
      name: 'Color',
      values: selectedColors.map((c) => colorLabelMap.get(c) || c),
    });
  }
  if (sizeFieldName && selectedSizes.length > 0) {
    builtVariantOptions.push({
      name: 'Size',
      values: selectedSizes.map((s) => sizeLabelMap.get(s) || s),
    });
  }

  // Build skus[] from the SKU matrix so BE skuMap finds real codes instead of minting randoms.
  const brandForSku = normalizeText(values.brand);
  const buildSkuCode = (fallbackParts: string[]): string =>
    generateCollisionProofBaseSku(brandForSku || undefined, fallbackParts.join(' '));
  const readCell = (parts: string[], field: string): unknown =>
    skuFlatValues[pathFor(...parts, field)];

  const builtSkus: NonNullable<CreateProductRequest['skus']> = [];
  const pushSku = (selectedOptions: Record<string, string>, parts: string[], image?: string) => {
    const cellPrice =
      toPositiveNumber(readCell(parts, 'price')) ??
      toPositiveNumber(readCell(parts, 'specialPrice')) ??
      price;
    const cellDiscounted = toPositiveNumber(readCell(parts, 'specialPrice'));
    const cellStock =
      toNonNegativeInteger(readCell(parts, 'stock')) ??
      toNonNegativeInteger(flatValues['sku.default.stock']) ??
      0;
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
  };

  if (colorFieldName && sizeFieldName && selectedColors.length > 0 && selectedSizes.length > 0) {
    for (const colorValue of selectedColors) {
      const colorLabel = colorLabelMap.get(colorValue) || colorValue;
      const colorImages = uploadedColorAssets[colorValue]?.images?.length
        ? uploadedColorAssets[colorValue].images
        : mainImages;
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
      const colorImages = uploadedColorAssets[colorValue]?.images?.length
        ? uploadedColorAssets[colorValue].images
        : mainImages;
      pushSku({ Color: colorLabel }, [colorFieldName, colorValue], colorImages[0]);
    }
  } else if (sizeFieldName && selectedSizes.length > 0) {
    for (const sizeValue of selectedSizes) {
      const sizeLabel = sizeLabelMap.get(sizeValue) || sizeValue;
      pushSku({ Size: sizeLabel }, [sizeFieldName, sizeValue], effectiveMainImages[0]);
    }
  }

  // Canonical colorMeta — the only shape BE reads (presenter + usage collector).
  const canonicalColorMeta: Record<string, { swatch?: string; images: string[]; hot: boolean }> =
    {};
  for (const [colorValue, assets] of Object.entries(uploadedColorAssets)) {
    canonicalColorMeta[colorValue] = {
      swatch: assets.swatch,
      images: assets.images,
      hot: assets.hot,
    };
  }

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
      values: Object.fromEntries(
        fields
          .map((field) => field.name)
          .filter(
            (name) =>
              !name.includes('.') &&
              ![
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
              ].includes(name) &&
              name !== colorFieldName &&
              name !== sizeFieldName,
          )
          .filter(
            (name) => values[name] !== undefined && values[name] !== null && values[name] !== '',
          )
          .map((name) => [name, values[name]]),
      ),
      variants: {
        colorMeta: canonicalColorMeta,
      },
    },
    tags: [],
    featured: false,
    skus: builtSkus,
    variantOptions: builtVariantOptions,
    status,
  };
}
