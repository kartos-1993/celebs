import type { UseFormReturn } from 'react-hook-form';

import type { FieldSpec, ProductFormValues } from '../../types';

import { toast } from '@/hooks/use-toast';

/**
 * Basic fields the autofiller owns directly (never schema-driven).
 *
 * `mainImages` is the canonical gallery key — the same name the server's field
 * spec publishes and the write contract accepts. The singular spelling
 * registered the mock photos under a different RHF path than the one the
 * payload reads, so autofill appeared to work and published an empty gallery.
 */
const BASE_FIELD_NAMES = [
  'name',
  'brand',
  'description',
  'categoryId',
  'subcategoryId',
  'mainImages',
];

const DEFAULT_COLORS = ['Blue', 'White'];
const MEASUREMENT_VALUE = '45.5';
const SWATCH_URL =
  'https://res.cloudinary.com/celebsnp/image/upload/v1783941189/celebs/products/qrxlasu3b8wercsjciod.png';
const SWATCH_IMAGES = [
  'https://res.cloudinary.com/celebsnp/image/upload/v1783941201/celebs/products/okt4fj4pzwhwqgidijnf.png',
  'https://res.cloudinary.com/celebsnp/image/upload/v1783941232/celebs/products/t4qusgbfbeg2klkkckaf.png',
];

/**
 * Option items published by a select/multiselect `dataSource`, or `undefined`
 * when the field declares no item list at all (a real shape distinction:
 * callers fall back to mock values only in that case).
 */
const readOptionItems = (field: FieldSpec): unknown[] | undefined => {
  const source = field.dataSource;
  if (!source || typeof source !== 'object') return undefined;
  const items = 'items' in source ? source.items : source;
  return Array.isArray(items) ? items : undefined;
};

/** An option's `value`, tolerating bare strings and untyped payloads. */
const toOptionValue = (item: unknown): unknown =>
  typeof item === 'object' && item !== null ? (item as { value?: unknown }).value : undefined;

/** A color axis value is a plain list of color names. */
const isColorList = (value: unknown): value is string[] => Array.isArray(value);

/** Mock colors when the axis is unset; an empty axis stays empty. */
const readColorNames = (value: unknown): string[] => {
  if (isColorList(value)) return value;
  if (value === undefined || value === null) return DEFAULT_COLORS;
  return [];
};

/** A size row is a `{ name, productMeasurements?, bodyMeasurements? }` entry. */
interface SizeMeasurementRow {
  name?: string;
  productMeasurements?: Array<{ name?: string; value?: string }>;
  bodyMeasurements?: Array<{ name?: string; value?: string }>;
}

const isSizeMeasurementRow = (value: unknown): value is SizeMeasurementRow =>
  typeof value === 'object' && value !== null;

const withMeasurementValues = (rows: Array<{ name?: string; value?: string }> = []) =>
  rows.map((measurement) => ({ ...measurement, value: MEASUREMENT_VALUE }));

/** Development-only: fills the form with mock data (skips Cloudinary uploads). */
export function autofillProductForm(
  form: UseFormReturn<ProductFormValues>,
  schemaFields: FieldSpec[],
): void {
  // `ProductFormValues` carries a `Record<string, unknown>` index signature, so
  // every schema-driven dot-path below is assignable to RHF's `Path`/`FieldPath`
  // without a cast. Values are narrowed by the readers above instead.
  const setFieldValue = (name: string, value: unknown, options?: { shouldValidate?: boolean }) => {
    form.setValue(name, value, options);
  };

  form.setValue(
    'name',
    "Manfinity Hypemode Men's Solid Ribbed Long Sleeve Polo Shirt, Old Money Style",
    { shouldValidate: true },
  );
  form.setValue(
    'description',
    'High-quality ribbed knit polo shirt featuring a soft cotton blend, clean button placket, and classic tailoring. Highly breathable, perfect for styling in formal, transition, or casual settings.',
    { shouldValidate: true },
  );
  form.setValue('brand', 'Manfinity', { shouldValidate: true });
  form.setValue(
    'mainImages',
    [
      'https://res.cloudinary.com/celebsnp/image/upload/v1783941142/celebs/products/bln3u0xtadrgtioonfsn.png',
      'https://res.cloudinary.com/celebsnp/image/upload/v1783941153/celebs/products/dy4aw7qrlnj3uzglqbk5.png',
    ],
    { shouldValidate: true },
  );

  schemaFields.forEach((field) => {
    if (BASE_FIELD_NAMES.includes(field.name)) return;
    const ui = field.uiType.toLowerCase();
    const items = readOptionItems(field);
    if (ui === 'input' || ui === 'text') {
      setFieldValue(field.name, 'Premium Cotton Blend', { shouldValidate: true });
    } else if (ui === 'number') {
      setFieldValue(field.name, 12, { shouldValidate: true });
    } else if (ui === 'switch') {
      setFieldValue(field.name, true, { shouldValidate: true });
    } else if (ui === 'select') {
      const firstOpt = items ? toOptionValue(items[0]) : undefined;
      if (firstOpt) setFieldValue(field.name, firstOpt, { shouldValidate: true });
    } else if (ui === 'multiselect' || ui === 'variantlist') {
      const options = items ? items.slice(0, 2).map(toOptionValue).filter(Boolean) : DEFAULT_COLORS;
      setFieldValue(field.name, options, { shouldValidate: true });
    }
  });

  setFieldValue('sku.default.price', '1200', { shouldValidate: true });
  setFieldValue('sku.default.stock', '15', { shouldValidate: true });
  setFieldValue('sku.default.sellerSku', 'POLO-SHIRT-MOCK', { shouldValidate: true });
  setFieldValue('sku.default.available', true, { shouldValidate: true });

  const colors = readColorNames(form.getValues('Color'));
  colors.forEach((color) => {
    const prefix = `variants.colorMeta.${color}`;
    setFieldValue(`${prefix}.hot`, false);
    setFieldValue(`${prefix}.swatch`, SWATCH_URL);
    setFieldValue(`${prefix}.images`, SWATCH_IMAGES);
  });

  const rawSizes = form.getValues('sizes');
  const sizeRows = Array.isArray(rawSizes) ? rawSizes.filter(isSizeMeasurementRow) : [];
  setFieldValue(
    'sizes',
    sizeRows.map((sizeObj) => ({
      ...sizeObj,
      productMeasurements: withMeasurementValues(sizeObj.productMeasurements),
      bodyMeasurements: withMeasurementValues(sizeObj.bodyMeasurements),
    })),
    { shouldValidate: true },
  );
}

/** Confirms a dev-only autofill run. Kept beside the filler it describes. */
export function notifyAutofillApplied(): void {
  toast({
    title: 'Form autofilled',
    description: 'Populated with sample values for testing.',
  });
}
