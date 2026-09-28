// ─── Shared Zod validators — single source of truth from @celebs/shared-types ──
// Form components should import these directly rather than defining local copies.
export type {
  CreateProductType,
  ProductFilterType,
  ProductReviewActionType,
  UpdateProductType,
} from '@celebs/shared-types';
export {
  createProductSchema,
  productFilterSchema,
  productReviewActionSchema,
  updateProductSchema,
} from '@celebs/shared-types';

import type { FieldErrors } from 'react-hook-form';

import type { FieldSpec } from '../fields/ui-registry';
import { resolveColorAxisKey } from '../fields/variant-utils';
import type { ProductSidebarSection, SidebarSectionStatus } from '../types';

import {
  extractHexColor,
  getLabelMap,
  getNestedValue,
  isGalleryFilled,
  isHexColor,
  mapSchemaGroup,
  normalizeGroup,
  normalizeText,
  PageSectionKey,
  resolvePageSectionKey,
  resolveSchemaFieldForPath,
  sanitizeVariantKey,
  toStringArray,
  uniqueMessages,
} from './add-product-helpers';

export interface FlattenedError {
  message: string;
  path: string;
}

// Single source of truth for sidebar scroll-anchor ids. Values must stay
// identical to the element ids rendered by the form sections.
export const PRODUCT_SECTION_ANCHORS = {
  basic: 'product-section-basic',
  images: 'product-section-base',
  specification: 'product-section-details',
  pricingSale: 'product-section-sale',
  pricingVariant: 'product-section-variant',
  shipping: 'product-section-package',
  terms: 'product-section-termcondition',
} as const;

// Pricing is the only section that can explode into hundreds of rows. The cap
// is a readability budget, never a silent drop: the exact remainder is always
// appended as a "+N more" line.
const PRICING_ERROR_CAP = 6;

// ── the fix: Zod-aligned coercion ────────────────────────────────────────────
// Form inputs emit strings, so numeric strings ('1200') are intentionally
// accepted here (canonical form-layer coercion). Non-numbers ('abc', true,
// {}, '') are rejected exactly like Zod z.number() rejects non-numbers.
// Integer checks are int-consistent: 2.9 is rejected like z.number().int().
export const toStrictPositiveNumber = (value: unknown): number | undefined => {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const raw = String(value).trim();
  if (!raw) return undefined;
  const numeric = Number(raw);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : undefined;
};

export const toStrictNonNegativeInt = (value: unknown): number | undefined => {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const raw = String(value).trim();
  if (!raw) return undefined;
  const numeric = Number(raw);
  if (!Number.isFinite(numeric) || numeric < 0 || !Number.isInteger(numeric)) return undefined;
  return numeric;
};

// Strict required-field predicate (the single source of truth for "is this
// field actually answered?"). Deliberately stricter than a non-empty check:
// - SkuTableV2 participates via rows>0 (never always-true).
// - switch respects false: a required switch must be true, "off" is not filled.
// - ColorInline counts like other multi-value pickers (array length>0).
export const isRequiredFieldFilled = (field: FieldSpec, value: unknown): boolean => {
  const uiType = normalizeGroup(field.uiType);
  if (uiType === 'switch') return value === true;
  if (uiType === 'skutablev2') return Array.isArray(value) && value.length > 0;
  if (
    uiType === 'multiselect' ||
    uiType === 'variantlist' ||
    uiType === 'mainimage' ||
    uiType === 'colorinline' ||
    uiType === 'colormeta'
  ) {
    return Array.isArray(value) && value.length > 0;
  }
  if (typeof value === 'number') return Number.isFinite(value);
  return normalizeText(value).length > 0;
};

export const getRequiredFieldErrors = (
  fields: FieldSpec[],
  values: Record<string, unknown>,
): string[] =>
  fields
    .filter((field) => field.required && field.visible !== false)
    .filter((field) => !isRequiredFieldFilled(field, getNestedValue(values, field.name)))
    .map((field) => `${field.label} is required.`);

