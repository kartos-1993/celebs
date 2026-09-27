import { describe, expect, it } from 'vitest';

import {
  buildBarcodeItems,
  canPrintBarcodes,
  DEFAULT_STORE_NAME,
  getSkuPrefix,
} from '../barcode-builder';
import { encodeCode128B } from '../barcode-utils';

describe('getSkuPrefix', () => {
  it('derives a 3-letter uppercase prefix from the vendor name', () => {
    expect(getSkuPrefix('Acme Corp', null)).toBe('ACM');
  });

  it('falls back to brand when vendor name is missing', () => {
    expect(getSkuPrefix(null, 'AB')).toBe('AB');
    expect(getSkuPrefix(undefined, 'Cotton')).toBe('COT');
  });

  it('strips non-alphanumeric characters before slicing', () => {
    expect(getSkuPrefix('A&B!', null)).toBe('AB');
  });

  it('falls back to HUB when no vendor or brand is provided', () => {
    expect(getSkuPrefix(null, null)).toBe('HUB');
    expect(getSkuPrefix('', '')).toBe('HUB');
  });
});

describe('DEFAULT_STORE_NAME', () => {
  it('is the canonical New Road Hub store label', () => {
    expect(DEFAULT_STORE_NAME).toBe('CELEBS • NEW ROAD HUB');
  });
});

describe('buildBarcodeItems', () => {
  it('returns an empty list when product is missing', () => {
    expect(buildBarcodeItems(null)).toEqual([]);
    expect(buildBarcodeItems(undefined)).toEqual([]);
  });

  it('prefers vendorName, then brand, then the default store name', () => {
    const base = { id: 'prod-XYZ-12', name: 'Tee', price: 100, skus: [] };
    expect(buildBarcodeItems({ ...base, vendorName: 'Shop', brand: 'Acme' })[0]?.storeName).toBe(
      'Shop',
    );
    expect(buildBarcodeItems({ ...base, brand: 'Acme' })[0]?.storeName).toBe('Acme');
    expect(buildBarcodeItems({ ...base })[0]?.storeName).toBe(DEFAULT_STORE_NAME);
  });

  it('strips dashes from the id in the skus branch (same as the fallback branch)', () => {
    const items = buildBarcodeItems({
      id: 'prod-XYZ-12',
      name: 'Tee',
      price: 500,
      brand: 'Acme',
      skus: [{ code: '  ', selectedOptions: { Color: 'Red' }, price: 600 }],
    });
    // Both branches use product.id.replace(/-/g, '').slice(-6): 'prod-XYZ-12' -> 'DXYZ12'.
    expect(items[0]?.sku).toBe('CLB-ACM-DXYZ12');
    expect(items[0]?.variantLabel).toBe('Red');
    expect(items[0]?.price).toBe(600);
  });

  it('strips dashes from the id in the fallback branch', () => {
    const items = buildBarcodeItems({
      id: 'prod-XYZ-12',
      name: 'Tee',
      price: 500,
      brand: 'Acme',
    });
    expect(items).toHaveLength(1);
    expect(items[0]?.sku).toBe('CLB-ACM-DXYZ12');
  });

  it('uppercases and trims explicit raw SKU codes', () => {
    const items = buildBarcodeItems({
      id: 'prod-XYZ-12',
      name: 'Tee',
      price: 500,
      brand: 'Acme',
      skus: [{ skuCode: '  clb-x1  ' }],
    });
    expect(items[0]?.sku).toBe('CLB-X1');
  });

  it('strips characters outside the Code 128-B range from explicit raw SKU codes', () => {
    const items = buildBarcodeItems({
      id: 'prod-XYZ-12',
      name: 'Tee',
      price: 500,
      brand: 'Acme',
      skus: [{ skuCode: 'café•tee' }, { code: 'emoji-\u{1F600}-m' }],
    });
    expect(items[0]?.sku).toBe('CAFTEE');
    expect(items[1]?.sku).toBe('EMOJI--M');
  });

  it('falls back to the generated SKU when the raw code has no printable characters left', () => {
    const items = buildBarcodeItems({
      id: 'prod-XYZ-12',
      name: 'Tee',
      price: 500,
      brand: 'Acme',
      skus: [{ skuCode: '  •\u{1F600}  ' }],
    });
    expect(items[0]?.sku).toBe('CLB-ACM-DXYZ12');
  });
});

describe('buildBarcodeItems Code 128-B output alphabet', () => {
  const hostileSources = [
    {
      label: 'accented vendor sku',
      source: { id: 'p1', name: 'T', skus: [{ skuCode: 'Café-Ñ' }] },
    },
    { label: 'symbol vendor sku', source: { id: 'p2', name: 'T', skus: [{ skuCode: 'A•B—C' }] } },
    { label: 'emoji vendor sku', source: { id: 'p3', name: 'T', skus: [{ code: 'X\u{1F600}Y' }] } },
    {
      label: 'control chars',
      source: { id: 'p4', name: 'T', skus: [{ skuCode: 'A\tB\nC\u0007' }] },
    },
    { label: 'unicode product id', source: { id: 'pröd-üñí-çø', name: 'T' } },
    { label: 'unicode brand fallback', source: { id: 'p6', name: 'T', brand: 'Bébè' } },
    { label: 'non-ascii id with skus', source: { id: 'pröd-üñí-çø', name: 'T', skus: [{}] } },
  ];

  it.each(hostileSources)('emits only U+0020..U+007E for $label', ({ source }) => {
    const items = buildBarcodeItems(source);
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      for (const char of item.sku) {
        const charCode = char.codePointAt(0) ?? 0;
        expect(charCode).toBeGreaterThanOrEqual(32);
        expect(charCode).toBeLessThanOrEqual(126);
      }
      expect(() => encodeCode128B(item.sku)).not.toThrow();
    }
  });
});

describe('canPrintBarcodes', () => {
  it.each([
    { isEditMode: true, status: 'published', expected: true },
    { isEditMode: true, status: 'deactivated', expected: true },
    { isEditMode: true, status: 'draft', expected: true },
    { isEditMode: false, status: 'published', expected: true },
    { isEditMode: false, status: 'deactivated', expected: false },
    { isEditMode: false, status: 'draft', expected: false },
  ])(
    'returns $expected when isEditMode=$isEditMode and status=$status',
    ({ isEditMode, status, expected }) => {
      expect(canPrintBarcodes({ status }, { isEditMode })).toBe(expected);
    },
  );

  it('returns false when product is missing and not in edit mode', () => {
    expect(canPrintBarcodes(null)).toBe(false);
    expect(canPrintBarcodes(undefined)).toBe(false);
    expect(canPrintBarcodes(null, { isEditMode: true })).toBe(true);
  });
});
