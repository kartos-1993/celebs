import { describe, expect, it } from 'vitest';

import {
  buildProductStyleRef,
  cleanVariantCode,
  generateRetailSku,
  resolveDepartmentCode,
} from '../sku-generator';

describe('Professional Retail SKU Generator (generateRetailSku)', () => {
  it('generates 1P flagship SKU without vendor store tag', () => {
    const sku = generateRetailSku({
      brandToken: 'CLB',
      styleRef: '00RT',
      options: ['BLK', 'L'],
    });
    expect(sku).toBe('CLB-00RT-BLK-L');
  });

  it('generates 3P vendor SKU with storeCode included', () => {
    const sku = generateRetailSku({
      brandToken: 'CLB',
      storeCode: 'URF',
      styleRef: '00RT',
      options: ['BLK', 'L'],
    });
    expect(sku).toBe('CLB-URF-00RT-BLK-L');
  });

  it('generates standard variant tag when options array is empty or omitted', () => {
    const sku = generateRetailSku({
      brandToken: 'CLB',
      storeCode: 'URF',
      styleRef: '00RT',
    });
    expect(sku).toBe('CLB-URF-00RT-STD');
  });

  it('cleans and formats dynamic variant codes consistently', () => {
    expect(cleanVariantCode('256GB')).toBe('256GB');
    expect(cleanVariantCode('Space Gray')).toBe('SPACEGRA');
    expect(cleanVariantCode('100ml')).toBe('100ML');
    expect(cleanVariantCode('6-Pack')).toBe('6PACK');
    expect(cleanVariantCode('Vintage Black')).toBe('VINTAGEB');
    expect(cleanVariantCode('Large')).toBe('LARGE');
    expect(cleanVariantCode('32')).toBe('32');
  });

  it('derives collision-proof style references for products sharing name prefixes', () => {
    const style1 = buildProductStyleRef('Cotton T-Shirt', 'A1B2');
    const style2 = buildProductStyleRef('Cotton Slim Jeans', 'C3D4');

    expect(style1).toBe('COTTA1B2');
    expect(style2).toBe('COTTC3D4');
    expect(style1).not.toBe(style2);

    const sku1 = generateRetailSku({
      brandToken: 'CLB',
      storeCode: 'URF',
      styleRef: style1,
      options: ['BLK', 'M'],
    });
    const sku2 = generateRetailSku({
      brandToken: 'CLB',
      storeCode: 'URF',
      styleRef: style2,
      options: ['BLK', 'M'],
    });

    expect(sku1).toBe('CLB-URF-COTTA1B2-BLK-M');
    expect(sku2).toBe('CLB-URF-COTTC3D4-BLK-M');
    expect(sku1).not.toBe(sku2);
  });

  it('generates high-entropy style references across repeated calls without custom seed', () => {
    const generatedStyles = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const style = buildProductStyleRef('Cotton T-Shirt');
      expect(style).toHaveLength(8);
      expect(style.startsWith('COTT')).toBe(true);
      generatedStyles.add(style);
    }
    // High-entropy random suffix guarantees all 50 are unique
    expect(generatedStyles.size).toBe(50);
  });
});

/**
 * Pins the department-code contract. The lookup is data-driven now, so this
 * covers every keyword bucket, the empty-input fallback, both 1-char and
 * first-alphanumeric fallbacks, and — critically — the precedence the array
 * order encodes.
 */
describe('resolveDepartmentCode', () => {
  it('falls back to "u" for empty input', () => {
    expect(resolveDepartmentCode()).toBe('u');
    expect(resolveDepartmentCode('')).toBe('u');
    expect(resolveDepartmentCode('   ')).toBe('u');
  });

  it('resolves menswear to "m"', () => {
    expect(resolveDepartmentCode('Men')).toBe('m');
    expect(resolveDepartmentCode('Menswear')).toBe('m');
    expect(resolveDepartmentCode('  MEN  ')).toBe('m');
  });

  it('resolves womenswear to "w" — the "men" veto must not claim it', () => {
    expect(resolveDepartmentCode('Women')).toBe('w');
    expect(resolveDepartmentCode('Ladies')).toBe('w');
    expect(resolveDepartmentCode('Female')).toBe('w');
    expect(resolveDepartmentCode('Womens Footwear')).toBe('w');
  });

  it('resolves every kids keyword to "k"', () => {
    expect(resolveDepartmentCode('Kids')).toBe('k');
    expect(resolveDepartmentCode('Children')).toBe('k');
    expect(resolveDepartmentCode('Baby')).toBe('k');
    expect(resolveDepartmentCode('Boys')).toBe('k');
    expect(resolveDepartmentCode('Girls')).toBe('k');
  });

  it('resolves every accessories keyword to "a"', () => {
    expect(resolveDepartmentCode('Accessories')).toBe('a');
    expect(resolveDepartmentCode('Jewelry')).toBe('a');
    expect(resolveDepartmentCode('Handbag')).toBe('a');
    expect(resolveDepartmentCode('Shoes')).toBe('a');
    expect(resolveDepartmentCode('Footwear')).toBe('a');
  });

  it('resolves every home keyword to "h"', () => {
    expect(resolveDepartmentCode('Home')).toBe('h');
    expect(resolveDepartmentCode('Home Decor')).toBe('h');
    expect(resolveDepartmentCode('Living Room')).toBe('h');
  });

  it('resolves every electronics keyword to "e"', () => {
    expect(resolveDepartmentCode('Electronics')).toBe('e');
    expect(resolveDepartmentCode('Gadgets')).toBe('e');
    expect(resolveDepartmentCode('Phone')).toBe('e');
    expect(resolveDepartmentCode('Tech')).toBe('e');
  });

  it('resolves every beauty keyword to "b"', () => {
    expect(resolveDepartmentCode('Beauty')).toBe('b');
    expect(resolveDepartmentCode('Cosmetics')).toBe('b');
    expect(resolveDepartmentCode('Skin Care')).toBe('b');
    expect(resolveDepartmentCode('Personal Care')).toBe('b');
  });

  it('keeps rule precedence: earlier buckets win over later ones', () => {
    // menswear before accessories / home
    expect(resolveDepartmentCode("Men's Shoes")).toBe('m');
    expect(resolveDepartmentCode("Men's Home Decor")).toBe('m');
    // kids before accessories
    expect(resolveDepartmentCode('Kids Shoes')).toBe('k');
    // accessories before electronics
    expect(resolveDepartmentCode('Tech Bags')).toBe('a');
  });

  it('passes a 1-char alnum code through unchanged', () => {
    expect(resolveDepartmentCode('x')).toBe('x');
    expect(resolveDepartmentCode('5')).toBe('5');
    expect(resolveDepartmentCode('M')).toBe('m');
  });

  it('falls back to the first alphanumeric character', () => {
    expect(resolveDepartmentCode('Saree')).toBe('s');
    expect(resolveDepartmentCode('123abc')).toBe('1');
    expect(resolveDepartmentCode('--x')).toBe('x');
  });

  it('falls back to "u" when nothing alphanumeric survives', () => {
    expect(resolveDepartmentCode('!')).toBe('u');
    expect(resolveDepartmentCode('***')).toBe('u');
  });
});