export const flattenFormErrors = (
  errors: FieldErrors<Record<string, unknown>> | undefined,
  parentPath = '',
): FlattenedError[] => {
  if (!errors || typeof errors !== 'object') {
    return [];
  }

  return Object.entries(errors).flatMap(([key, value]) => {
    const path = parentPath ? `${parentPath}.${key}` : key;
    const entry = value as Record<string, unknown> | undefined;

    if (!entry || typeof entry !== 'object') {
      return [];
    }

    const ownMessage = typeof entry.message === 'string' ? [{ path, message: entry.message }] : [];

    const childEntries = flattenFormErrors(
      Object.fromEntries(
        Object.entries(entry).filter(
          ([childKey]) => !['message', 'type', 'ref'].includes(childKey),
        ),
      ) as FieldErrors<Record<string, unknown>>,
      path,
    );

    return [...ownMessage, ...childEntries];
  });
};

// One pricing-matrix cell, identified by its RHF path prefix.
interface RowAddress {
  label: string;
  prefix: string;
}

// A cell plus the form values it reads from.
interface PricingRow extends RowAddress {
  values: Record<string, unknown>;
}

const cellValue = (row: PricingRow, field: string): unknown =>
  getNestedValue(row.values, `${row.prefix}.${field}`);

const rowPriceError = (row: PricingRow): string | undefined =>
  toStrictPositiveNumber(cellValue(row, 'price')) === undefined
    ? `${row.label}: add a valid price.`
    : undefined;

const rowSpecialPriceErrors = (row: PricingRow): string[] => {
  const special = toStrictPositiveNumber(cellValue(row, 'specialPrice'));
  if (!normalizeText(cellValue(row, 'specialPrice'))) return [];
  if (special === undefined) {
    return [`${row.label}: special price must be greater than 0.`];
  }
  // Kept intentionally per-row: createProductSchema refines discountedPrice <
  // price at the ROOT only, so the matrix row is the only place the
  // comparison can be reported for the offending variant.
  const price = toStrictPositiveNumber(cellValue(row, 'price'));
  if (price !== undefined && special >= price) {
    return [`${row.label}: special price must be lower than price.`];
  }
  return [];
};

const rowStockErrors = (row: PricingRow): string[] => {
  const raw = cellValue(row, 'stock');
  if (toStrictNonNegativeInt(raw) !== undefined) return [];
  // "Not answered" and "answered with a value z.number().int() rejects" are
  // different problems — a blanket "is required" hides a typed-in 2.9.
  return [
    normalizeText(raw).length > 0
      ? `${row.label}: stock must be a whole number of 0 or more.`
      : `${row.label}: stock quantity is required.`,
  ];
};

const rowSkuCodeError = (row: PricingRow): string | undefined =>
  normalizeText(cellValue(row, 'sellerSku')) ? undefined : `${row.label}: SKU code is required.`;

const pushIfPresent = (target: string[], message: string | undefined): void => {
  if (message) target.push(message);
};

const collectRowErrors = (row: PricingRow): string[] => {
  const errors: string[] = [];
  pushIfPresent(errors, rowPriceError(row));
  errors.push(...rowSpecialPriceErrors(row));
  errors.push(...rowStockErrors(row));
  pushIfPresent(errors, rowSkuCodeError(row));
  return errors;
};

interface ActiveVariant {
  key: string;
  label: string;
  labels: Map<string, string>;
  values: string[];
}

const variantValueLabel = (variant: ActiveVariant, value: string): string =>
  variant.labels.get(value) || value;

const rowAddress = (
  variant: ActiveVariant,
  value: string,
  nested?: ActiveVariant,
  nestedValue?: string,
): RowAddress => {
  const prefix = [
    `sku.variants.${variant.key}.${sanitizeVariantKey(value)}`,
    nested ? `${nested.key}.${sanitizeVariantKey(nestedValue ?? '')}` : '',
  ]
    .filter(Boolean)
    .join('.');
  const own = `${variant.label}: ${variantValueLabel(variant, value)}`;
  const other = nested ? `, ${nested.label}: ${variantValueLabel(nested, nestedValue ?? '')}` : '';
  return { label: `${own}${other}`, prefix };
};

/** Walks the active axes and hands every priced cell to `visit`. */
const forEachPricingRow = (
  activeVariants: ActiveVariant[],
  visit: (address: RowAddress) => void,
): void => {
  if (activeVariants.length === 0) {
    visit({ label: 'Default SKU', prefix: 'sku.default' });
    return;
  }
  // An axis with no selection has no rows yet — the required-selector rule
  // reports that instead of inventing cells.
  if (activeVariants.some((variant) => variant.values.length === 0)) return;

  const [first, second] = activeVariants;
  if (!second) {
    first.values.forEach((value) => visit(rowAddress(first, value)));
    return;
  }
  first.values.forEach((firstValue) => {
    second.values.forEach((secondValue) =>
      visit(rowAddress(first, firstValue, second, secondValue)),
    );
  });
};

