import { CreateProductRequest, uploadFiles } from '../api';
import type { FieldSpec } from '../fields/UiRegistry';
import { extractVariantsMeta } from '../fields/variant-utils';
import {
  flattenObject,
  getFirstPrice,
  getLabelMap,
  isHexColor,
  normalizeText,
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

export async function buildProductPayload({
  fields,
  status,
  values,
}: {
  fields: FieldSpec[];
  status: CreateProductRequest['status'];
  values: Record<string, unknown>;
}): Promise<CreateProductRequest> {
  const flatValues = flattenObject(values);
  const { variants: variantMeta, colorFieldName } = extractVariantsMeta(fields);
  const sizeFieldName = variantMeta.find(
    (variant) => variant.kind === 'size',
  )?.key;
  const colorLabelMap = getLabelMap(fields, colorFieldName);
  const sizeLabelMap = getLabelMap(fields, sizeFieldName);

  const mainImages = await uploadFiles(
    Array.isArray(values.mainImage)
      ? (values.mainImage as Array<File | string>)
      : [],
  );

  const selectedColors = colorFieldName
    ? toStringArray(values[colorFieldName])
    : [];
  const selectedSizes = sizeFieldName
    ? toStringArray(values[sizeFieldName])
    : [];

  const uploadedColorAssets: Record<
    string,
    { hot: boolean; images: string[]; swatch?: string }
  > = {};

  for (const colorValue of selectedColors) {
    const prefix = `variants.colorMeta.${colorValue}`;
    const swatchUrls = await uploadFiles([
      flatValues[`${prefix}.swatch`] as File | string | undefined,
    ]);
    const images = await uploadFiles(
      Array.isArray(flatValues[`${prefix}.images`])
        ? (flatValues[`${prefix}.images`] as Array<File | string>)
        : [],
    );

    uploadedColorAssets[colorValue] = {
      swatch: swatchUrls[0],
      images,
      hot: Boolean(flatValues[`${prefix}.hot`]),
    };
  }

  const price = getFirstPrice(values, '.price');
  if (price === undefined) {
    throw new Error('Add a valid price before publishing the product.');
  }

  const discountedPrice = getFirstPrice(values, '.specialPrice');
  if (discountedPrice !== undefined && discountedPrice >= price) {
    throw new Error('Discounted price must be less than the regular price.');
  }

  const defaultStock = toNonNegativeInteger(flatValues['sku.default.stock']) ?? 0;
  const effectiveColors =
    selectedColors.length > 0 ? selectedColors : ['default'];

  const sizes = selectedSizes.map((sizeValue) => {
    const sizeName = sizeLabelMap.get(sizeValue) || sizeValue;
    const formSizeObj = Array.isArray(values.sizes)
      ? (values.sizes as SizeFormValue[]).find((s) => s?.name === sizeName)
      : null;
    return {
      name: sizeName,
      productMeasurements: (formSizeObj?.productMeasurements || [])
        .filter((m) => m.value && String(m.value).trim() !== '')
        .map((m) => ({
          name: String(m.name || ''),
          value: String(m.value || ''),
          unit: String(m.unit || 'cm'),
        })),
      bodyMeasurements: (formSizeObj?.bodyMeasurements || [])
        .filter((m) => m.value && String(m.value).trim() !== '')
        .map((m) => ({
          name: String(m.name || ''),
          value: String(m.value || ''),
          unit: String(m.unit || 'cm'),
        })),
    };
  });

  const colorVariants = effectiveColors.map((colorValue) => {
    const label =
      colorValue === 'default'
        ? 'Default'
        : colorLabelMap.get(colorValue) || colorValue;

    let stocks: Array<{ size: string; quantity: number }> = [];

    if (
      selectedColors.length > 0 &&
      sizeFieldName &&
      selectedSizes.length > 0
    ) {
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
          toNonNegativeInteger(
            flatValues[`sku.variants.${sizeFieldName}.${sizeValue}.stock`],
          ) ?? defaultStock,
      }));
    } else {
      stocks = [{ size: 'default', quantity: defaultStock }];
    }

    const assets = uploadedColorAssets[colorValue];

    return {
      name: label,
      colorCode:
        colorValue === 'default'
          ? '#000000'
          : isHexColor(colorValue)
            ? colorValue
            : isHexColor(label)
              ? label
              : colorValue,
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
        Object.entries(values)
          .filter(
            ([key]) =>
              ![
                'name',
                'brand',
                'description',
                'categoryId',
                'subcategoryId',
                'status',
              ].includes(key),
          )
          .map(([key, value]) => [key, value]),
      ),
      uploadedAssets: {
        mainImages,
        colorMeta: uploadedColorAssets,
      },
      variantFields: variantMeta,
    },
    tags: [],
    featured: false,
    status,
  };
}
