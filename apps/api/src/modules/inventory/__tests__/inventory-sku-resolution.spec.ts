import type { Prisma } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';

import { inventoryRepository } from '../inventory.repository';

describe('Inventory SKU Resolution & Permutation Matching', () => {
  const createMockTx = (
    existingRows: Array<{
      id: string;
      colorVariantName: string;
      size: string;
      sku: string;
      quantity: number;
    }> = [],
  ) => {
    const created: unknown[] = [];
    const updated: unknown[] = [];

    const tx = {
      productInventory: {
        findMany: vi.fn().mockResolvedValue(existingRows),
        createMany: vi.fn().mockImplementation(({ data }) => {
          created.push(...data);
          return Promise.resolve({ count: data.length });
        }),
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      $executeRaw: vi
        .fn()
        .mockImplementation((strings: TemplateStringsArray, ...values: unknown[]) => {
          updated.push({ strings, values });
          return Promise.resolve(1);
        }),
    } as unknown as Prisma.TransactionClient;

    return { tx, created, updated };
  };

  it('matches single product with no variants to default SKU', async () => {
    const { tx, created } = createMockTx();

    await inventoryRepository.syncProductInventory(
      tx,
      'prod-1',
      [{ name: 'Default', stocks: [{ size: 'Default', quantity: 10 }] }],
      [{ skuCode: 'CLB-BAG-STD', selectedOptions: {} }],
      'BAG',
      { isPublished: false },
    );

    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({
      productId: 'prod-1',
      colorVariantName: 'Default',
      size: 'Default',
      sku: 'CLB-BAG-STD',
      quantity: 10,
    });
  });

  it('matches size-only product without color to size-keyed SKU', async () => {
    const { tx, created } = createMockTx();

    await inventoryRepository.syncProductInventory(
      tx,
      'prod-2',
      [
        {
          name: 'Default',
          stocks: [
            { size: 'S', quantity: 5 },
            { size: 'M', quantity: 8 },
          ],
        },
      ],
      [
        { skuCode: 'CLB-TEE-S', selectedOptions: { Size: 'S' } },
        { skuCode: 'CLB-TEE-M', selectedOptions: { Size: 'M' } },
      ],
      'SHIRT',
      { isPublished: false },
    );

    expect(created).toHaveLength(2);
    const sItem = (created as Array<{ size: string }>).find((c) => c.size === 'S');
    const mItem = (created as Array<{ size: string }>).find((c) => c.size === 'M');
    expect(sItem).toMatchObject({
      colorVariantName: 'Default',
      size: 'S',
      sku: 'CLB-TEE-S',
      quantity: 5,
    });
    expect(mItem).toMatchObject({
      colorVariantName: 'Default',
      size: 'M',
      sku: 'CLB-TEE-M',
      quantity: 8,
    });
  });

  it('matches multi-color and multi-size matrix to composite options', async () => {
    const { tx, created } = createMockTx();

    await inventoryRepository.syncProductInventory(
      tx,
      'prod-3',
      [
        {
          name: 'Red',
          stocks: [{ size: 'M', quantity: 12 }],
        },
      ],
      [{ skuCode: 'CLB-POLO-RED-M', selectedOptions: { Color: 'Red', Size: 'M' } }],
      'POLO',
      { isPublished: false },
    );

    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({
      colorVariantName: 'Red',
      size: 'M',
      sku: 'CLB-POLO-RED-M',
      quantity: 12,
    });
  });

  it('allows updating SKU for draft products on existing inventory rows', async () => {
    const existing = [
      { id: 'inv-1', colorVariantName: 'Default', size: 'Default', sku: 'OLD-SKU', quantity: 5 },
    ];
    const { tx, updated } = createMockTx(existing);

    await inventoryRepository.syncProductInventory(
      tx,
      'prod-4',
      [{ name: 'Default', stocks: [{ size: 'Default', quantity: 15 }] }],
      [{ skuCode: 'NEW-DRAFT-SKU', selectedOptions: {} }],
      'BAG',
      { isPublished: false },
    );

    expect(updated).toHaveLength(1);
    const sqlValues = (updated[0] as { values: unknown[] }).values;
    // The second unnest array is sku
    const skuArray = sqlValues[1] as string[];
    expect(skuArray).toContain('NEW-DRAFT-SKU');
  });

  it('rejects SKU modification when product is published', async () => {
    const existing = [
      { id: 'inv-1', colorVariantName: 'Default', size: 'Default', sku: 'LOCKED-SKU', quantity: 5 },
    ];
    const { tx } = createMockTx(existing);

    await expect(
      inventoryRepository.syncProductInventory(
        tx,
        'prod-5',
        [{ name: 'Default', stocks: [{ size: 'Default', quantity: 15 }] }],
        [{ skuCode: 'TAMPERED-SKU', selectedOptions: {} }],
        'BAG',
        { isPublished: true },
      ),
    ).rejects.toThrow(/Cannot modify SKU for published variant/);
  });
});
