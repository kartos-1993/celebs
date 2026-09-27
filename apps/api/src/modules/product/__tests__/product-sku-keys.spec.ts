import type { Prisma } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';

import { buildVariantKey } from '@celebs/shared-utils';

import { inventoryRepository } from '@/modules/inventory/inventory.repository';

const mockTx = () => {
  const created: unknown[] = [];
  const tx = {
    productInventory: {
      findMany: vi.fn().mockResolvedValue([]),
      createMany: vi.fn().mockImplementation(({ data }: { data: unknown[] }) => {
        created.push(...data);
        return Promise.resolve({ count: data.length });
      }),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    $executeRaw: vi.fn().mockResolvedValue(1),
  } as unknown as Prisma.TransactionClient;
  return {
    tx,
    created,
    productInventory: tx.productInventory as unknown as Record<string, ReturnType<typeof vi.fn>>,
  };
};

describe('SKU key-building schemes', () => {
  describe('Scheme A: buildVariantKey (canonical, sorted, Default-filtered)', () => {
    it('lowercases, trims, sorts, and joins with :::', () => {
      expect(buildVariantKey(['Red', 'M'])).toBe('m:::red');
      expect(buildVariantKey(['M', 'Red'])).toBe('m:::red');
      expect(buildVariantKey(['  Blue  ', '  XL  '])).toBe('blue:::xl');
    });

    it('filters out Default/blank placeholders entirely', () => {
      expect(buildVariantKey(['Red', 'Default'])).toBe('red');
      expect(buildVariantKey(['Default', 'default'])).toBe('');
      expect(buildVariantKey([undefined, null, ''])).toBe('');
    });
  });

  describe('Scheme B: raw lowercase key (inventory.repository.ts:204,229,244,288 — unsorted, keeps default)', () => {
    it('raw template `${color.toLowerCase()}:::${size.toLowerCase()}` keeps "default" segments', () => {
      const raw = (c: string, s: string) => `${c.toLowerCase()}:::${s.toLowerCase()}`;
      // DIVERGENCE pinned as-is: buildVariantKey(['Default','Default']) === ''
      // while the raw guard key is 'default:::default'. The skuMap/rowKey path
      // (Scheme A) and the published-removal/existingByKey/activeSet path
      // (Scheme B) therefore normalize the all-Default combo differently.
      // @todo-fix: unify on one canonical key builder.
      expect(buildVariantKey(['Default', 'Default'])).toBe('');
      expect(raw('Default', 'Default')).toBe('default:::default');
      expect(raw('Red', 'M')).toBe('red:::m');
    });

    it('raw scheme is order-sensitive where buildVariantKey is not', () => {
      const raw = (c: string, s: string) => `${c.toLowerCase()}:::${s.toLowerCase()}`;
      expect(buildVariantKey(['Red', 'M'])).toBe(buildVariantKey(['M', 'Red']));
      // @todo-fix: raw keys embed (color,size) positionally, so
      // any future caller swapping the segments would miss; pinned as-is.
      expect(raw('Red', 'M')).not.toBe(raw('M', 'Red'));
    });
  });

  describe('call-site pinning: skuMap/rowKey use Scheme A', () => {
    it('resolves the all-Default combo via the empty-string fallback key', async () => {
      const { tx, created } = mockTx();
      await inventoryRepository.syncProductInventory(
        tx,
        'prod-1',
        [{ name: 'Default', stocks: [{ size: 'Default', quantity: 10 }] }],
        [{ skuCode: 'CLB-BAG-STD', selectedOptions: {} }],
        'BAG',
        { isPublished: false },
      );
      // selectedOptions {} -> values [] -> buildVariantKey([]) === '' and the
      // rowKey buildVariantKey(['Default','Default']) === '' too, so the
      // skuMap.get('') fallback (inventory.repository.ts:173) hits.
      expect(created).toHaveLength(1);
      expect(created[0]).toMatchObject({ sku: 'CLB-BAG-STD', quantity: 10 });
    });

    it('matches composite options regardless of selectedOptions key order (sorted key)', async () => {
      const { tx, created } = mockTx();
      await inventoryRepository.syncProductInventory(
        tx,
        'prod-2',
        [{ name: 'Red', stocks: [{ size: 'M', quantity: 12 }] }],
        [{ skuCode: 'CLB-POLO-RED-M', selectedOptions: { Size: 'M', Color: 'Red' } }],
        'POLO',
        { isPublished: false },
      );
      expect(created).toHaveLength(1);
      expect(created[0]).toMatchObject({ sku: 'CLB-POLO-RED-M' });
    });
  });
});