export const collectPricingErrors = ({
  fields,
  values,
  variantMeta,
}: {
  fields: FieldSpec[];
  values: Record<string, unknown>;
  variantMeta: Array<{ key: string; label: string }>;
}): string[] => {
  const errors: string[] = [];
  let overflowCount = 0;

  const pushErrors = (messages: string[]) => {
    for (const message of messages) {
      if (errors.length < PRICING_ERROR_CAP) {
        errors.push(message);
      } else {
        overflowCount += 1;
      }
    }
  };

  if (variantMeta.length > 2) {
    const [first, second, ...rest] = variantMeta.map((variant) => variant.label);
    pushErrors([
      `Only two variant groups are supported in the pricing matrix (${first} × ${second}). ` +
        `Clear values for ${rest.join(', ')} to continue.`,
    ]);
  }

  const activeVariants: ActiveVariant[] = variantMeta.slice(0, 2).map((variant) => ({
    key: variant.key,
    label: variant.label,
    labels: getLabelMap(fields, variant.key),
    values: toStringArray(getNestedValue(values, variant.key)),
  }));

  forEachPricingRow(activeVariants, (address) => {
    pushErrors(collectRowErrors({ ...address, values }));
  });

  if (overflowCount > 0) {
    errors.push(
      `+${overflowCount} more pricing ${overflowCount === 1 ? 'error' : 'errors'} — open the Pricing section to review the full list.`,
    );
  }

  return errors;
};

export const collectColorImageErrors = ({
  values,
  variantMeta,
}: {
  values: Record<string, unknown>;
  variantMeta: Array<{ key: string; label: string }>;
}): string[] => {
  const colorAxisKey = resolveColorAxisKey(variantMeta);
  if (!colorAxisKey) return [];
  const selected = toStringArray(getNestedValue(values, colorAxisKey));
  if (selected.length === 0) return [];
  const colorMeta = getNestedValue(values, 'variants.colorMeta') as
    | Record<string, { images?: unknown }>
    | undefined;
  const errors: string[] = [];
  for (const colorValue of selected) {
    const sanitized = sanitizeVariantKey(colorValue);
    const images =
      colorMeta?.[colorValue]?.images ??
      colorMeta?.[sanitized]?.images ??
      getNestedValue(values, `variants.colorMeta.${colorValue}.images`) ??
      getNestedValue(values, `variants.colorMeta.${sanitized}.images`) ??
      values[`variants.colorMeta.${colorValue}.images`] ??
      values[`variants.colorMeta.${sanitized}.images`];

    if (!isGalleryFilled(images)) {
      errors.push(`Add at least one product photo for color ${colorValue}.`);
    }
  }
  return errors;
};

export const collectTotalStockError = ({
  values,
}: {
  values: Record<string, unknown>;
}): string[] => {
  const flat = values as Record<string, unknown>;
  let total = 0;
  let seenAny = false;
  for (const [key, value] of Object.entries(flattenForStock(flat))) {
    if (/(^|\.)(stock|quantity)$/.test(key)) {
      const qty = toStrictNonNegativeInt(value);
      if (qty !== undefined) {
        seenAny = true;
        total += qty;
      }
    }
  }
  if (!seenAny || total === 0) {
    return ['Add at least 1 unit of stock across variants to publish.'];
  }
  return [];
};

// Deep flatten that descends into arrays (indexed segments) so array-held
// stock (e.g. colorVariants[0].stocks[0].quantity) participates in totals.
const flattenForStock = (obj: Record<string, unknown>, prefix = ''): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (Array.isArray(value)) {
      value.forEach((entry, index) => {
        const indexed = `${path}.${index}`;
        if (entry && typeof entry === 'object' && !(entry instanceof File)) {
          Object.assign(out, flattenForStock(entry as Record<string, unknown>, indexed));
        } else {
          out[indexed] = entry;
        }
      });
    } else if (value && typeof value === 'object' && !(value instanceof File)) {
      Object.assign(out, flattenForStock(value as Record<string, unknown>, path));
    } else {
      out[path] = value;
    }
  }
  return out;
};

