import type { FieldErrors } from 'react-hook-form';

import { flattenFormErrors as flattenFormErrorsCore } from './add-product-validation';

export interface FlatFormError {
  path: string;
  message: string;
}

// One core, two public names. The flatten itself (including nested children)
// lives in add-product-validation.ts; this signature is kept for its existing
// importers so no error is silently dropped and no second implementation drifts.
export const flattenFormErrors = (
  errors: FieldErrors<Record<string, unknown>> | undefined,
  parentPath = '',
): FlatFormError[] => flattenFormErrorsCore(errors, parentPath);

// Exact label map for paths whose last segment is an internal field name.
// Anything unlisted falls back to a humanized last segment.
const FIELD_LABELS: Record<string, string> = {
  name: 'Product Name',
  brand: 'Brand',
  description: 'Description',
  categoryId: 'Category',
  subcategoryId: 'Subcategory',
  // The form carries the plural gallery field; the singular alias still appears
  // in server-shaped errors.
  mainImage: 'Product Images',
  mainImages: 'Product Images',
  price: 'Regular Price',
  discountedPrice: 'Special Price',
  packageWeightKg: 'Package Weight (kg)',
  packageLengthCm: 'Parcel Length (cm)',
  packageWidthCm: 'Parcel Width (cm)',
  packageHeightCm: 'Parcel Height (cm)',
  warrantyType: 'Warranty Type',
  warrantyPeriod: 'Warranty Duration',
  isFragile: 'Fragile Handling',
  hasBatteryOrLiquid: 'Battery or Liquid',
  isNonReturnable: 'Non-Returnable',
};

export const formatFieldLabel = (path: string): string => {
  if (path.startsWith('sizes.')) {
    if (path.includes('bodyMeasurements')) {
      return 'Body Measurements';
    }
    if (path.includes('productMeasurements')) {
      return 'Product Measurements';
    }
    return 'Size Chart';
  }
  if (
    path.startsWith('sku.') ||
    path.startsWith('sku.default') ||
    path.startsWith('sku.variants')
  ) {
    return 'Price & Stock (SKU)';
  }
  if (path.startsWith('variants.colorMeta') || path.startsWith('colorMeta')) {
    return 'Color Images & Swatches';
  }

  const exact = FIELD_LABELS[path];
  if (exact) return exact;

  const parts = path.split('.');
  const lastPart = parts[parts.length - 1] || path;
  return lastPart
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
};

const ERROR_FLASH_CLASS = 'field-error-flash';
let errorFlashTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * Scroll to an element, focus it and pulse a temporary highlight ring so
 * the user can immediately see WHICH field failed after submit.
 */
/**
 * Locates the DOM element for an error path. Tries exact name/id/data
 * attributes first, then falls back to `data-error-path` anchors —
 * including segment-prefix matches so nested paths like
 * `variants.colorMeta.Red.images` land on their color row and
 * `sizes.0.bodyMeasurements.0.value` lands on the `sizes` container.
 */
const locateErrorElement = (path: string): HTMLElement | null => {
  const selectors = [
    `[name="${path}"]`,
    `#${CSS.escape(path)}`,
    `[data-field-name="${path}"]`,
    `[name="${path.replace(/\.\d+/g, '')}"]`,
  ];

  for (const selector of selectors) {
    try {
      const found = document.querySelector<HTMLElement>(selector);
      if (found) return found;
    } catch (_err) {
      // Ignore querySelector syntax errors on complex paths
    }
  }

  // data-error-path: exact match, then nearest ancestor-ish prefix
  const anchored = Array.from(document.querySelectorAll<HTMLElement>('[data-error-path]'));
  if (anchored.length > 0) {
    for (const node of anchored) {
      if (node.dataset.errorPath === path) return node;
    }
    const segments = path.split('.');
    while (segments.length > 1) {
      segments.pop();
      const prefix = segments.join('.');
      for (const node of anchored) {
        if (node.dataset.errorPath?.startsWith(`${prefix}.`)) return node;
      }
      // A node whose anchor IS the prefix is the container this error lives
      // under (`sizes.0.bodyMeasurements.0.value` → the `sizes` table). The
      // strictly-longer check above can never see it, so a nested path under a
      // container used to resolve to nothing and fall back to the section
      // anchor. Checked only after the longer match for the same prefix, so
      // every case that already resolved resolves to the same element.
      for (const node of anchored) {
        if (node.dataset.errorPath === prefix) return node;
      }
    }
  }

  return null;
};

const flashAndFocusElement = (element: HTMLElement) => {
  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  if (typeof element.focus === 'function') {
    element.focus({ preventScroll: true });
  }

  element.classList.add(ERROR_FLASH_CLASS);
  if (errorFlashTimer) clearTimeout(errorFlashTimer);
  errorFlashTimer = setTimeout(() => {
    document
      .querySelectorAll(`.${ERROR_FLASH_CLASS}`)
      .forEach((node) => node.classList.remove(ERROR_FLASH_CLASS));
    errorFlashTimer = undefined;
  }, 1800);
};

export const focusFirstError = (
  errors: FieldErrors<Record<string, unknown>>,
  fallbackAnchorId?: string,
): FlatFormError | undefined => {
  const flat = flattenFormErrors(errors);
  if (flat.length === 0) return undefined;

  const firstError = flat[0];
  const { path } = firstError;

  const targetElement = locateErrorElement(path);

  if (targetElement) {
    flashAndFocusElement(targetElement);
  } else if (fallbackAnchorId) {
    const sectionElem = document.getElementById(fallbackAnchorId);
    sectionElem?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return firstError;
};

export const focusMissingField = (
  fieldNameOrPath: string,
  fallbackAnchorId?: string,
): HTMLElement | null => {
  const targetElement = locateErrorElement(fieldNameOrPath);

  if (targetElement) {
    flashAndFocusElement(targetElement);
    return targetElement;
  }

  if (fallbackAnchorId) {
    const sectionElem = document.getElementById(fallbackAnchorId);
    sectionElem?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return null;
};
