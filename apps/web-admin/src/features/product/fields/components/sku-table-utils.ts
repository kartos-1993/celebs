import { sanitizeVariantKey } from '../../utils/add-product-helpers';

import type { ScopeOption, VariantSelection } from './sku-table-types';

export function sanitize(s: string): string {
  return sanitizeVariantKey(s);
}

export function pathFor(...parts: string[]): string {
  return ['sku', 'variants', ...parts.map(sanitize)].join('.');
}

export function matchesScope(
  applyScope: string,
  aKey: string,
  aVal: string,
  bKey?: string,
  bVal?: string,
): boolean {
  if (applyScope === 'ALL') return true;
  if (!applyScope.includes('||')) {
    const [k, v] = applyScope.split('::');
    return (k === aKey && v === aVal) || (k === bKey && v === bVal);
  }
  const [p1, p2] = applyScope.split('||');
  const [k1, v1] = p1.split('::');
  const [k2, v2] = p2.split('::');
  return (
    (k1 === aKey && v1 === aVal && k2 === bKey && v2 === bVal) ||
    (k2 === aKey && v2 === aVal && k1 === bKey && v1 === bVal)
  );
}

export function buildScopeOptions(
  variants: VariantSelection[],
  labelOf: (axisKey: string, value: string) => string,
): ScopeOption[] {
  const opts: ScopeOption[] = [{ value: 'ALL', label: 'All Variants' }];
  if (variants.length === 1) {
    for (const v of variants[0].values) {
      opts.push({
        value: `${variants[0].key}::${v}`,
        label: `${variants[0].label}: ${labelOf(variants[0].key, v)}`,
      });
    }
  } else if (variants.length >= 2) {
    const axis1 = variants[0];
    const axis2 = variants[1];

    // 1. Per primary axis (e.g. Color: Red (All Sizes))
    for (const a of axis1.values) {
      opts.push({
        value: `${axis1.key}::${a}`,
        label: `${axis1.label}: ${labelOf(axis1.key, a)} (All ${axis2.label}s)`,
      });
    }

    // 2. Per secondary axis (e.g. Size: M (All Colors))
    for (const b of axis2.values) {
      opts.push({
        value: `${axis2.key}::${b}`,
        label: `${axis2.label}: ${labelOf(axis2.key, b)} (All ${axis1.label}s)`,
      });
    }

    // 3. Individual combinations (e.g. Red × M)
    for (const a of axis1.values) {
      for (const b of axis2.values) {
        opts.push({
          value: `${axis1.key}::${a}||${axis2.key}::${b}`,
          label: `${labelOf(axis1.key, a)} × ${labelOf(axis2.key, b)}`,
        });
      }
    }
  }
  return opts;
}

export function collectSkuPaths(variants: VariantSelection[]): string[] {
  if (variants.length === 0) {
    return ['sku.default.sellerSku'];
  }
  if (variants.length === 1) {
    return variants[0].values.map((v) => pathFor(variants[0].key, v, 'sellerSku'));
  }
  const paths: string[] = [];
  for (const a of variants[0].values) {
    for (const b of variants[1].values) {
      paths.push(pathFor(variants[0].key, a, variants[1].key, b, 'sellerSku'));
    }
  }
  return paths;
}

export interface SkuButtonState {
  label: string;
  isDisabled: boolean;
  icon: 'check' | 'sparkles';
  tooltip: string;
}

export function getSkuButtonState(total: number, missing: number): SkuButtonState {
  if (total === 0 || missing === 0) {
    return {
      label: 'All SKUs Assigned',
      isDisabled: true,
      icon: 'check',
      tooltip: 'All variants already have assigned SKUs.',
    };
  }
  if (missing === total) {
    return {
      label: 'Auto-Generate SKUs',
      isDisabled: false,
      icon: 'sparkles',
      tooltip: 'Automatically generate collision-proof SKUs for all variants.',
    };
  }
  return {
    label: `Generate Missing (${missing})`,
    isDisabled: false,
    icon: 'sparkles',
    tooltip: `Fills collision-proof SKUs for ${missing} variant(s) without a code. Existing SKUs are preserved.`,
  };
}

export function getNestedValue(obj: unknown, path: string): unknown {
  if (!obj || typeof obj !== 'object') return undefined;
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (!current || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

export function isSkuFieldLocked(
  status: string | undefined,
  defaultValues: Record<string, unknown> | undefined,
  path: string,
): boolean {
  if (status !== 'published') return false;
  const originalSku = getNestedValue(defaultValues, path);
  return typeof originalSku === 'string' && originalSku.trim().length > 0;
}
