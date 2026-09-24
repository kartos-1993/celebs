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
import type { ProductSidebarSection } from '../types';

import {
  getLabelMap,
  getNestedValue,
  isFieldFilled,
  isGalleryFilled,
  mapSchemaGroup,
  normalizeGroup,
  normalizeText,
  PageSectionKey,
  resolvePageSectionKey,
  sanitizeVariantKey,
  toNonNegativeInteger,
  toPositiveNumber,
  toStringArray,
  uniqueMessages,
} from './add-product-helpers';

export interface FlattenedError {
  message: string;
  path: string;
}

export const getRequiredFieldErrors = (
  fields: FieldSpec[],
  values: Record<string, unknown>,
): string[] =>
  fields
    .filter((field) => field.required && field.visible !== false)
    .filter((field) => !isFieldFilled(field, getNestedValue(values, field.name)))
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
  let truncated = false;

  const pushError = (message: string) => {
    if (errors.length < 6) {
      errors.push(message);
    } else {
      truncated = true;
    }
  };

  const validateRow = (label: string, prefix: string) => {
    const price = toPositiveNumber(getNestedValue(values, `${prefix}.price`));
    const specialPriceRaw = normalizeText(getNestedValue(values, `${prefix}.specialPrice`));
    const specialPrice = specialPriceRaw
      ? toPositiveNumber(getNestedValue(values, `${prefix}.specialPrice`))
      : undefined;
    const freeItems = normalizeText(getNestedValue(values, `${prefix}.freeItems`));

    if (price === undefined) {
      pushError(`${label}: add a valid price.`);
    }

    if (specialPriceRaw && specialPrice === undefined) {
      pushError(`${label}: special price must be greater than 0.`);
    }

    if (specialPrice !== undefined && price !== undefined && specialPrice >= price) {
      pushError(`${label}: special price must be lower than price.`);
    }

    const stockVal = getNestedValue(values, `${prefix}.stock`);
    const parsedStock = toNonNegativeInteger(stockVal);
    if (parsedStock === undefined) {
      pushError(`${label}: stock quantity is required.`);
    }

    if (
      freeItems &&
      toNonNegativeInteger(getNestedValue(values, `${prefix}.freeItems`)) === undefined
    ) {
      pushError(`${label}: free items cannot be negative.`);
    }
  };

  if (variantMeta.length > 2) {
    const labels = variantMeta.map((variant) => variant.label).join(', ');
    const [first, second, ...rest] = variantMeta.map((variant) => variant.label);
    pushError(
      `Only two variant groups are supported in the pricing matrix (${first} × ${second}). ` +
        `Clear values for ${rest.join(', ')} to continue. [${labels}]`,
    );
  }

  const activeVariants = variantMeta.slice(0, 2).map((variant) => ({
    key: variant.key,
    label: variant.label,
    labels: getLabelMap(fields, variant.key),
    values: toStringArray(getNestedValue(values, variant.key)),
  }));

  if (activeVariants.length === 0) {
    validateRow('Default SKU', 'sku.default');
  } else if (activeVariants.some((variant) => variant.values.length === 0)) {
    // Required variant selectors are handled elsewhere.
  } else if (activeVariants.length === 1) {
    activeVariants[0].values.forEach((variantValue) => {
      const label = activeVariants[0].labels.get(variantValue) || variantValue;
      validateRow(
        `${activeVariants[0].label}: ${label}`,
        `sku.variants.${activeVariants[0].key}.${sanitizeVariantKey(variantValue)}`,
      );
    });
  } else {
    activeVariants[0].values.forEach((firstValue) => {
      activeVariants[1].values.forEach((secondValue) => {
        const firstLabel = activeVariants[0].labels.get(firstValue) || firstValue;
        const secondLabel = activeVariants[1].labels.get(secondValue) || secondValue;

        validateRow(
          `${activeVariants[0].label}: ${firstLabel}, ${activeVariants[1].label}: ${secondLabel}`,
          `sku.variants.${activeVariants[0].key}.${sanitizeVariantKey(firstValue)}.${activeVariants[1].key}.${sanitizeVariantKey(secondValue)}`,
        );
      });
    });
  }

  if (truncated) {
    errors.push('More pricing rows still need attention.');
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
  for (const [key, value] of Object.entries(flattenObjectShallow(flat))) {
    if (/(^|\.)stock$/.test(key)) {
      const qty = toNonNegativeInteger(value);
      if (qty !== undefined) {
        seenAny = true;
        total += qty;
      }
    }
  }
  if (!seenAny || total === 0) {
    return ['Add at least 1 unit in one size to publish.'];
  }
  return [];
};