export const collectCoverError = ({
  values,
  schemaFields = [],
}: {
  values: Record<string, unknown>;
  schemaFields?: FieldSpec[];
}): string[] => {
  const coverFieldName =
    schemaFields.find((field) => normalizeGroup(field.uiType) === 'mainimage')?.name ?? 'mainImage';
  const main =
    getNestedValue(values, coverFieldName) ??
    values[coverFieldName] ??
    getNestedValue(values, 'mainImages') ??
    values.mainImages;
  if (Array.isArray(main) && main.length > 0) return [];
  const colorMeta = getNestedValue(values, 'variants.colorMeta') as
    | Record<string, { images?: unknown }>
    | undefined;
  const hasGallery =
    colorMeta &&
    Object.values(colorMeta).some(
      (entry) => Array.isArray(entry?.images) && entry.images.length > 0,
    );
  if (hasGallery) return [];

  const hasFlatGallery = Object.keys(values).some(
    (key) =>
      key.startsWith('variants.colorMeta.') &&
      key.endsWith('.images') &&
      Array.isArray(values[key]) &&
      (values[key] as unknown[]).length > 0,
  );
  return hasFlatGallery ? [] : ['Add a cover photo or at least one color gallery photo.'];
};

const PACKAGE_DIMENSIONS = [
  { key: 'packageLengthCm', label: 'Parcel length' },
  { key: 'packageWidthCm', label: 'Parcel width' },
  { key: 'packageHeightCm', label: 'Parcel height' },
] as const;

const isBlankNumber = (value: unknown): boolean =>
  value === undefined || value === null || value === '';

/** A blank value is fine (server default / optional); a present one must parse. */
const positiveNumberError = (value: unknown, message: string): string[] =>
  !isBlankNumber(value) && toStrictPositiveNumber(value) === undefined ? [message] : [];

const collectWarrantyErrors = (values: Record<string, unknown>): string[] => {
  const warrantyType = String(values.warrantyType || 'NO_WARRANTY');
  if (warrantyType === 'NO_WARRANTY') return [];
  return normalizeText(values.warrantyPeriod)
    ? []
    : ['Specify warranty duration when warranty is offered.'];
};

export const collectShippingErrors = ({
  values,
}: {
  values: Record<string, unknown>;
}): string[] => {
  // Server semantics: shippingDetailsSchema defaults packageWeightKg to 0.3, so a
  // blank weight is defaulted rather than missing — never hard-fail it.
  const weightErrors = positiveNumberError(
    values.packageWeightKg,
    'Package weight must be greater than 0 kg (leave blank to use the 0.3 kg default).',
  );
  // Every offending dimension is named, not just the first one.
  const dimensionErrors = PACKAGE_DIMENSIONS.flatMap((dim) =>
    positiveNumberError(values[dim.key], `${dim.label} must be a positive number in cm.`),
  );
  return uniqueMessages([...weightErrors, ...dimensionErrors, ...collectWarrantyErrors(values)]);
};

// Visible bucket for errors that match no known section. Rendered as a
// "General" sidebar entry so unmappable errors are never silently dropped.
export type SidebarSectionKey = PageSectionKey | 'general';

const KNOWN_ERROR_PREFIXES = [
  'name',
  'brand',
  'description',
  'categoryId',
  'subcategoryId',
  'mainImage',
  'mainImages',
  'variants.colorMeta',
  'colorMeta',
  'sku.',
  'sizes',
  'size_chart',
  'packageWeightKg',
  'packageLengthCm',
  'packageWidthCm',
  'packageHeightCm',
  'packagingType',
  'isFragile',
  'hasBatteryOrLiquid',
  'warrantyType',
  'warrantyPeriod',
  'warrantyPolicy',
  'isNonReturnable',
];

const isKnownErrorPath = (path: string): boolean =>
  KNOWN_ERROR_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix));

