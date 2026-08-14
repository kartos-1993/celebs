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
        result.push(...flattenFormErrors(value as FieldErrors<Record<string, unknown>>, currentPath));
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

export const focusFirstError = (
  errors: FieldErrors<Record<string, unknown>>,
  fallbackAnchorId?: string,
): FlatFormError | undefined => {
  const flat = flattenFormErrors(errors);
  if (flat.length === 0) return undefined;

  const firstError = flat[0];
  const { path } = firstError;

  // Attempt to locate DOM element by exact name, id, or data attribute
  const selectors = [
    `[name="${path}"]`,
    `#${CSS.escape(path)}`,
    `[data-field-name="${path}"]`,
    `[name="${path.replace(/\.\d+/g, '')}"]`,
  ];

  let targetElement: HTMLElement | null = null;

  for (const selector of selectors) {
    try {
      const found = document.querySelector<HTMLElement>(selector);
      if (found) {
        targetElement = found;
        break;
      }
    } catch (_err) {
      // Ignore querySelector syntax errors on complex paths
    }
  }

  if (targetElement) {
    targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (typeof targetElement.focus === 'function') {
      targetElement.focus({ preventScroll: true });
    }
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
  const selectors = [
    `[name="${fieldNameOrPath}"]`,
    `#${CSS.escape(fieldNameOrPath)}`,
    `[data-field-name="${fieldNameOrPath}"]`,
    `[name="${fieldNameOrPath.replace(/\.\d+/g, '')}"]`,
  ];

  let targetElement: HTMLElement | null = null;

  for (const selector of selectors) {
    try {
      const found = document.querySelector<HTMLElement>(selector);
      if (found) {
        targetElement = found;
        break;
      }
    } catch (_err) {
      // Ignore querySelector syntax errors on complex paths
    }
  }

  if (targetElement) {
    targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (typeof targetElement.focus === 'function') {
      targetElement.focus({ preventScroll: true });
    }
    return targetElement;
  }

  if (fallbackAnchorId) {
    const sectionElem = document.getElementById(fallbackAnchorId);
    sectionElem?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return null;
};