const flattenObjectShallow = (
  obj: Record<string, unknown>,
  prefix = '',
): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof File)) {
      Object.assign(out, flattenObjectShallow(value as Record<string, unknown>, path));
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
  const main = getNestedValue(values, coverFieldName) ?? values[coverFieldName];
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
  const groupedErrors = fieldErrors.reduce<Record<PageSectionKey, string[]>>(
    (acc, error) => {
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
    },
  );

  const groupedFields = {
    base: schemaFields.filter((field) => mapSchemaGroup(field.group) === 'base'),
    details: schemaFields.filter((field) => mapSchemaGroup(field.group) === 'details'),
    variant: schemaFields.filter((field) => mapSchemaGroup(field.group) === 'variant'),
    package: schemaFields.filter((field) => mapSchemaGroup(field.group) === 'package'),
    terms: schemaFields.filter((field) => mapSchemaGroup(field.group) === 'termcondition'),
  };

  const basicErrors = uniqueMessages([
    ...groupedErrors.basic,
    ...(!schemaHasName && normalizeText(values.name).length < 30
      ? ['Product name must be at least 30 characters.']
      : []),
    ...(!normalizeText(values.categoryId) || !normalizeText(values.subcategoryId)
      ? ['Select a product category before publishing.']
      : []),
  ]);

  const imageErrors = uniqueMessages([
    ...groupedErrors.images,
    ...getRequiredFieldErrors(groupedFields.base, values),
    ...collectColorImageErrors({ values, variantMeta }),
    ...collectCoverError({ values, schemaFields }),
  ]);

  const specificationErrors = uniqueMessages([
    ...groupedErrors.specification,
    ...getRequiredFieldErrors(groupedFields.details, values),
  ]);

  const pricingErrors = uniqueMessages([
    ...groupedErrors.pricing,
    ...getRequiredFieldErrors(
      groupedFields.variant.filter((field) => field.uiType !== 'ColorInline'),
      values,
    ),
    ...collectPricingErrors({
      fields: schemaFields,
      values,
      variantMeta,
    }),
    ...collectTotalStockError({ values }),
  ]);

  const shippingErrors = uniqueMessages([
    ...groupedErrors.shipping,
    ...getRequiredFieldErrors(groupedFields.package, values),
  ]);

  const termsErrors = uniqueMessages([
    ...groupedErrors.terms,
    ...getRequiredFieldErrors(groupedFields.terms, values),
  ]);

  const sections: ProductSidebarSection[] = [
    {
      key: 'basic',
      label: 'Basic Information',
      anchorId: 'product-section-basic',
      status: basicErrors.length === 0,
      errors: basicErrors,
    },
  ];

  if (schemaFields.length > 0) {
    sections.push(
      {
        key: 'images',
        label: 'Product Images',
        anchorId: 'product-section-base',
        status: imageErrors.length === 0,
        errors: imageErrors,
      },
      {
        key: 'specification',
        label: 'Product Specification',
        anchorId: 'product-section-details',
        status: specificationErrors.length === 0,
        errors: specificationErrors,
      },
      {
        key: 'pricing',
        label: 'Price, Stock & Variants',
        anchorId:
          pricingErrors.length > 0 && groupedFields.variant.some((field) => field.required)
            ? 'product-section-variant'
            : 'product-section-sale',
        status: pricingErrors.length === 0,
        errors: pricingErrors,
      },
      {
        key: 'shipping',
        label: 'Shipping & Warranty',
        anchorId: 'product-section-package',
        status: shippingErrors.length === 0,
        errors: shippingErrors,
      },
    );

    if (groupedFields.terms.some((field) => field.required || field.visible !== false)) {
      sections.push({
        key: 'terms',
        label: 'Terms & Conditions',
        anchorId: 'product-section-termcondition',
        status: termsErrors.length === 0,
        errors: termsErrors,
      });
    }
  }

  return sections;
};
