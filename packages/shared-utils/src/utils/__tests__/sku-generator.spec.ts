import { describe, expect, it } from 'vitest';
import {
  generateSheinStyleSku,
  resolveDepartmentCode,
} from '../sku-generator';

describe('Shein/Retail Standard SKU Generator', () => {
  it('resolves department codes accurately from category/department names', () => {
    expect(resolveDepartmentCode("Men's Fashion")).toBe('m');
    expect(resolveDepartmentCode("Men's Tops")).toBe('m');
    expect(resolveDepartmentCode('Women Dresses')).toBe('w');
    expect(resolveDepartmentCode('Ladies Footwear')).toBe('w');
    expect(resolveDepartmentCode('Kids & Baby Clothing')).toBe('k');
    expect(resolveDepartmentCode('Children Toys')).toBe('k');
    expect(resolveDepartmentCode('Fashion Accessories')).toBe('a');
    expect(resolveDepartmentCode('Jewelry')).toBe('a');
    expect(resolveDepartmentCode('Home & Living')).toBe('h');
    expect(resolveDepartmentCode('Electronics')).toBe('e');
    expect(resolveDepartmentCode('Beauty & Personal Care')).toBe('b');
    expect(resolveDepartmentCode('Stationery')).toBe('s');
    expect(resolveDepartmentCode('')).toBe('u');
    expect(resolveDepartmentCode(undefined)).toBe('u');
  });

  it('generates standard 18-character SKU with brand, dept, date, and 10-digit ID', () => {
    const fixedDate = new Date('2026-08-14T00:00:00Z');
    const sku = generateSheinStyleSku({
      brandPrefix: 'c',
      department: "Men's Apparel",
      date: fixedDate,
      customSequence: '0051059585',
    });

    expect(sku).toBe('cm2608140051059585');
    expect(sku).toHaveLength(18);
    expect(sku).toMatch(/^[a-z0-9]{2}\d{16}$/);
  });

  it('guarantees collision-free random SKUs across 1000 generated samples', () => {
    const generated = new Set<string>();
    const count = 1000;

    for (let i = 0; i < count; i++) {
      const sku = generateSheinStyleSku({
        brandPrefix: 'c',
        department: 'women',
      });

      expect(sku).toHaveLength(18);
      expect(sku.startsWith('cw')).toBe(true);
      expect(sku).toMatch(/^cw\d{16}$/);

      generated.add(sku);
    }

    expect(generated.size).toBe(count);
  });
});
