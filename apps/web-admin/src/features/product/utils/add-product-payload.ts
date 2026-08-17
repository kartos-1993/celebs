import { uploadFiles } from '../api';
import type { CreateProductRequest } from '../types';
import type { FieldSpec } from '../types';
import { extractVariantsMeta } from '../fields/variant-utils';
import {
  flattenObject,
  getFirstPrice,
  getLabelMap,
  isHexColor,
  normalizeText,
  resolveColorCode,
  toNonNegativeInteger,
  toStringArray,
} from './add-product-helpers';

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
}

export async function buildProductPayload({
  fields,
  status,
  values,
  upload = uploadFiles,
}: BuildProductPayloadOptions): Promise<CreateProductRequest> {
  const flatValues = flattenObject(values);
  const { variants: variantMeta, colorFieldName } = extractVariantsMeta(fields);
  const sizeFieldName = variantMeta.find((variant) => variant.kind === 'size')?.key;
  const colorLabelMap = getLabelMap(fields, colorFieldName);
  const sizeLabelMap = getLabelMap(fields, sizeFieldName);

  const selectedColors = colorFieldName ? toStringArray(values[colorFieldName]) : [];
  const selectedSizes = sizeFieldName ? toStringArray(values[sizeFieldName]) : [];

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
            flatValues[
              `sku.variants.${colorFieldName}.${colorValue}.${sizeFieldName}.${sizeValue}.stock`
            ],
          ) ?? defaultStock,
      }));
    } else if (selectedColors.length > 0 && colorFieldName) {
      stocks = [
        {
          size: 'default',
          quantity:
            toNonNegativeInteger(
              flatValues[`sku.variants.${colorFieldName}.${colorValue}.stock`],
            ) ?? defaultStock,
        },
      ];
    } else if (sizeFieldName && selectedSizes.length > 0) {
      stocks = selectedSizes.map((sizeValue) => ({
        size: sizeLabelMap.get(sizeValue) || sizeValue,
        quantity:
          toNonNegativeInteger(flatValues[`sku.variants.${sizeFieldName}.${sizeValue}.stock`]) ??
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
      images: assets?.images?.length ? assets.images : mainImages,
      stocks,
    };
  });

  return {
    name: normalizeText(values.name),
    brand: normalizeText(values.brand) || undefined,
    description: normalizeText(values.description),
    price,
    discountedPrice,
    categoryId: String(values.categoryId || ''),
    subcategoryId: String(values.subcategoryId || ''),
    sizes,
    colorVariants,
    mainImages,
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
      uploadedAssets: {
        mainImages,
        colorMeta: uploadedColorAssets,
      },
      variantFields: variantMeta,
    },
    tags: [],
    featured: false,
    skus: Array.isArray(values.skus) ? (values.skus as CreateProductRequest['skus'] & unknown[]) : [],
    variantOptions: Array.isArray(values.variantOptions) ? (values.variantOptions as CreateProductRequest['variantOptions'] & unknown[]) : [],
    status,
  };
}
