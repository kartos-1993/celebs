import { defaultSkuPath, getNestedValue, variantSkuPath } from '../../utils/add-product-helpers';

import { collectVariantCombos, comboMatchesScope } from './apply-sku-scope';
import type { ScopeOption, SkuFieldItem, VariantSelection } from './sku-table-types';

export {
  APPLY_ALL_FIELD_NAMES,
  collectApplyAssignments,
  collectApplyPaths,
  countBlankSkuCodes,
  fillMissingSkuCodes,
  parseVariantAxesResponse,
} from './apply-sku-scope';
export type { SkuFieldItem } from './sku-table-types';

/** `sku.variants.*` path builder — see `variantSkuPath` for the single encoder. */
export const pathFor = variantSkuPath;

export function matchesScope(
  applyScope: string,
  aKey: string,
  aVal: string,
  bKey?: string,
  bVal?: string,
): boolean {
  const combo = bKey === undefined || bVal === undefined ? [aKey, aVal] : [aKey, aVal, bKey, bVal];
  return comboMatchesScope(combo, applyScope);
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

/**
 * sellerSku-scoped by contract. The only consumers are the SKU auto-generate
 * flow and the "missing SKU" button state in `use-sku-table`, and both need the
 * sellerSku path plus the ordered option values used to build a retail code.
 *
 * price / specialPrice / stock / freeItems are deliberately NOT tracked here:
 * `collectPricingErrors` validates each of them per matrix row and
 * `buildPayloadSkus` reads them from the same `pathFor` prefixes, so widening
 * this helper to "every editable cell" would duplicate both and put cell
 * ownership in two places. Generalizes to N axes via `collectVariantCombos`.
 */
export function collectSellerSkuItems(variants: VariantSelection[]): SkuFieldItem[] {
  const combos = collectVariantCombos(variants);
  if (combos.length === 0) {
    return [{ path: defaultSkuPath('sellerSku'), options: [] }];
  }
  return combos.map((combo) => {
    const options: string[] = [];
    for (let index = 1; index < combo.length; index += 2) {
      options.push(combo[index]);
    }
    return { path: pathFor(...combo, 'sellerSku'), options };
  });
}

/** Historical alias for {@link collectSellerSkuItems}. */
export const collectSkuItems = collectSellerSkuItems;

/**
 * Kept intentionally ( review): covered by `__tests__/sku-table-utils.spec.ts`
 * and reserved for consumers that need paths without item options. Prod currently
 * inlines the equivalent via `collectSkuItems(variants).map((item) => item.path)`
 * in `use-sku-table.ts`; do not remove one without the other.
 */
export function collectSkuPaths(variants: VariantSelection[]): string[] {
  return collectSellerSkuItems(variants).map((item) => item.path);
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

/** Unified with `add-product-helpers` — the flat-key-aware reader is the only one. */
export { getNestedValue };

export function isSkuFieldLocked(
  status: string | undefined,
  defaultValues: Record<string, unknown> | undefined,
  path: string,
): boolean {
  if (status !== 'published') return false;
  const originalSku = getNestedValue(defaultValues, path);
  return typeof originalSku === 'string' && originalSku.trim().length > 0;
}