export const groupFieldErrorsBySection = (
  fieldErrors: FlattenedError[],
  schemaFields: FieldSpec[],
): Record<SidebarSectionKey, string[]> => {
  return fieldErrors.reduce<Record<SidebarSectionKey, string[]>>(
    (acc, error) => {
      const matched = resolveSchemaFieldForPath(schemaFields, error.path);
      // Variant-picker errors (color/size selectors) belong to the pricing
      // section's Variants card — never images/details.
      if (matched && mapSchemaGroup(matched.group) === 'variant') {
        acc.pricing.push(error.message);
        return acc;
      }
      // Unknown-group default: a visible "general" bucket, never details.
      if (!matched && !isKnownErrorPath(error.path)) {
        acc.general.push(error.message);
        return acc;
      }
      const key = resolvePageSectionKey(error.path, schemaFields);
      acc[key].push(error.message);
      return acc;
    },
    {
      basic: [],
      images: [],
      specification: [],
      pricing: [],
      shipping: [],
      terms: [],
      general: [],
    },
  );
};

export const groupFieldsBySchemaGroup = (schemaFields: FieldSpec[]) => ({
  base: schemaFields.filter((field) => mapSchemaGroup(field.group) === 'base'),
  details: schemaFields.filter((field) => mapSchemaGroup(field.group) === 'details'),
  variant: schemaFields.filter((field) => mapSchemaGroup(field.group) === 'variant'),
  package: schemaFields.filter((field) => mapSchemaGroup(field.group) === 'package'),
  terms: schemaFields.filter((field) => mapSchemaGroup(field.group) === 'termcondition'),
});

export const collectBasicSectionErrors = ({
  errors,
  values,
  schemaHasName,
}: {
  errors: string[];
  values: Record<string, unknown>;
  schemaHasName: boolean;
}): string[] => {
  const custom: string[] = [];
  // Aligned to Zod truth: baseProductSchema requires min-2 (never min-30).
  if (!schemaHasName && normalizeText(values.name).length < 2) {
    custom.push('Product name must be at least 2 characters.');
  }
  if (!normalizeText(values.categoryId) || !normalizeText(values.subcategoryId)) {
    custom.push('Select a product category before publishing.');
  }
  return uniqueMessages([...errors, ...custom]);
};

// Non-trivial spec fill: ignores empty and one-character values so three
// 1-char fills no longer satisfy min-3.
const isNonTrivialSpecFill = (field: FieldSpec, value: unknown): boolean => {
  if (typeof value === 'string') return value.trim().length >= 2;
  return isRequiredFieldFilled(field, value);
};

export const collectSpecificationSectionErrors = ({
  errors,
  detailsFields,
  values,
}: {
  errors: string[];
  detailsFields: FieldSpec[];
  values: Record<string, unknown>;
}): string[] => {
  const filledSpecCount = detailsFields.filter((field) =>
    isNonTrivialSpecFill(field, getNestedValue(values, field.name)),
  ).length;

  const minSpecsRequired = Math.min(3, detailsFields.length);
  const specCountError =
    detailsFields.length > 0 && filledSpecCount < minSpecsRequired
      ? [
          `Fill at least ${minSpecsRequired} specification attribute${minSpecsRequired > 1 ? 's' : ''} (currently ${filledSpecCount} filled).`,
        ]
      : [];

  return uniqueMessages([
    ...errors,
    ...getRequiredFieldErrors(detailsFields, values),
    ...specCountError,
  ]);
};

export const collectPricingSectionErrors = ({
  errors,
  schemaFields,
  variantFields,
  values,
  variantMeta,
}: {
  errors: string[];
  schemaFields: FieldSpec[];
  variantFields: FieldSpec[];
  values: Record<string, unknown>;
  variantMeta: Array<{ key: string; label: string }>;
}): string[] => {
  return uniqueMessages([
    ...errors,
    // ColorInline participates in required-variant checks (no exclusion).
    ...getRequiredFieldErrors(variantFields, values),
    ...collectPricingErrors({
      fields: schemaFields,
      values,
      variantMeta,
    }),
    ...collectTotalStockError({ values }),
  ]);
};

