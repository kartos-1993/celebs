import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const dir = dirname(fileURLToPath(import.meta.url));
const indexSource = readFileSync(resolve(dir, '..', 'index.tsx'), 'utf8');
const bodySource = readFileSync(resolve(dir, '..', 'add-product-form-body.tsx'), 'utf8');

const DERIVATION = 'watchedSubcategoryId || watchedCategoryId';

const occurrences = (source: string): string[] =>
  source.split('\n').filter((line) => line.includes(DERIVATION));

describe('effectiveCatId derivation', () => {
  it('uses the identical subcategory-wins expression in both owners', () => {
    expect(occurrences(indexSource)).toHaveLength(1);
    expect(occurrences(bodySource)).toHaveLength(1);
    expect(occurrences(indexSource)[0]?.trim()).toBe(occurrences(bodySource)[0]?.trim());
  });

  it('wires the derived id into the schema fetch in the page shell', () => {
    expect(indexSource).toContain('useProductSchema(effectiveCatId, id)');
  });

  it('pins subcategory-wins fallback semantics (empty string falls through)', () => {
    // Mirrors `watchedSubcategoryId || watchedCategoryId` at
    // add-product/index.tsx:51 and add-product-form-body.tsx:46.
    // WONTFIX: collapsing the duplicated derivation into one shared helper
    // needs the second owner (add-product-form-body.tsx), which belongs to
    // another change stream — out of scope here. The spec above keeps both
    // expressions byte-identical so they cannot drift unnoticed.
    const derive = (categoryId: string, subcategoryId: string): string =>
      subcategoryId || categoryId;
    expect(derive('cat-1', 'sub-9')).toBe('sub-9');
    expect(derive('cat-1', '')).toBe('cat-1');
    expect(derive('', '')).toBe('');
  });
});
