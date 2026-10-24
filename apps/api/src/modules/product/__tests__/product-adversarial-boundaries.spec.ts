import { describe, expect, it, vi } from 'vitest';

import { AppError } from '@celebs/shared-utils';

import { ProductQueryService } from '../product-query.service';
import { formatStorefrontCard, formatStorefrontDetail } from '../product-response-shapes';

vi.mock('@/common/services/redis-cache.service', () => ({
  getCachedJson: vi.fn().mockResolvedValue(null),
  setCachedJson: vi.fn(),
}));

describe('Product Adversarial and Boundary Scenarios (Non-Happy Paths)', () => {
  describe('Stock calculations with corrupted, negative, and over-reserved inventory', () => {
    it('clamps negative SKU stock to 0 and declares OUT_OF_STOCK without leaking negative numbers', () => {
      const corruptedProduct = {
        id: 'prod-neg-1',
        name: 'Negative Stock Item',
        price: 1500,
        skus: [{ skuCode: 'SKU-NEG', price: 1500, stock: -15 }],
        colorVariants: [],
      };

      const card = formatStorefrontCard(corruptedProduct);
      expect(card.stockStatus).toBe('OUT_OF_STOCK');
      expect(card.remainingUnits).toBeUndefined();
      expect(card.stockUrgencyMessage).toBeUndefined();

      const detail = formatStorefrontDetail(corruptedProduct);
      expect(detail.stockStatus).toBe('OUT_OF_STOCK');
      expect(detail.remainingUnits).toBeUndefined();
      expect(detail.stockUrgencyMessage).toBeUndefined();
    });

    it('treats corrupted string or NaN stock as 0 and marks OUT_OF_STOCK', () => {
      const corruptedProduct = {
        id: 'prod-nan-1',
        name: 'Corrupted Stock Item',
        price: 2000,
        skus: [{ skuCode: 'SKU-NAN', price: 2000, stock: 'corrupted-text' as unknown as number }],
        colorVariants: [],
      };

      const card = formatStorefrontCard(corruptedProduct);
      expect(card.stockStatus).toBe('OUT_OF_STOCK');
      expect(card.remainingUnits).toBeUndefined();
    });

    it('clamps inventory to 0 when reservations exceed total physical quantity', () => {
      const overReservedProduct = {
        id: 'prod-over-reserved',
        name: 'Over-reserved Item',
        price: 3000,
        skus: [],
        colorVariants: [],
        _derivedStockTotal: 0,
        inventories: [{ quantity: 5, reservedQuantity: 12 }],
      };

      const card = formatStorefrontCard(overReservedProduct);
      expect(card.stockStatus).toBe('OUT_OF_STOCK');
      expect(card.remainingUnits).toBeUndefined();
    });

    it('computes accurate urgency message when available units are between 1 and 4', () => {
      const unitCases = [
        { units: 1, expectedMessage: 'Only 1 remaining' },
        { units: 2, expectedMessage: 'Only 2 remaining' },
        { units: 3, expectedMessage: 'Only 3 remaining' },
        { units: 4, expectedMessage: 'Only 4 remaining' },
      ];

      for (const { units, expectedMessage } of unitCases) {
        const product = {
          id: `prod-${units}`,
          name: `Item with ${units} units`,
          price: 1000,
          _derivedStockTotal: units,
        };

        const card = formatStorefrontCard(product);
        expect(card.stockStatus).toBe('LOW_STOCK');
        expect(card.remainingUnits).toBe(units);
        expect(card.stockUrgencyMessage).toBe(expectedMessage);
      }
    });

    it('displays Less than 5 remaining when exactly 5 units remain', () => {
      const product5 = {
        id: 'prod-5',
        name: 'Item with 5 units',
        price: 1000,
        _derivedStockTotal: 5,
      };

      const card = formatStorefrontCard(product5);
      expect(card.stockStatus).toBe('LOW_STOCK');
      expect(card.remainingUnits).toBe(5);
      expect(card.stockUrgencyMessage).toBe('Less than 5 remaining');
    });

    it('omits remainingUnits and stockUrgencyMessage entirely when stock exceeds 5 units to protect commercial inventory', () => {
      const product6 = {
        id: 'prod-6',
        name: 'Item with 6 units',
        price: 1000,
        _derivedStockTotal: 6,
      };

      const card = formatStorefrontCard(product6);
      expect(card.stockStatus).toBe('IN_STOCK');
      expect(card.remainingUnits).toBeUndefined();
      expect(card.stockUrgencyMessage).toBeUndefined();

      const cardKeys = Object.keys(card);
      expect(cardKeys.includes('remainingUnits')).toBe(false);
      expect(cardKeys.includes('stockUrgencyMessage')).toBe(false);
    });
  });

  describe('Storefront data leakage guards on non-published products', () => {
    it('throws 404 AppError when an anonymous user requests a draft product', async () => {
      const mockRepo = {
        findPublicDetailById: vi.fn().mockResolvedValue(null),
      };
      const service = new ProductQueryService(mockRepo as never, {} as never);

      await expect(service.getPublicProductById('draft-p1')).rejects.toThrow(AppError);
      await expect(service.getPublicProductById('draft-p1')).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it('throws 404 AppError when an anonymous user requests an archived or rejected product', async () => {
      const mockRepo = {
        findPublicDetailById: vi.fn().mockResolvedValue(null),
      };
      const service = new ProductQueryService(mockRepo as never, {} as never);

      await expect(service.getPublicProductById('archived-p1')).rejects.toMatchObject({
        statusCode: 404,
      });
      await expect(service.getPublicProductById('rejected-p1')).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it('rejects cross-store access when seller requests a product belonging to another store', async () => {
      const mockRepo = {
        findStoreDetailById: vi.fn().mockResolvedValue(null),
      };
      const service = new ProductQueryService(mockRepo as never, {} as never);

      await expect(service.getStoreProductById('alien-prod', 'my-store-id')).rejects.toMatchObject({
        statusCode: 404,
      });
      expect(mockRepo.findStoreDetailById).toHaveBeenCalledWith('alien-prod', 'my-store-id');
    });
  });

  describe('Cursor and pagination boundary parsing', () => {
    it('rejects malformed non-base64 or corrupted cursor cleanly without unhandled exception', async () => {
      const mockRepo = {
        findManyList: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
      };
      const service = new ProductQueryService(mockRepo as never, {} as never);

      // Passing corrupted cursor
      await expect(
        service.getProducts({ cursor: '!!!NOT_BASE64_AT_ALL!!!' }, { isElevated: false }),
      ).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    it('rejects cursor containing invalid JSON structure', async () => {
      const mockRepo = {
        findManyList: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
      };
      const service = new ProductQueryService(mockRepo as never, {} as never);
      const invalidJsonCursor = Buffer.from('this is not json').toString('base64');

      await expect(
        service.getProducts({ cursor: invalidJsonCursor }, { isElevated: false }),
      ).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    it('rejects cursor with missing ID', async () => {
      const mockRepo = {
        findManyList: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
      };
      const service = new ProductQueryService(mockRepo as never, {} as never);
      const invalidCursor = Buffer.from(JSON.stringify({ val: '123' })).toString('base64');

      await expect(
        service.getProducts({ cursor: invalidCursor }, { isElevated: false }),
      ).rejects.toMatchObject({
        statusCode: 400,
      });
    });
  });
});
