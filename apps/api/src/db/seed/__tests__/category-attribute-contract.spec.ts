import { attributeSchema } from '@celebs/shared-types';
import { describe, expect, it } from 'vitest';

import {
  ALL_MEN_CATEGORIES_TREE,
  type SeedCategory,
  mkAttr as buildMenAttr,
} from '../seed-categories-men';
import { JEWELRY_ACCESSORIES_TREE, mkAttr as buildJewelryAttr } from '../seed-categories-jewelry';
import { DEFAULT_OPTION_SETS } from '../seed-option-sets';

/**
 * The canonical attribute contract: everything the seed writers persist must
 * validate against the shared attributeSchema, and every standard-option link
 * must resolve to a seeded option set by name.
 *
 * This matters because schema-composer resolves optionSetName before the
 * Color/Size name heuristics — a typo or a dropped field silently maps a
 * variant axis to the wrong value list (e.g. shoe "Size" falling back to
 * Alpha Sizes instead of Shoe Sizes).
 */
const optionSetIdByName = new Map(
  DEFAULT_OPTION_SETS.map((set) => [set.name, `seeded:${set.name}`]),
);

function walk(node: SeedCategory, visit: (node: SeedCategory) => void): void {
  visit(node);
  for (const child of node.children ?? []) walk(child, visit);
}

describe('Category seed attribute contract', () => {
  it('normalizes every seeded attribute into the canonical attributeSchema shape', () => {
    const failures: string[] = [];

    walk(ALL_MEN_CATEGORIES_TREE, (node) => {
      for (const attr of node.attributes ?? []) {
        const result = attributeSchema.safeParse(buildMenAttr(attr, optionSetIdByName));
        if (!result.success) {
          const issues = result.error.issues.map((issue) => issue.message).join('; ');
          failures.push(`${node.name} → ${attr.name}: ${issues}`);
        }
      }
    });

    walk(JEWELRY_ACCESSORIES_TREE, (node) => {
      for (const attr of node.attributes ?? []) {
        const result = attributeSchema.safeParse(buildJewelryAttr(attr));
        if (!result.success) {
          const issues = result.error.issues.map((issue) => issue.message).join('; ');
          failures.push(`${node.name} → ${attr.name}: ${issues}`);
        }
      }
    });

    expect(failures).toEqual([]);
  });

  it('resolves every useStandardOptions link to a seeded option set name', () => {
    const unknown: string[] = [];

    walk(ALL_MEN_CATEGORIES_TREE, (node) => {
      for (const attr of node.attributes ?? []) {
        if (
          attr.useStandardOptions &&
          attr.optionSetName &&
          !optionSetIdByName.has(attr.optionSetName)
        ) {
          unknown.push(`${node.name} → ${attr.name} → ${attr.optionSetName}`);
        }
      }
    });

    expect(unknown).toEqual([]);
  });

  it('keeps variant axes linked to their explicit option set through normalization', () => {
    const lost: string[] = [];

    walk(ALL_MEN_CATEGORIES_TREE, (node) => {
      for (const attr of node.attributes ?? []) {
        if (!attr.optionSetName) continue;
        const normalized = buildMenAttr(attr, optionSetIdByName);
        const keepsName = normalized.optionSetName === attr.optionSetName;
        const keepsId = normalized.optionSetId === `seeded:${attr.optionSetName}`;
        if (!keepsName || !keepsId) {
          lost.push(`${node.name} → ${attr.name}`);
        }
      }
    });

    expect(lost).toEqual([]);
  });

  it('every leaf category declares at least one attribute', () => {
    const bare: string[] = [];

    for (const tree of [ALL_MEN_CATEGORIES_TREE, JEWELRY_ACCESSORIES_TREE]) {
      walk(tree, (node) => {
        const isLeaf = !node.children || node.children.length === 0;
        if (isLeaf && (!node.attributes || node.attributes.length === 0)) {
          bare.push(node.name);
        }
      });
    }

    expect(bare).toEqual([]);
  });
});
