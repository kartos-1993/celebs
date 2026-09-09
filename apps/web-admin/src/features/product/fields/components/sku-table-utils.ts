import type { ScopeOption, VariantSelection } from './sku-table-types';

export function sanitize(s: string): string {
  return String(s)
    .replace(/\./g, '_')
    .replace(/\[/g, '(')
    .replace(/\]/g, ')')
    .replace(/\s+/g, ' ')
    .trim();
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
    return k === aKey && v === aVal;
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
    for (const a of variants[0].values) {
      for (const b of variants[1].values) {
        opts.push({
          value: `${variants[0].key}::${a}||${variants[1].key}::${b}`,
          label: `${variants[0].label}: ${labelOf(variants[0].key, a)} × ${variants[1].label}: ${labelOf(variants[1].key, b)}`,
        });
      }
    }
  }
  return opts;
}
