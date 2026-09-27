import { describe, expect, it } from 'vitest';

import { buildProductStyleRef, cleanVariantCode, generateRetailSku } from '../sku-generator';

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
