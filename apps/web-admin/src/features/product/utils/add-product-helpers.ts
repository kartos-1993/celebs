import type { FieldSpec } from '../fields/ui-registry';
import type { PageSectionKey } from '../types';
export type { PageSectionKey } from '../types';

export const MANAGE_PRODUCTS_PATH = '/products/manage';
export const DRAFT_STORAGE_KEY = 'web-admin.product-draft.add';
export const DRAFT_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export const getDraftStorageKey = (userId?: string, storeId?: string): string => {
  const userPart = userId?.trim() ? `.${userId.trim()}` : '';
  const storePart = storeId?.trim() ? `.${storeId.trim()}` : '';
  return `${DRAFT_STORAGE_KEY}${userPart}${storePart}`;
};

export const isDraftExpired = (savedAt?: string, ttlMs: number = DRAFT_TTL_MS): boolean => {
  if (!savedAt) return false;
  const ts = Date.parse(savedAt);
  if (Number.isNaN(ts)) return true;
  return Date.now() - ts > ttlMs;
};

export const normalizeText = (value: unknown): string =>
  value !== null && value !== undefined ? String(value).trim() : '';

export function checkProductFormHasData(v: Record<string, unknown> | undefined): boolean {
  if (!v) return false;
  const hasTxt = (s: unknown) => typeof s === 'string' && s.trim().length > 0;
  const hasArr = (a: unknown) => Array.isArray(a) && a.length > 0;
  const hasObj = (o: unknown) => o !== null && typeof o === 'object' && Object.keys(o).length > 0;
  return Boolean(
    hasTxt(v.name) ||
      hasTxt(v.brand) ||
      hasTxt(v.description) ||
      hasArr(v.mainImage) ||
      hasArr(v.mainImages) ||
      hasArr(v.variants) ||
      (v.price !== undefined && v.price !== '' && v.price !== null) ||
      hasObj(v.sku) ||
      hasObj(v.attributes),
  );
}

/** Single gallery-emptiness predicate shared by fields and collectors. */
export function isGalleryFilled(images: unknown): boolean {
  return Array.isArray(images) && images.length > 0;
}

/**
 * Single key encoding for variant path segments (dots/brackets break RHF
 * dot-path lookups). Writers (skuVariantPath) and readers (validation, payload)
 * must all go through this — never hand-roll the replacement inline.
 *
 * CASE IS DELIBERATELY PRESERVED. `buildVariantKey` (shared-utils) lowercases
 * and sorts because it is a backend *matching* key; this is a form *path*
 * segment, and the paths already stored by hydrate/sku-table readers are
 * case-sensitive (`sku.variants.Color.Red.stock`). Lowercasing here would
 * orphan every live path. The two encoders must not be "unified" onto a
 * shared case rule.
 */