// Server requires colorVariants[].colorCode (min-1). The form may carry no
// colorCode input, so validation errors precisely when it is missing instead
// of letting the payload 400 at the door.
export const collectColorCodeErrors = ({
  values,
  variantMeta,
}: {
  values: Record<string, unknown>;
  variantMeta: Array<{ key: string; label: string }>;
}): string[] => {
  const colorAxisKey = variantMeta.find(
    (axis) => axis.key.toLowerCase() === 'color' || axis.label.toLowerCase().includes('color'),
  )?.key;
  if (!colorAxisKey) return [];
  const selected = toStringArray(getNestedValue(values, colorAxisKey));
  if (selected.length === 0) return [];
  const colorMeta = getNestedValue(values, 'variants.colorMeta') as
    | Record<string, { colorCode?: unknown; swatch?: unknown }>
    | undefined;
  const errors: string[] = [];
  for (const colorValue of selected) {
    const sanitized = sanitizeVariantKey(colorValue);
    const entry = colorMeta?.[colorValue] ?? colorMeta?.[sanitized];
    const candidate = normalizeText(entry?.colorCode) || normalizeText(entry?.swatch);
    const hasCode =
      candidate.length > 0 &&
      (isHexColor(candidate) || extractHexColor(candidate) !== undefined || candidate.length >= 2);
    const valueHasHex = isHexColor(colorValue.trim()) || extractHexColor(colorValue) !== undefined;
    if (!hasCode && !valueHasHex) {
      errors.push(
        `Color ${colorValue} needs a hex color code (for example #A1B2C3) — the storefront swatch cannot be rendered without one.`,
      );
    }
  }
  return errors;
};

export const collectImageSectionErrors = ({
  errors,
  baseFields,
  values,
  variantMeta,
  schemaFields,
}: {
  errors: string[];
  baseFields: FieldSpec[];
  values: Record<string, unknown>;
  variantMeta: Array<{ key: string; label: string }>;
  schemaFields: FieldSpec[];
}): string[] => {
  return uniqueMessages([
    ...errors,
    ...getRequiredFieldErrors(baseFields, values),
    ...collectColorImageErrors({ values, variantMeta }),
    ...collectColorCodeErrors({ values, variantMeta }),
    ...collectCoverError({ values, schemaFields }),
  ]);
};

export const collectShippingSectionErrors = ({
  errors,
  packageFields,
  values,
}: {
  errors: string[];
  packageFields: FieldSpec[];
  values: Record<string, unknown>;
}): string[] => {
  return uniqueMessages([
    ...errors,
    ...getRequiredFieldErrors(packageFields, values),
    ...collectShippingErrors({ values }),
  ]);
};

export const collectTermsSectionErrors = ({
  errors,
  termsFields,
  values,
}: {
  errors: string[];
  termsFields: FieldSpec[];
  values: Record<string, unknown>;
}): string[] => {
  return uniqueMessages([...errors, ...getRequiredFieldErrors(termsFields, values)]);
};

// ── Section completeness (three-state) ───────────────────────────────────────

/**
 * A value the sidebar owns that no `FieldSpec` describes. These are the
 * fixed-shape form blocks (cover gallery, SKU matrix, parcel, warranty) that
 * exist for every category, so their specs are declared here rather than
 * waited for from a schema query.
 */
const valueSlot = (name: string, uiType: FieldSpec['uiType'] = 'input'): FieldSpec => ({
  name,
  uiType,
  label: name,
  group: 'sidebar',
});

const IMAGE_SLOTS: FieldSpec[] = [
  valueSlot('mainImage', 'MainImage'),
  valueSlot('mainImages', 'MainImage'),
  valueSlot('variants.colorMeta', 'ColorMeta'),
];

const PRICING_SLOTS: FieldSpec[] = [valueSlot('sku', 'SkuTableV2')];

const SHIPPING_SLOTS: FieldSpec[] = [
  valueSlot('packageWeightKg', 'number'),
  valueSlot('packageLengthCm', 'number'),
  valueSlot('packageWidthCm', 'number'),
  valueSlot('packageHeightCm', 'number'),
  valueSlot('packagingType', 'select'),
  valueSlot('isFragile', 'Switch'),
  valueSlot('hasBatteryOrLiquid', 'Switch'),
];

const TERMS_SLOTS: FieldSpec[] = [
  valueSlot('warrantyType', 'select'),
  valueSlot('warrantyPeriod'),
  valueSlot('warrantyPolicy'),
  valueSlot('isNonReturnable', 'Switch'),
];

/**
 * Basic info is never schema-driven, so its slots (and their required flags)
 * are declared here. The category pair is a PREREQUISITE, not an answer: it is
 * written by the same click that resets the form, so treating it as an answer
 * is what made a single category selection light the section up as started.
 */
const basicAnsweredSlots = (): FieldSpec[] => [
  { name: 'name', uiType: 'input', label: 'Product Name', group: 'basic' },
  { name: 'brand', uiType: 'input', label: 'Brand', group: 'basic' },
  { name: 'description', uiType: 'input', label: 'Description', group: 'basic' },
];

