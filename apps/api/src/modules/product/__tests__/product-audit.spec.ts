import { describe, expect, it } from 'vitest';

import type { AuditedProductSnapshot } from '../utils/product-audit';
import {
  appendAuditEntry,
  AUDITED_PRODUCT_FIELDS,
  buildProductAuditDiff,
  isCrossStoreProductEdit,
  MAX_AUDITED_CHANGES,
  summarizeAuditValue,
} from '../utils/product-audit';

/** Type-safe minimal snapshot builder — only audited fields, no casts. */
function makeSnapshot(overrides: Partial<AuditedProductSnapshot> = {}): AuditedProductSnapshot {
  return {
    name: 'Base Product',
    description: 'Base description',
    price: 1000,
    discountedPrice: null,
    brandId: null,
    brand: null,
    sizes: [],
    colorVariants: [],
    skus: [],
    variantOptions: [],
    mainImages: [],
    dynamicData: {},
    tags: [],
    featured: false,
    status: 'draft',
    ...overrides,
  };
}

describe('buildProductAuditDiff', () => {
  it('records a changed scalar field with human-readable from/to', () => {
    const changes = buildProductAuditDiff(makeSnapshot({ price: 1000 }), { price: 1500 });

    expect(changes).toEqual([{ field: 'price', from: '1000', to: '1500' }]);
  });

  it('skips fields absent from the payload and unchanged values', () => {
    const before = makeSnapshot();
    const changes = buildProductAuditDiff(before, {});

    expect(changes).toEqual([]);

    const sameValue = buildProductAuditDiff(before, { name: 'Base Product' });
    expect(sameValue).toEqual([]);
  });

  it('ignores fields outside the audit whitelist even when changed', () => {
    // slug is not in AUDITED_PRODUCT_FIELDS — passing it must not be recorded.
    const payload = { name: 'New Name' } as unknown as Partial<{ name: string; slug: string }> &
      Parameters<typeof buildProductAuditDiff>[1];
    const changes = buildProductAuditDiff(makeSnapshot(), payload);

    expect(changes).toHaveLength(1);
    expect(changes[0].field).toBe('name');
  });

  it('summarizes array and object fields instead of dumping raw JSON', () => {
    const changes = buildProductAuditDiff(
      makeSnapshot(),
      { mainImages: ['a.png', 'b.png'], dynamicData: { fabric: 'silk' } },
    );

    const images = changes.find((c) => c.field === 'mainImages');
    const dynamic = changes.find((c) => c.field === 'dynamicData');

    expect(images?.from).toBe('0 item(s)');
    expect(images?.to).toBe('2 item(s)');
    expect(dynamic?.to).toBe('{fabric}');
  });

  it('captures forced status transitions (vendor publish demoted to pending_review)', () => {
    const changes = buildProductAuditDiff(
      makeSnapshot({ status: 'rejected' }),
      { status: 'pending_review' },
    );

    expect(changes).toContainEqual({
      field: 'status',
      from: 'rejected',
      to: 'pending_review',
    });
  });

  it('caps the number of recorded changes at MAX_AUDITED_CHANGES', () => {
    const before = makeSnapshot();
    const payload: Parameters<typeof buildProductAuditDiff>[1] = {};
    for (let i = 0; i < MAX_AUDITED_CHANGES + 5; i += 1) {
      payload.name = `Name ${i}`;
      payload.price = i;
    }

    const changes = buildProductAuditDiff(before, payload);

    expect(changes.length).toBeLessThanOrEqual(MAX_AUDITED_CHANGES);
  });
});

describe('summarizeAuditValue', () => {
  it('truncates long strings with an ellipsis marker', () => {
    const long = 'x'.repeat(300);
    const summary = summarizeAuditValue(long);

    expect(summary).toHaveLength(161);
    expect(summary.endsWith('…')).toBe(true);
  });

  it('renders null/undefined as em dash and primitives as strings', () => {
    expect(summarizeAuditValue(null)).toBe('—');
    expect(summarizeAuditValue(undefined)).toBe('—');
    expect(summarizeAuditValue(false)).toBe('false');
    expect(summarizeAuditValue(42)).toBe('42');
  });

  it('previews object shapes without deep serialization', () => {
    expect(summarizeAuditValue({ a: 1, b: 2 })).toBe('{a, b}');
    expect(summarizeAuditValue({})).toBe('{}');
  });
});

describe('isCrossStoreProductEdit', () => {
  it('flags platform roles editing vendor-owned products', () => {
    expect(isCrossStoreProductEdit('SUPERADMIN', 'vendor-1')).toBe(true);
    expect(isCrossStoreProductEdit('ADMIN', 'vendor-1')).toBe(true);
  });

  it('does not flag same-store or platform-owned products', () => {
    expect(isCrossStoreProductEdit('VENDOR', 'vendor-1')).toBe(false);
    expect(isCrossStoreProductEdit('STAFF', 'vendor-1')).toBe(false);
    expect(isCrossStoreProductEdit('SUPERADMIN', null)).toBe(false);
  });
});

describe('appendAuditEntry', () => {
  const entry = {
    action: 'edited' as const,
    editorId: 'u1',
    editorRole: 'ADMIN',
    isCrossStoreEdit: true,
    changes: [{ field: 'price', from: '1', to: '2' }],
    editedAt: new Date('2026-01-01'),
  };

  it('appends to an existing history array without mutating it', () => {
    const existing = [{ action: 'approve' }];
    const result = appendAuditEntry(existing, entry);

    expect(result).toHaveLength(2);
    expect(existing).toHaveLength(1);
    expect(result[1]).toBe(entry);
  });

  it('starts a fresh history for null/undefined/malformed columns', () => {
    expect(appendAuditEntry(null, entry)).toEqual([entry]);
    expect(appendAuditEntry(undefined, entry)).toEqual([entry]);
    expect(appendAuditEntry('corrupted', entry)).toEqual([entry]);
  });
});

describe('AUDITED_PRODUCT_FIELDS', () => {
  it('covers the merchandising-critical fields', () => {
    for (const field of ['name', 'price', 'discountedPrice', 'status'] as const) {
      expect(AUDITED_PRODUCT_FIELDS).toContain(field);
    }
  });

  it('excludes structural/computed columns', () => {
    expect(AUDITED_PRODUCT_FIELDS).not.toContain('slug');
    expect(AUDITED_PRODUCT_FIELDS).not.toContain('reviewHistory');
    expect(AUDITED_PRODUCT_FIELDS).not.toContain('qualityScore');
  });
});
