import { describe, expect, it } from 'vitest';

import { getProductCardWidth,PRODUCT_COLUMN_GAP, PRODUCT_GRID_PADDING } from '../card-layout';

describe('getProductCardWidth', () => {
  it('matches the standard two-column grid formula', () => {
    expect(getProductCardWidth(390)).toBe(
      (390 - PRODUCT_GRID_PADDING * 2 - PRODUCT_COLUMN_GAP) / 2,
    );
  });

  it('uses the shared padding and gap constants the product card renders with', () => {
    expect(PRODUCT_GRID_PADDING).toBe(12);
    expect(PRODUCT_COLUMN_GAP).toBe(6);
  });

  it('grows with the window rather than pinning a fixed width', () => {
    expect(getProductCardWidth(430)).toBeGreaterThan(getProductCardWidth(360));
  });
});