const basicRequiredSlots = (schemaHasName: boolean): FieldSpec[] => [
  {
    name: 'name',
    uiType: 'input',
    label: 'Product Name',
    group: 'basic',
    required: !schemaHasName,
  },
  { name: 'categoryId', uiType: 'input', label: 'Category', group: 'basic', required: true },
  {
    name: 'subcategoryId',
    uiType: 'input',
    label: 'Subcategory',
    group: 'basic',
    required: true,
  },
];

const isAnsweredLeaf = (value: unknown, isNested: boolean): boolean => {
  if (typeof value === 'boolean') return !isNested && value;
  if (typeof value === 'number') return Number.isFinite(value);
  return normalizeText(value).length > 0;
};

/**
 * "Has the seller put something real in here?"
 *
 * Engagement cannot be asked with `isRequiredFieldFilled`, which reads a single
 * slot: these sections are subtrees, not scalars. `sku` is
 * `{ default: { price, stock, sellerSku, available: true } }` and
 * `variants.colorMeta` is `{ Red: { images: [...] } }`, so a shape-specific
 * predicate sees nothing.
 *
 * Booleans count only at the top level and only when true: a nested
 * `available: true` and a freshly-reset `isFragile: false` are defaults the
 * seller never chose, and treating them as answers is what made a just-reset
 * form read as "started".
 */
const hasRealAnswer = (value: unknown, isNested = false): boolean => {
  if (Array.isArray(value)) return value.some((entry) => hasRealAnswer(entry, true));
  if (value !== null && typeof value === 'object') {
    return Object.values(value).some((entry) => hasRealAnswer(entry, true));
  }
  return isAnsweredLeaf(value, isNested);
};

const isSlotAnswered = (slot: FieldSpec, values: Record<string, unknown>): boolean =>
  hasRealAnswer(getNestedValue(values, slot.name));

/**
 * The single source of truth for "is this section done?".
 *
 * `errors.length === 0` can never mean done on its own — that is the bug this
 * replaces. Validity is necessary, not sufficient: a section is complete only
 * once nothing is missing AND the seller has actually answered something in
 * it; a section where nothing has been answered is `untouched` rather than a
 * failure, because it must not read as done and must not be red.
 */
const deriveSectionStatus = ({
  answeredSlots,
  errors,
  requiredSlots,
  values,
}: {
  answeredSlots: FieldSpec[];
  errors: string[];
  requiredSlots: FieldSpec[];
  values: Record<string, unknown>;
}): SidebarSectionStatus => {
  if (!answeredSlots.some((slot) => isSlotAnswered(slot, values))) return 'untouched';
  if (errors.length > 0) return 'incomplete';
  const required = requiredSlots.filter((slot) => slot.required && slot.visible !== false);
  const decisive = required.length > 0 ? required : answeredSlots;
  return decisive.some((slot) => isSlotAnswered(slot, values)) ? 'complete' : 'incomplete';
};

/**
 * With no schema fields the checklist knows nothing: every section is
 * `untouched` and carries no error, because a rule derived from an empty
 * schema (or from a still-loading one) is never a user error. Painting the
 * sidebar red — or worse, "Form fields are still loading." as a failure —
 * before the seller has seen a field is the failure mode this prevents.
 */
const markSchemaLoading = (sections: ProductSidebarSection[]): ProductSidebarSection[] =>
  sections.map((section) => ({ ...section, status: 'untouched', errors: [] }));

