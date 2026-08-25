import type { FieldErrors } from 'react-hook-form';

export interface FlatFormError {
  path: string;
  message: string;
}

export const flattenFormErrors = (
  errors: FieldErrors<Record<string, unknown>>,
  parentPath = '',
): FlatFormError[] => {
  const result: FlatFormError[] = [];

  for (const [key, value] of Object.entries(errors)) {
    const currentPath = parentPath ? `${parentPath}.${key}` : key;
    if (!value) continue;

    if (typeof value === 'object') {
      if ('message' in value && typeof value.message === 'string' && value.message.trim() !== '') {
        result.push({ path: currentPath, message: value.message });
      } else {
        result.push(
          ...flattenFormErrors(value as FieldErrors<Record<string, unknown>>, currentPath),
        );
      }
    }
  }

  return result;
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
  if (path.startsWith('sku.')) {
    return 'Price & Stock (SKU)';
  }
  if (path.startsWith('variants.colorMeta') || path.startsWith('colorMeta')) {
    return 'Color Images & Swatches';
  }
  if (path === 'name') return 'Product Name';
  if (path === 'brand') return 'Brand';
  if (path === 'categoryId' || path === 'subcategoryId') return 'Category';
  if (path === 'mainImage') return 'Product Images';
  if (path === 'price') return 'Regular Price';
  if (path === 'discountedPrice') return 'Special Price';

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
 * `variants.colorMeta.Red.images` land on their color row.
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
  const anchored = document.querySelectorAll<HTMLElement>('[data-error-path]');
  if (anchored.length > 0) {
    for (const node of Array.from(anchored)) {
      if (node.dataset.errorPath === path) return node;
    }
    const segments = path.split('.');
    while (segments.length > 1) {
      segments.pop();
      const prefix = segments.join('.');
      for (const node of Array.from(anchored)) {
        if (node.dataset.errorPath?.startsWith(`${prefix}.`)) return node;
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
