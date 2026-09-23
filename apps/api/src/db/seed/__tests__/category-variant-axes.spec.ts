import { describe, expect, it } from 'vitest';

import { ALL_MEN_CATEGORIES_TREE, type SeedAttr, type SeedCategory } from '../seed-categories-men';
import { JEWELRY_ACCESSORIES_TREE } from '../seed-categories-jewelry';

/**
 * Guards the pricing-matrix invariant at the source: no category may declare
 * more than two variant axes. Three axes (e.g. Color + Size + Waist Size)
 * permanently block submit, so this fails the suite instead of sellers.
 * Mirrors extractVariantsMeta() + mkAttr() grouping exactly.
 */
function variantAxesOf(attrs: SeedAttr[] | undefined): string[] {
  return (attrs ?? [])
    .map((a) => {
      const group = a.group ? a.group : a.isVariant ? 'variant' : 'details';
      const uiType =
        a.isVariant && (a.variantType === 'color' || a.variantType === 'size')
          ? 'multiselect'
          : a.type;
      return { name: a.name, group, uiType };
    })
    .filter(
      (f) =>
        String(f.group).toLowerCase().includes('variant') &&
        ['select', 'multiselect', 'VariantList'].includes(String(f.uiType)),
    )
    .map((f) => f.name);
}

function walk(node: SeedCategory, visit: (node: SeedCategory) => void): void {
  visit(node);
  for (const child of node.children ?? []) walk(child, visit);
}

describe('Category seed variant-axis budget', () => {
  it('declares at most two variant axes per category across all seed trees', () => {
    const offenders: string[] = [];
    for (const tree of [ALL_MEN_CATEGORIES_TREE, JEWELRY_ACCESSORIES_TREE]) {
      walk(tree, (node) => {
        const axes = variantAxesOf(node.attributes);
        if (axes.length > 2) {
          offenders.push(`${node.name}: ${axes.join(' + ')}`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });
});
