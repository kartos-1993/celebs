import { buildProductStyleRef, generateRetailSku } from '@celebs/shared-utils';

import { normalizeText, skuVariantPath } from '../../utils/add-product-helpers';

import type {
  ApplyAllState,
  SkuFieldItem,
  VariantMetaItem,
  VariantSelection,
} from './sku-table-types';

/**
 * Cells the batch-apply bar may write. `freeItems`/`available` are
 * intentionally absent: `skuItemSchema` (shared-types) has no such keys and
 * no API/Prisma column exists for them, so writing them produced form state
 * the payload could never persist. One direction — batch apply never touches
 * them, `buildPayloadSkus` never reads them, and `ApplyAllState` no longer
 * carries them.
 */
export const APPLY_ALL_FIELD_NAMES = ['price', 'specialPrice', 'stock', 'sellerSku'] as const;

export type ApplyAllFieldName = (typeof APPLY_ALL_FIELD_NAMES)[number];

export interface SkuPathAssignment {
  path: string;
  value: string;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

/** `'ALL'` means "no constraint"; every other scope is a list of `key::value` pairs. */
export function parseScopePairs(applyScope: string): Array<[string, string]> {
  if (applyScope === 'ALL') return [];
  return applyScope.split('||').map((part) => {
    const [key = '', value = ''] = part.split('::');
    return [key, value];
  });
}

/** A combo matches when it carries every pair the scope constrains (order-free). */
export function comboMatchesScope(combo: string[], applyScope: string): boolean {
  const pairs = parseScopePairs(applyScope);
  if (pairs.length === 0) return true;
  const present = new Set<string>();
  for (let index = 0; index + 1 < combo.length; index += 2) {
    present.add(`${combo[index]}::${combo[index + 1]}`);
  }
  return pairs.every(([key, value]) => present.has(`${key}::${value}`));
}

/**
 * Row-major cross product of every live axis, flattened to interleaved
 * `[key, value, key, value, …]` path segments. Generalizes to N axes, so a
 * third axis is never silently dropped.
 */
export function collectVariantCombos(variants: VariantSelection[]): string[][] {
  const live = variants.filter((axis) => axis.values.length > 0);
  if (live.length === 0) return [];
  return live.reduce<string[][]>(
    (acc, axis) =>
      acc.flatMap((prefix) => axis.values.map((value) => [...prefix, axis.key, value])),
    [[]],
  );
}

/** Every in-scope variant combo, already filtered by the batch-apply scope. */
export function collectApplyPaths(variants: VariantSelection[], applyScope: string): string[][] {
  return collectVariantCombos(variants).filter((combo) => comboMatchesScope(combo, applyScope));
}

/**
 * Single source of truth for what "Apply to Selected" writes: one field-name
 * loop over one computed path, replacing the duplicated 1-axis/2-axis blocks.
 */
export function collectApplyAssignments(
  variants: VariantSelection[],
  applyScope: string,
  applyAll: ApplyAllState,
): SkuPathAssignment[] {
  const assignments: SkuPathAssignment[] = [];
  for (const combo of collectApplyPaths(variants, applyScope)) {
    for (const fieldName of APPLY_ALL_FIELD_NAMES) {
      const value = applyAll[fieldName];
      if (!value) continue;
      assignments.push({ path: skuVariantPath(...combo, fieldName), value });
    }
  }
  return assignments;
}

export function normalizeVariantMetaItem(raw: unknown): VariantMetaItem {
  const source = asRecord(raw) ?? {};
  return {
    key: firstText(source.key, source.name, source.value),
    label: firstText(source.label, source.name, source.key, source.value),
  };
}

function firstText(...candidates: unknown[]): string {
  for (const candidate of candidates) {
    if (candidate !== undefined && candidate !== null) return String(candidate);
  }
  return '';
}

function toAxisValue(entry: unknown): string {
  if (typeof entry === 'string') return entry;
  const source = asRecord(entry);
  if (source) return String(source.value ?? source.label ?? entry);
  return String(entry);
}

/** Accepts arrays, comma-joined strings, and object options from any variant input. */
export function toVariantSelection(axis: VariantMetaItem, watched: unknown): VariantSelection {
  if (Array.isArray(watched)) {
    return { ...axis, values: watched.map(toAxisValue) };
  }
  if (typeof watched === 'string' && watched) {
    const parts = watched
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
    return { ...axis, values: parts.length ? parts : [watched] };
  }
  return { ...axis, values: [] };
}

const UNEXPECTED_SHAPE_MESSAGE =
  'Variant axis fetch returned an unexpected variant API shape: expected { variants: Axis[] } ' +
  'or { axes: Axis[] } (optionally nested under `data`), or a bare Axis[].';

const NOT_AN_ARRAY_MESSAGE =
  'Variant axis fetch returned a "variants"/"axes" field that is not an array — ' +
  'expected an array of { key, label } axes.';

function declaredAxesList(envelope: Record<string, unknown>): unknown {
  const data = asRecord(envelope.data);
  return envelope.variants ?? envelope.axes ?? data?.variants ?? data?.axes;
}

/**
 * Explicit envelope validation (web-admin AGENTS.md §8 bans `??` cascades):
 * every known envelope is accepted, anything else throws with the shape it saw
 * instead of silently degrading to an empty axis list.
 */
export function parseVariantAxesResponse(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  const envelope = asRecord(raw);
  if (!envelope) throw new Error(UNEXPECTED_SHAPE_MESSAGE);
  if (Array.isArray(envelope.data)) return envelope.data;

  const declared = declaredAxesList(envelope);
  if (declared === undefined) throw new Error(UNEXPECTED_SHAPE_MESSAGE);
  if (!Array.isArray(declared)) throw new Error(NOT_AN_ARRAY_MESSAGE);
  return declared;
}

/** Blank-or-missing count behind the "Generate Missing (n)" button label. */
export function countBlankSkuCodes(
  paths: string[],
  read: (path: string, index: number) => unknown,
): number {
  let missing = 0;
  paths.forEach((path, index) => {
    if (normalizeText(read(path, index))) return;
    missing += 1;
  });
  return missing;
}

export interface FillSkuCodesOptions {
  items: SkuFieldItem[];
  /**
   * Indexed exactly like `countBlankSkuCodes`'s reader, and it MUST be the same
   * reader: the button label is computed from the watched SKU paths while the
   * fill used to read `form.getValues`, so a cell the label counted as filled
   * still looked blank to the fill and got a second, generated code.
   */
  read: (path: string, index: number) => unknown;
  write: (path: string, value: string) => void;
  /** Cells this returns `false` for are left exactly as they are. */
  canWrite?: (item: SkuFieldItem, index: number) => boolean;
  brand?: string;
  productName?: string;
  storeCode?: string;
}

/**
 * Fills only the blank sellerSku cells; existing codes are never touched.
 *
 * A cell is left alone when it already carries a code, when `canWrite` refuses
 * it (a `readOnly`/locked cell on a published product), or when the reader says
 * its value is blank whitespace. A refused cell is not counted as filled, so the
 * caller's return value stays "how many cells this action actually wrote".
 */
export function fillMissingSkuCodes({
  items,
  read,
  write,
  canWrite,
  brand = 'CLB',
  productName = 'ITEM',
  storeCode,
}: FillSkuCodesOptions): number {
  const styleRef = buildProductStyleRef(normalizeText(productName) || 'ITEM');
  const brandToken = normalizeText(brand) || 'CLB';
  let filled = 0;
  items.forEach((item, index) => {
    if (normalizeText(read(item.path, index))) return;
    if (canWrite && !canWrite(item, index)) return;
    write(item.path, generateRetailSku({ brandToken, storeCode, styleRef, options: item.options }));
    filled += 1;
  });
  return filled;
}
