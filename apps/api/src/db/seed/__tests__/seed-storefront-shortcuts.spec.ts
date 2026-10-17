import { describe, expect, it } from 'vitest';

import {
  buildSubcategoryShortcutRows,
  type ShortcutSeedCategory,
} from '../seed-storefront-shortcuts';

const CATEGORIES: ShortcutSeedCategory[] = [
  { id: 'cat-men', slug: 'men', parentCategory: null },
  { id: 'cat-outerwear', slug: 'men-outerwear', parentCategory: 'cat-men' },
  { id: 'cat-jackets', slug: 'men-jackets-and-coats', parentCategory: 'cat-outerwear' },
  { id: 'cat-jeans', slug: 'men-jeans', parentCategory: 'cat-men' },
  { id: 'cat-jewelry', slug: 'jewelry-and-accessories', parentCategory: null },
];

describe('buildSubcategoryShortcutRows', () => {
  it('creates one subcategory shortcut per parent category with active children', () => {
    const rows = buildSubcategoryShortcutRows(CATEGORIES, new Set());
    expect(rows.map((row) => row.slug)).toEqual([
      'subcategories-men',
      'subcategories-men-outerwear',
    ]);
  });

  it('skips leaf categories and categories without children', () => {
    const rows = buildSubcategoryShortcutRows(CATEGORIES, new Set());
    expect(rows.some((row) => row.categoryId === 'cat-jeans')).toBe(false);
    expect(rows.some((row) => row.categoryId === 'cat-jewelry')).toBe(false);
  });

  it('leaves categories that already have a shortcut row untouched', () => {
    const rows = buildSubcategoryShortcutRows(CATEGORIES, new Set(['cat-men']));
    expect(rows.map((row) => row.categoryId)).toEqual(['cat-outerwear']);
  });

  it('writes the same config the service builds for auto-populated subcategories', () => {
    const [row] = buildSubcategoryShortcutRows(CATEGORIES, new Set());
    expect(row).toMatchObject({
      title: 'Subcategories',
      slug: 'subcategories-men',
      categoryId: 'cat-men',
      filterConfig: {
        type: 'subcategory',
        attributeId: null,
        displayAs: 'avatar_scroll',
        items: [],
        autoPopulate: true,
        displayOrder: 0,
        isActive: true,
      },
    });
  });
});
