import { describe, expect, it } from 'vitest';

import type { FieldSpec } from '../../types';
import {
  buildNameToGroup,
  collectServerDefaults,
  getValueAtPath,
  groupFieldsByGroup,
  kindRank,
  resolveFieldName,
  schemaDeclaresBrand,
  schemaDeclaresName,
  sortVariantFields,
  visibleFieldNames,
} from '../dynamic-form-helpers';

const field = (name: string, group = 'details', label = name): FieldSpec => ({
  name,
  uiType: 'input',
  label,
  group,
});

describe('getValueAtPath', () => {
  it('reads flat dot-keys before traversing nested objects', () => {
    expect(getValueAtPath({ 'a.b': 1, a: { b: 2 } }, 'a.b')).toBe(1);
    expect(getValueAtPath({ a: { b: 2 } }, 'a.b')).toBe(2);
  });

  it('returns undefined for missing paths, null segments, and empty paths', () => {
    expect(getValueAtPath({ a: { b: 2 } }, 'a.missing')).toBeUndefined();
    expect(getValueAtPath({ a: null }, 'a.b')).toBeUndefined();
    expect(getValueAtPath({ a: 1 }, 'a.b')).toBeUndefined();
    expect(getValueAtPath({ a: 1 }, '')).toBeUndefined();
  });
});

describe('buildNameToGroup + resolveFieldName', () => {
  it('defaults missing groups to details', () => {
    expect(buildNameToGroup([field('Color', 'variant'), field('notes', '')])).toEqual({
      Color: 'variant',
      notes: 'details',
    });
  });

  it('resolves exact names, then root segments, then passes through', () => {
    const map = buildNameToGroup([field('Color', 'variant'), field('sku', 'sale')]);
    expect(resolveFieldName('Color', map)).toBe('Color');
    expect(resolveFieldName('Color.0', map)).toBe('Color');
    expect(resolveFieldName('sku.default.price', map)).toBe('sku');
    expect(resolveFieldName('unknown.deep.path', map)).toBe('unknown.deep.path');
  });
});

describe('groupFieldsByGroup + sortVariantFields', () => {
  it('buckets by group defaulting to details', () => {
    const grouped = groupFieldsByGroup([field('a', 'variant'), field('b', '')]);
    expect(grouped.variant?.map((f) => f.name)).toEqual(['a']);
    expect(grouped.details?.map((f) => f.name)).toEqual(['b']);
  });

  it('ranks color before size before others by name or label', () => {
    expect(kindRank(field('Color', 'variant'))).toBe(0);
    expect(kindRank(field('shade', 'variant', 'Shirt Color'))).toBe(0);
    expect(kindRank(field('Size', 'variant'))).toBe(1);
    expect(kindRank(field('Material', 'variant'))).toBe(2);
  });

  it('sorts color → size → others without mutating the input order', () => {
    const input = [
      field('Material', 'variant'),
      field('Size', 'variant'),
      field('Color', 'variant'),
    ];
    const sorted = sortVariantFields(input);
    expect(sorted.map((f) => f.name)).toEqual(['Color', 'Size', 'Material']);
    expect(input.map((f) => f.name)).toEqual(['Material', 'Size', 'Color']);
  });
});

describe('collectServerDefaults', () => {
  it('collects declared defaults paired with their owning group', () => {
    const out = collectServerDefaults(
      [
        { ...field('origin', 'details'), value: 'Nepal' },
        { ...field('Color', 'variant'), value: ['Blue'] },
      ],
      {},
    );
    expect(out).toEqual([
      { name: 'origin', value: 'Nepal', group: 'details' },
      { name: 'Color', value: ['Blue'], group: 'variant' },
    ]);
  });

  it('skips absent/null defaults and anything the seller already filled in', () => {
    const out = collectServerDefaults(
      [
        { ...field('a'), value: undefined },
        { ...field('b'), value: null },
        { ...field('c'), value: 'server' },
        { ...field('d'), value: 'server' },
        { ...field('e'), value: 'server' },
        { ...field('f'), value: 'server' },
      ],
      { c: 'typed by the seller', d: '', e: null, f: 0 },
    );
    // `''`/`null` still count as unfilled (the pre-existing default rule), so
    // their server default applies; a seller-typed string and a seller-typed
    // `0` are real values and are never overwritten.
    expect(out.map((entry) => entry.name)).toEqual(['d', 'e']);
  });

  it('defaults a missing group to details and never mutates the input', () => {
    const fields: FieldSpec[] = [
      { name: 'origin', uiType: 'input', label: 'Origin', group: '', value: 'Nepal' },
    ];
    const out = collectServerDefaults(fields, {});
    expect(out[0]?.group).toBe('details');
    expect(fields[0]).toEqual({
      name: 'origin',
      uiType: 'input',
      label: 'Origin',
      group: '',
      value: 'Nepal',
    });
  });
});

describe('visibleFieldNames', () => {
  it('keeps only fields that are not explicitly hidden', () => {
    const out = visibleFieldNames([
      field('a'),
      { ...field('b'), visible: false },
      { ...field('c'), visible: true },
    ]);
    expect(out).toEqual(['a', 'c']);
  });

  it('returns an empty scope for an empty schema', () => {
    expect(visibleFieldNames([])).toEqual([]);
  });
});

describe('schemaDeclaresName + schemaDeclaresBrand', () => {
  it('detects name/title and brand spellings case-insensitively', () => {
    expect(schemaDeclaresName([field('Name')])).toBe(true);
    expect(schemaDeclaresName([field('productName')])).toBe(true);
    expect(schemaDeclaresName([field('TITLE')])).toBe(true);
    expect(schemaDeclaresName([field('material')])).toBe(false);
    expect(schemaDeclaresBrand([field('ProductBrand')])).toBe(true);
    expect(schemaDeclaresBrand([field('material')])).toBe(false);
    expect(schemaDeclaresName([])).toBe(false);
    expect(schemaDeclaresBrand([])).toBe(false);
  });
});