export function sanitizeVariantKey(segment: string): string {
  return String(segment)
    .replace(/\./g, '_')
    .replace(/\[/g, '(')
    .replace(/\]/g, ')')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Single builder for `sku.default.*` form paths so readers never compare
 * raw dotted literals across files. Returns the identical strings.
 */
export function defaultSkuPath(field: string): string {
  return `sku.default.${field}`;
}

/**
 * Single builder for `sku.variants.*` form paths. Re-exported from
 * `sku-table-utils` as `skuVariantPath`, and consumed directly by the batch-apply
 * path builder so both writers can never drift.
 */
export function skuVariantPath(...parts: string[]): string {
  return ['sku', 'variants', ...parts.map(sanitizeVariantKey)].join('.');
}

/** A declared SKU-matrix axis, as the schema or a stored record spells it. */
export interface SkuAxisDescriptor {
  key?: string;
  kind?: string;
}

/**
 * The axis keys a `sku.variants.*` path is built from, in the order the cells
 * walk them, plus the two axes the legacy column fallbacks need.
 */
export interface SkuMatrixAxes {
  /** Declared axis keys in declaration order — the cell path's segment order. */
  keys: string[];
  /** The colour axis, for the pre-`selectedOptions` `colorVariantName` column. */
  color?: string;
  /** The size axis, for the pre-`selectedOptions` `size` column. */
  size?: string;
}

/** Declared axes with blank keys dropped — a stored record can carry junk. */
function declaredAxes(
  axes: ReadonlyArray<SkuAxisDescriptor | null | undefined>,
): Array<{ key: string; kind?: string }> {
  return axes
    .map((axis) => ({ key: normalizeText(axis?.key), kind: axis?.kind }))
    .filter((axis) => axis.key !== '');
}

const keyOfKind = (
  axes: ReadonlyArray<{ key: string; kind?: string }>,
  kind: string,
): string | undefined => axes.find((axis) => axis.kind === kind)?.key;

/**
 * The ONE resolver for "which axes does this product's matrix have", shared by
 * the writer (`hydrateProductForm`) and the reader (`buildProductPayload`).
 *
 * It exists because a matrix path is only correct if the writer emits the SAME
 * segments the cells registered, and the cells build theirs from the axis keys
 * the schema declares — in declaration order, via `skuVariantPath`. So the
 * writer must not go looking for the literals `Color`/`Size`, and it must not
 * invent its own order: both sides read `keys` here.
 *
 * `kind` wins when the declaration carries it (`dynamicData.variantFields` does,
 * and that is the persisted authority). When it does not — `buildProductPayload`
 * only receives `FieldSpec[]`, whose `kind` is inferred from the axis NAME by
 * `detectVariantKind`, and an axis named `Shade` or `Length` is inferred as
 * `'other'` — the first two declared axes take the colour/size slots. That
 * positional fallback is not a second opinion: it is the same contract the cell
 * side already relies on, where `variants[0]` is the primary axis and
 * `variants[1]` the secondary (`buildScopeOptions`, `collectVariantCombos`).
 *
 * `defaultKeys` is the fallback for a product that declares NO axis at all
 * (`buildPayloadSkus` has always stored `selectedOptions: { Color, Size }`, so
 * those are the keys its rows are actually under).
 */
export function resolveMatrixAxes(
  axes: ReadonlyArray<SkuAxisDescriptor | null | undefined>,
  defaultKeys: readonly string[] = [],
): SkuMatrixAxes {
  const declared = declaredAxes(axes);
  const keys = declared.length > 0 ? declared.map((axis) => axis.key) : [...defaultKeys];
  return {
    keys,
    color: keyOfKind(declared, 'color') ?? keys[0],
    size: keyOfKind(declared, 'size') ?? keys[1],
  };
}

/**
 * The ONE dotted-path → nested-object writer. Every form-value writer routes
 * its paths through here so no value is ever stored under a literal dotted key.
 *
 * That invariant is load-bearing, not cosmetic: React Hook Form resolves a
 * registered `useController` name (`sku.variants.Color.Blue.Size.M.price`) by
 * NESTED lookup, so a flat sibling copy of the same logical field is invisible
 * to the cell. It used to be worse than invisible — `getNestedValue` was
 * flat-first, so the hydration copy won over the value the seller just typed and
 * the payload shipped the stored number. Nested-only writers plus
 * {@link flattenObject} as the single boundary flatten make that shape
 * unrepresentable.
 */
export function assignDeep(
  target: Record<string, unknown>,
  dottedPath: string,
  value: unknown,
): void {
  const parts = dottedPath.split('.').filter(Boolean);
  let cursor = target;
  for (const part of parts.slice(0, -1)) {
    const child = cursor[part];
    if (!child || typeof child !== 'object' || Array.isArray(child)) {
      cursor[part] = {};
    }
    cursor = cursor[part] as Record<string, unknown>;
  }
  const leaf = parts[parts.length - 1];
  if (leaf) cursor[leaf] = value;
}

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

export const extractHexColor = (value?: string): string | undefined => {
  if (!value) return undefined;
  const match = value.match(/#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/);
  return match ? match[0] : undefined;
};

export const resolveColorCode = (colorNameOrCode?: string): string => {
  if (!colorNameOrCode) return '#000000';
  const clean = colorNameOrCode.trim();
  const hex = extractHexColor(clean);
  if (hex) return hex;
  if (isHexColor(clean)) return clean;
  return clean;
};

export const isMulticolorVariant = (colorNameOrCode?: string): boolean => {
  if (!colorNameOrCode) return false;
  return /multi|rainbow|tie-?dye|floral|print|pattern|stripe|plaid/i.test(colorNameOrCode);
};

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

/**
 * Single reader for form values. The form is NESTED-only (every writer goes
 * through {@link assignDeep}), so deep traversal is the real path.
 *
 * The flat-key first branch is a tolerant legacy fallback for hand-built records
 * and flattened drafts — never for form state, where a dotted key can no longer
 * be produced. It is deliberately KEPT: removing it is not safe on this wave,
 * because `payload-builders.spec.ts` (outside this file's lane) pins the
 * flat-wins ordering directly, and a hand-flattened record is still a thing
 * callers may pass. No writer in the form write path can hit the branch, which
 * is what closes the stale-price hazard — the branch is the reason a legacy
 * record still resolves, not a second source of truth for the form.
 */
export const getNestedValue = (obj: unknown, path: string): unknown => {
  if (!obj || typeof obj !== 'object') return undefined;
  const record = obj as Record<string, unknown>;

  // 1. Legacy flat key (e.g. record['sku.default.price'] from a hand-flattened
  //    record). Unreachable from hydrated form state — see assignDeep.
  if (path in record && record[path] !== undefined && record[path] !== null) {
    return record[path];
  }

  // 2. Deep nested object traversal (e.g. record.sku.default.price)
  const nested = path.split('.').reduce<unknown>((acc, part) => {
    return acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[part] : undefined;
  }, obj);

  if (nested !== undefined && nested !== null) {
    return nested;
  }

  return undefined;
};

/**
 * Product-level price resolution, in strict priority order:
 * root value → `sku.default.*` → the first-INSERTED variant cell.
 *
 * Insertion order, never alphabetical: the flat key order of the form values
 * is the order the merchant picked the variants, so the first picked variant
 * wins. Sorting here silently made the alphabetically-first variant (e.g.
 * "Apple" over the selected-first "Zebra") define the product price.
 */
export const getFirstPrice = (
  values: Record<string, unknown>,
  suffix: '.price' | '.specialPrice',
): number | undefined => {
  const rootKey = suffix.substring(1);
  const rootVal = toPositiveNumber(values[rootKey]);
  if (rootVal !== undefined) {
    return rootVal;
  }

  const flat = flattenObject(values);
  const preferredKeys = [
    defaultSkuPath(rootKey),
    ...Object.keys(flat).filter((key) => key.startsWith('sku.variants.') && key.endsWith(suffix)),
    ...Object.keys(values).filter((key) => key.endsWith(suffix) || key.endsWith(rootKey)),
  ];

  for (const key of preferredKeys) {
    const numeric = toPositiveNumber(flat[key] ?? values[key]);
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

  // Per-color swatch/gallery rows render inside the
  // "Product Images & Swatches" section — never in pricing.
  if (path.startsWith('variants.colorMeta') || path.startsWith('colorMeta')) {
    return 'images';
  }

  if (path.startsWith('sku.') || path.startsWith('sizes') || path.startsWith('size_chart')) {
    return 'pricing';
  }

  const matchedField = resolveSchemaFieldForPath(schemaFields, path);
  const group = mapSchemaGroup(matchedField?.group);

  // Variant definition selects (color/size pickers) render in the
  // Variants card inside the base section — not in the SKU matrix.
  if (
    group === 'variant' &&
    ['multiselect', 'variantlist', 'select'].includes(
      String(matchedField?.uiType ?? '').toLowerCase(),
    )
  ) {
    return 'images';
  }

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
