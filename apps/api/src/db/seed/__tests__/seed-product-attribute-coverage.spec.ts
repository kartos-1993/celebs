import slugify from 'slugify';
import { describe, expect, it } from 'vitest';

import { ALL_MEN_CATEGORIES_TREE, type SeedAttr, type SeedCategory } from '../seed-categories-men';
import { DEFAULT_OPTION_SETS } from '../seed-option-sets';
import { readProductDataset } from '../seed-products';

/**
 * Guardrail: the scraped product dataset (data/products.json) must stay inside
 * the attribute schema of the leaf category each item is attached to.
 *
 * The admin product form renders one field per leaf attribute and the storefront
 * filter drawer resolves option values by exact string match — a stray key or
 * option value here becomes invisible (or a broken filter) in both surfaces.
 * When a scrape introduces a new value, extend the leaf schema (or normalize
 * the product) — never let the dataset drift.
 */

interface LeafAttributeSchema {
  type: SeedAttr['type'];
  /** null = free-text attribute (any string accepted); otherwise the allowed options. */
  values: string[] | null;
}

const FORMATTED_TYPES = new Set<SeedAttr['type']>(['select', 'multiselect']);

const optionSetValuesByName = new Map<string, string[]>(
  DEFAULT_OPTION_SETS.map((set) => [set.name, [...set.values]]),
);

function walkLeaves(node: SeedCategory, visit: (leaf: SeedCategory) => void): void {
  if (!node.children?.length) {
    visit(node);
    return;
  }
  for (const child of node.children) walkLeaves(child, visit);
}

function resolveAttributeValues(attr: SeedAttr): string[] | null {
  if (!FORMATTED_TYPES.has(attr.type)) return null;
  const linkedValues =
    attr.useStandardOptions && attr.optionSetName
      ? optionSetValuesByName.get(attr.optionSetName)
      : undefined;
  return linkedValues ?? attr.values ?? [];
}

const leafSchemaBySlug = new Map<string, Map<string, LeafAttributeSchema>>();

walkLeaves(ALL_MEN_CATEGORIES_TREE, (leaf) => {
  const slug = slugify(leaf.name, { lower: true, strict: true });
  const schema = new Map<string, LeafAttributeSchema>();
  for (const attr of leaf.attributes ?? []) {
    schema.set(attr.name, { type: attr.type, values: resolveAttributeValues(attr) });
  }
  leafSchemaBySlug.set(slug, schema);
});

const dataset = readProductDataset();

describe('Product seed attribute coverage', () => {
  it('attaches every product to a seeded leaf category', () => {
    const orphans = dataset
      .filter((item) => !leafSchemaBySlug.has(item.categorySlug))
      .map((item) => `${item.name} → ${item.categorySlug}`);

    expect(orphans).toEqual([]);
  });

  it('keeps every product attribute key inside its leaf schema', () => {
    const unknown: string[] = [];

    for (const item of dataset) {
      const schema = leafSchemaBySlug.get(item.categorySlug);
      if (!schema) continue; // orphan category is reported by its own test
      for (const key of Object.keys(item.attributes)) {
        if (!schema.has(key)) unknown.push(`${item.name} → ${key}`);
      }
    }

    expect(unknown).toEqual([]);
  });

  it('keeps every product attribute value inside its leaf option list', () => {
    const invalid: string[] = [];

    for (const item of dataset) {
      const schema = leafSchemaBySlug.get(item.categorySlug);
      if (!schema) continue;

      for (const [key, raw] of Object.entries(item.attributes)) {
        const attr = schema.get(key);
        if (!attr || attr.values === null) continue; // unknown key or free-text attribute

        if (attr.type === 'multiselect') {
          if (!Array.isArray(raw)) {
            invalid.push(`${item.name} → ${key}: expected options array, received ${typeof raw}`);
            continue;
          }
          for (const value of raw) {
            if (typeof value !== 'string' || !attr.values.includes(value)) {
              invalid.push(`${item.name} → ${key}: ${JSON.stringify(value)}`);
            }
          }
          continue;
        }

        if (typeof raw !== 'string' || !attr.values.includes(raw)) {
          invalid.push(`${item.name} → ${key}: ${JSON.stringify(raw)}`);
        }
      }
    }

    expect(invalid).toEqual([]);
  });
});
