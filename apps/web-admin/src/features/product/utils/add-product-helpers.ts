import type { FieldSpec } from '../fields/ui-registry';
import type { PageSectionKey } from '../types';
export type { PageSectionKey } from '../types';

export const MANAGE_PRODUCTS_PATH = '/products/manage';
export const DRAFT_STORAGE_KEY = 'web-admin.product-draft.add';

export const getDraftStorageKey = (userId?: string): string =>
  userId ? `${DRAFT_STORAGE_KEY}.${userId}` : DRAFT_STORAGE_KEY;

export const normalizeText = (value: unknown): string =>
  value !== null && value !== undefined ? String(value).trim() : '';

export const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeText(entry)).filter(Boolean);
  }

  const text = normalizeText(value);
  return text ? [text] : [];
};

export const toPositiveNumber = (value: unknown): number | undefined => {
  const raw = String(value ?? '').trim();
  if (!raw) return undefined;

  const numeric = Number(raw);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : undefined;
};

export const toNonNegativeInteger = (value: unknown): number | undefined => {
  const raw = String(value ?? '').trim();
  if (!raw) return undefined;

  const numeric = Number(raw);
  return Number.isFinite(numeric) && numeric >= 0 ? Math.trunc(numeric) : undefined;
};

export const serializeDynamicValue = (value: unknown): unknown => {
  if (value instanceof File) {
    return {
      name: value.name,
      size: value.size,
      type: value.type,
    };
  }

  if (Array.isArray(value)) {
    return value.map((entry) => serializeDynamicValue(entry));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        serializeDynamicValue(entry),
      ]),
    );
  }

  return value;
};

export const serializeDraftValue = (value: unknown): unknown => {
  if (value instanceof File) {
    return undefined;
  }

  if (Array.isArray(value)) {
    const next = value
      .map((entry) => serializeDraftValue(entry))
      .filter((entry) => typeof entry !== 'undefined');
    return next;
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .map(([key, entry]) => [key, serializeDraftValue(entry)])
        .filter(([, entry]) => typeof entry !== 'undefined'),
    );
  }

  return value;
};

export const isHexColor = (value: string): boolean =>
  /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);

export const flattenObject = (obj: unknown, prefix = ''): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  if (!obj || typeof obj !== 'object') return result;

  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof File)) {
      Object.assign(result, flattenObject(value, newKey));
    } else {
      result[newKey] = value;
    }
  }
  return result;
};

export const getNestedValue = (obj: unknown, path: string): unknown => {
  return path.split('.').reduce<unknown>((acc, part) => {
    return acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[part] : undefined;
  }, obj);
};

export const getFirstPrice = (
  values: Record<string, unknown>,
  suffix: '.price' | '.specialPrice',
): number | undefined => {
  const flat = flattenObject(values);
  const preferredKeys = [
    `sku.default${suffix}`,
    ...Object.keys(flat)
      .filter((key) => key.startsWith('sku.variants.') && key.endsWith(suffix))
      .sort(),
  ];

  for (const key of preferredKeys) {
    const numeric = toPositiveNumber(flat[key]);
    if (numeric !== undefined) {
      return numeric;
    }
  }

  return undefined;
};

export const getLabelMap = (fields: FieldSpec[], fieldName?: string): Map<string, string> => {
  if (!fieldName) {
    return new Map<string, string>();
  }

  const field = fields.find((entry) => entry.name === fieldName);
  if (!field || !Array.isArray(field.dataSource)) {
    return new Map<string, string>();
  }

  return new Map<string, string>(
    field.dataSource
      .filter(
        (option): option is { value: string; label: string } =>
          Boolean(option?.value) && Boolean(option?.label),
      )
      .map((option) => [String(option.value), String(option.label)]),
  );
};

export const normalizeGroup = (value?: string): string =>
  (value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');

export const mapSchemaGroup = (value?: string): string => {
  const normalized = normalizeGroup(value);

  if (['base', 'productimages', 'images', 'mainimage', 'media'].includes(normalized)) {
    return 'base';
  }
  if (
    [
      'details',
      'productspecification',
      'specification',
      'attributes',
      'basic',
      'basicinfo',
      'general',
      'info',
      'title',
      'productname',
      'brand',
    ].includes(normalized)
  ) {
    return 'details';
  }
  if (
    ['variant', 'variants', 'variant1', 'variant2', 'sku', 'color', 'size'].includes(normalized)
  ) {
    return 'variant';
  }
  if (['sale', 'pricestock', 'priceandstock', 'pricing', 'stock'].includes(normalized)) {
    return 'sale';
  }
  if (['package', 'shippingandwarranty', 'shipping', 'warranty'].includes(normalized)) {
    return 'package';
  }
  if (['termcondition', 'termsandconditions', 'terms'].includes(normalized)) {
    return 'termcondition';
  }

  return normalized || 'details';
};

export const isFieldFilled = (field: FieldSpec, value: unknown): boolean => {
  const uiType = normalizeGroup(field.uiType);

  if (uiType === 'switch') {
    return value !== undefined && value !== null;
  }

  if (
    uiType === 'multiselect' ||
    uiType === 'variantlist' ||
    uiType === 'mainimage' ||
    uiType === 'colorinline' ||
    uiType === 'colormeta'
  ) {
    return Array.isArray(value) ? value.length > 0 : false;
  }

  if (uiType === 'skutablev2') {
    return true;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value);
  }

  return normalizeText(value).length > 0;
};

export const uniqueMessages = (messages: string[]): string[] =>
  Array.from(new Set(messages.filter(Boolean)));

export const resolveSchemaFieldForPath = (
  schemaFields: FieldSpec[],
  path: string,
): FieldSpec | undefined => {
  const parts = path.split('.');

  for (let index = parts.length; index > 0; index -= 1) {
    const candidate = parts.slice(0, index).join('.');
    const match = schemaFields.find((field) => field.name === candidate);
    if (match) {
      return match;
    }
  }

  return undefined;
};

export const resolvePageSectionKey = (path: string, schemaFields: FieldSpec[]): PageSectionKey => {
  if (['name', 'brand', 'description', 'categoryId', 'subcategoryId'].includes(path)) {
    return 'basic';
  }

  if (path.startsWith('mainImage')) {
    return 'images';
  }

  if (path.startsWith('sku.')) {
    return 'pricing';
  }

  const matchedField = resolveSchemaFieldForPath(schemaFields, path);
  const group = mapSchemaGroup(matchedField?.group);

  switch (group) {
    case 'base':
      return 'images';
    case 'details':
      return 'specification';
    case 'variant':
    case 'sale':
      return 'pricing';
    case 'package':
      return 'shipping';
    case 'termcondition':
      return 'terms';
    default:
      return 'specification';
  }
};
