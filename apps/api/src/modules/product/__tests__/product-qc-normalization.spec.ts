import { describe, expect, it } from 'vitest';

import { calculateProductQCScore } from '../utils/product-qc';

import { baseRow } from './presenter-fixtures';

describe('Product QC Scoring System Normalization', () => {
  it('exempts sizing requirements for non-apparel categories without docking points', () => {
    // Non-apparel product (Perfume / Electronics / Mug) that has no sizing charts
    const row = baseRow({
      name: 'Luxury Eau De Parfum 100ml',
      description:
        'Long-lasting signature fragrance with notes of cedarwood, amber, and crisp citrus bergamot. Handcrafted essence.',
      price: 4500,
      mainImages: [
        'https://cdn.example.com/p1.jpg',
        'https://cdn.example.com/p2.jpg',
        'https://cdn.example.com/p3.jpg',
        'https://cdn.example.com/p4.jpg',
      ],
      sizes: [], // No sizes applicable
      dynamicData: {
        values: {
          volume: '100ml',
          concentration: 'Eau De Parfum',
          scentFamily: 'Woody Oriental',
          origin: 'France',
        },
      },
      category: {
        id: 'cat-perfume',
        name: 'Fragrances & Perfumes',
        requiresSizing: false,
      },
      skus: [{ price: 4500, stock: 25 }],
    });

    const result = calculateProductQCScore(row);

    // Sizing check should be exempt or awarded N/A rather than docking 15 points
    expect(result.checks.sizingCheck.passed).toBe(true);
    // Score should be 100 and grade EXCELLENT
    expect(result.score).toBe(100);
    expect(result.grade).toBe('EXCELLENT');
  });

  it('rewards live inventory stock when variant array has no embedded stock', () => {
    // Product uses PostgreSQL inventories rather than nested JSON variant stocks
    const row = baseRow({
      name: 'Minimalist Ceramic Coffee Mug',
      description:
        'Double-walled insulated ceramic mug for hot and cold beverages with splash-proof lid.',
      price: 850,
      mainImages: ['https://cdn.example.com/m1.jpg'],
      colorVariants: [],
      skus: [],
      inventories: [
        {
          colorVariantName: 'Default',
          size: 'Standard',
          quantity: 30,
          reservedQuantity: 2,
        },
      ],
    });

    const result = calculateProductQCScore(row);

    // Stock check should read inventories and pass with 5 points
    expect(result.checks.variantsCheck.passed).toBe(true);
    expect(result.checks.variantsCheck.score).toBe(5);
    expect(result.checks.variantsCheck.details).toContain('28 unit(s)');
  });
});