export const buildSidebarSections = ({
  fieldErrors,
  schemaFields,
  schemaHasName,
  values,
  variantMeta,
}: {
  fieldErrors: FlattenedError[];
  schemaFields: FieldSpec[];
  schemaHasName: boolean;
  values: Record<string, unknown>;
  variantMeta: Array<{ key: string; label: string }>;
}): ProductSidebarSection[] => {
  const groupedErrors = groupFieldErrorsBySection(fieldErrors, schemaFields);
  const groupedFields = groupFieldsBySchemaGroup(schemaFields);

  const basicErrors = collectBasicSectionErrors({
    errors: groupedErrors.basic,
    values,
    schemaHasName,
  });

  const imageErrors = collectImageSectionErrors({
    errors: groupedErrors.images,
    baseFields: groupedFields.base,
    values,
    variantMeta,
    schemaFields,
  });

  const specificationErrors = collectSpecificationSectionErrors({
    errors: groupedErrors.specification,
    detailsFields: groupedFields.details,
    values,
  });

  const pricingErrors = collectPricingSectionErrors({
    errors: groupedErrors.pricing,
    schemaFields,
    variantFields: groupedFields.variant,
    values,
    variantMeta,
  });

  const shippingErrors = collectShippingSectionErrors({
    errors: groupedErrors.shipping,
    packageFields: groupedFields.package,
    values,
  });

  // Deterministic rule: variants-required → variant anchor, else sale. It never
  // depends on which errors happen to be present, so a scroll always lands on
  // the card that owns the field. The variant target <div
  // id="product-section-variant"> is rendered inside the sale card by
  // dynamic-product-form.
  const pricingAnchorId = groupedFields.variant.some((field) => field.required)
    ? PRODUCT_SECTION_ANCHORS.pricingVariant
    : PRODUCT_SECTION_ANCHORS.pricingSale;

  const sections: ProductSidebarSection[] = [
    {
      key: 'basic',
      label: 'Basic Information',
      anchorId: PRODUCT_SECTION_ANCHORS.basic,
      status: deriveSectionStatus({
        answeredSlots: basicAnsweredSlots(),
        errors: basicErrors,
        requiredSlots: basicRequiredSlots(schemaHasName),
        values,
      }),
      errors: basicErrors,
    },
    {
      key: 'images',
      label: 'Product Images',
      anchorId: PRODUCT_SECTION_ANCHORS.images,
      status: deriveSectionStatus({
        answeredSlots: [...groupedFields.base, ...IMAGE_SLOTS],
        errors: imageErrors,
        requiredSlots: groupedFields.base,
        values,
      }),
      errors: imageErrors,
    },
    {
      key: 'specification',
      label: 'Product Specification',
      anchorId: PRODUCT_SECTION_ANCHORS.specification,
      status: deriveSectionStatus({
        answeredSlots: groupedFields.details,
        errors: specificationErrors,
        requiredSlots: groupedFields.details,
        values,
      }),
      errors: specificationErrors,
    },
    {
      key: 'pricing',
      label: 'Price, Stock & Variants',
      anchorId: pricingAnchorId,
      status: deriveSectionStatus({
        answeredSlots: [...groupedFields.variant, ...PRICING_SLOTS],
        errors: pricingErrors,
        requiredSlots: groupedFields.variant,
        values,
      }),
      errors: pricingErrors,
    },
    {
      key: 'shipping',
      label: 'Shipping & Warranty',
      anchorId: PRODUCT_SECTION_ANCHORS.shipping,
      status: deriveSectionStatus({
        answeredSlots: [...groupedFields.package, ...SHIPPING_SLOTS],
        errors: shippingErrors,
        requiredSlots: groupedFields.package,
        values,
      }),
      errors: shippingErrors,
    },
  ];

  const hasVisibleTerms = groupedFields.terms.some(
    (field) => field.required || field.visible !== false,
  );
  if (hasVisibleTerms) {
    const termsErrors = collectTermsSectionErrors({
      errors: groupedErrors.terms,
      termsFields: groupedFields.terms,
      values,
    });
    sections.push({
      key: 'terms',
      label: 'Terms & Conditions',
      anchorId: PRODUCT_SECTION_ANCHORS.terms,
      // Derived like every other section: a hardcoded `false` here meant the
      // section could never complete, so `isReady` was permanently false.
      status: deriveSectionStatus({
        answeredSlots: [...groupedFields.terms, ...TERMS_SLOTS],
        errors: termsErrors,
        requiredSlots: groupedFields.terms,
        values,
      }),
      errors: termsErrors,
    });
  }

  // Unmappable errors surface under a visible "General" bucket (never hidden
  // in details) and count against completion via their section status. Only
  // meaningful once a schema exists to be "unmappable" from.
  if (schemaFields.length > 0 && groupedErrors.general.length > 0) {
    sections.push({
      key: 'general',
      label: 'General',
      anchorId: PRODUCT_SECTION_ANCHORS.basic,
      // Always `incomplete`: this bucket is errors by definition, so it is
      // engaged whether or not the seller has answered anything.
      status: 'incomplete',
      errors: groupedErrors.general,
    });
  }

  return schemaFields.length === 0 ? markSchemaLoading(sections) : sections;
};
