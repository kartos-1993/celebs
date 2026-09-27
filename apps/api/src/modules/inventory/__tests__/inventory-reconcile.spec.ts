import type { Prisma } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';

import { inventoryRepository } from '../inventory.repository';

interface MockTx {
  tx: Prisma.TransactionClient;
  created: unknown[];
  rawUpdates: unknown[];
  productInventory: {
    findMany: ReturnType<typeof vi.fn>;
    createMany: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
}

type Overrides = Partial<
  Record<'deleteMany' | 'updateMany' | 'createMany', (args: unknown) => Promise<unknown>>
> & {
  /**
   * Successive `productInventory.findMany` resolutions. Sync needs two reads on
   * the prune path: the existing rows, then the survivors that the
   * history-filtered delete left behind.
   */
  findMany?: unknown[][];
};

const createMockTx = (
  existingRows: Array<{ id: string; colorVariantName: string; size: string; sku: string }> = [],
  overrides: Overrides = {},
): MockTx => {
  const created: unknown[] = [];
  const rawUpdates: unknown[] = [];
  const findManyResults = overrides.findMany ?? [existingRows];
  const productInventory = {
    findMany: vi.fn().mockImplementation(() => {
      const next =
        findManyResults[
          Math.min(productInventory.findMany.mock.calls.length - 1, findManyResults.length - 1)
        ];
      return Promise.resolve(next);
    }),
    createMany: vi.fn().mockImplementation(({ data }: { data: unknown[] }) => {
      created.push(...data);
      return Promise.resolve({ count: data.length });
    }),
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    updateMany: vi.fn().mockResolvedValue({ count: 0 }),
  };
  if (overrides.deleteMany) {
    productInventory.deleteMany.mockImplementation(overrides.deleteMany as never);
  }
  if (overrides.updateMany) {
    productInventory.updateMany.mockImplementation(overrides.updateMany as never);
  }
  if (overrides.createMany) {
    productInventory.createMany.mockImplementation(overrides.createMany as never);
  }
  const tx = {
    productInventory,
    $executeRaw: vi.fn().mockImplementation((...args: unknown[]) => {
      rawUpdates.push(args);
      return Promise.resolve(1);
    }),
  } as unknown as Prisma.TransactionClient;
  return { tx, created, rawUpdates, productInventory };
};

describe('inventory reconcile pure logic (mock tx, no DB)', () => {
  it('dedupes repeated variant names with " (n)" suffixes', async () => {
    const { tx, created } = createMockTx();
    await inventoryRepository.syncProductInventory(
      tx,
      'prod-1',
      [
        { name: 'Red', stocks: [{ size: 'S', quantity: 1 }] },
        { name: 'Red', stocks: [{ size: 'M', quantity: 2 }] },
      ],
      undefined,
      'SHIRTS',
      { isPublished: false },
    );
    expect(created).toHaveLength(2);
    const names = (created as Array<{ colorVariantName: string }>).map((c) => c.colorVariantName);
    expect(names).toContain('Red');
    expect(names).toContain('Red (2)');
  });

  it('dedupes sizes case-insensitively within a variant (first wins)', async () => {
    const { tx, created } = createMockTx();
    await inventoryRepository.syncProductInventory(
      tx,
      'prod-2',
      [
        {
          name: 'Red',
          stocks: [
            { size: 'M', quantity: 5 },
            { size: 'm', quantity: 9 },
          ],
        },
      ],
      undefined,
      'SHIRTS',
      { isPublished: false },
    );
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({ size: 'M', quantity: 5 });
  });

  it('throws on duplicate resolved SKUs across rows', async () => {
    const { tx } = createMockTx();
    await expect(
      inventoryRepository.syncProductInventory(
        tx,
        'prod-3',
        [
          { name: 'Red', stocks: [{ size: 'S', quantity: 1 }] },
          { name: 'Blue', stocks: [{ size: 'S', quantity: 1 }] },
        ],
        [{ skuCode: 'SAME-SKU', selectedOptions: {} }],
        'SHIRTS',
        { isPublished: false },
      ),
    ).rejects.toThrow(/Duplicate SKU "SAME-SKU"/);
  });

  it('sorts rows deterministically (lock order) before writing', async () => {
    const { tx, created } = createMockTx();
    await inventoryRepository.syncProductInventory(
      tx,
      'prod-4',
      [
        {
          name: 'Red',
          stocks: [
            { size: 'M', quantity: 1 },
            { size: 'S', quantity: 1 },
          ],
        },
        { name: 'Blue', stocks: [{ size: 'S', quantity: 1 }] },
      ],
      undefined,
      'SHIRTS',
      { isPublished: false },
    );
    const keys = (created as Array<{ colorVariantName: string; size: string }>).map(
      (c) => `${c.colorVariantName}/${c.size}`,
    );
    expect(keys).toEqual(['Blue/S', 'Red/M', 'Red/S']);
  });

  it('rows.length===0 runs the orphan path: history-free rows are deleted', async () => {
    // The old `if (rows.length === 0) return` short-circuited before the prune,
    // so a variant emptied of sizes left its stale inventory row behind forever.
    // With no early return, every existing row is an orphan: delete iff no order
    // history, otherwise zero out.
    const existing = [{ id: 'inv-old', colorVariantName: 'Red', size: 'S', sku: 'OLD' }];
    const { tx, productInventory } = createMockTx(existing, { findMany: [existing, []] });
    await inventoryRepository.syncProductInventory(
      tx,
      'prod-5',
      [{ name: 'Red', stocks: [] }],
      undefined,
      'SHIRTS',
      { isPublished: false },
    );
    // read 1: existing rows; read 2: survivors after the history-filtered delete
    expect(productInventory.findMany).toHaveBeenCalledTimes(2);
    expect(productInventory.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['inv-old'] }, orderItems: { none: {} } },
    });
    // no survivors => nothing to zero out
    expect(productInventory.updateMany).not.toHaveBeenCalled();
  });

  it('rows.length===0 zeroes out orphans that DO have order history', async () => {
    const existing = [{ id: 'inv-kept', colorVariantName: 'Red', size: 'S', sku: 'OLD' }];
    const { tx, productInventory } = createMockTx(existing, { findMany: [existing, existing] });
    await inventoryRepository.syncProductInventory(
      tx,
      'prod-5c',
      [{ name: 'Red', stocks: [] }],
      undefined,
      'SHIRTS',
      { isPublished: false },
    );
    // The DB-side orderItems filter refused the delete, so the row survived.
    expect(productInventory.deleteMany).toHaveBeenCalled();
    expect(productInventory.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['inv-kept'] } },
      data: { quantity: 0 },
    });
  });

  it('published removal guard runs BEFORE any write (lock-check-then-write ordering)', async () => {
    // Full pre-write check: the removal guard, the duplicate-SKU guard and the
    // published SKU-immutability guard all fire before the first insert/update/
    // delete, so a rejected edit never partially writes.
    const existing = [{ id: 'inv-1', colorVariantName: 'Red', size: 'S', sku: 'LOCKED' }];
    const { tx, productInventory } = createMockTx(existing);
    await expect(
      inventoryRepository.syncProductInventory(
        tx,
        'prod-6',
        [{ name: 'Blue', stocks: [{ size: 'S', quantity: 1 }] }],
        undefined,
        'SHIRTS',
        { isPublished: true },
      ),
    ).rejects.toThrow(/Cannot remove variants from an already published product/);
    expect(productInventory.createMany).not.toHaveBeenCalled();
    expect(tx.$executeRaw).not.toHaveBeenCalled();
    expect(productInventory.deleteMany).not.toHaveBeenCalled();
    expect(productInventory.updateMany).not.toHaveBeenCalled();
  });

  it('published removal lock reports the removed variant keys as field details', async () => {
    const existing = [{ id: 'inv-1', colorVariantName: 'Red', size: 'S', sku: 'LOCKED' }];
    const { tx } = createMockTx(existing);
    const err = (await inventoryRepository
      .syncProductInventory(
        tx,
        'prod-6b',
        [{ name: 'Blue', stocks: [{ size: 'S', quantity: 1 }] }],
        undefined,
        'SHIRTS',
        { isPublished: true },
      )
      .catch((e: unknown) => e)) as { details?: unknown };
    expect(err.details).toEqual([
      {
        field: 'Red/S',
        message:
          'Cannot remove variants from an already published product. Set stock quantity to 0 instead.',
      },
    ]);
  });

  it('published SKU immutability is checked before any write', async () => {
    const existing = [{ id: 'inv-1', colorVariantName: 'Red', size: 'S', sku: 'LOCKED' }];
    const { tx, productInventory } = createMockTx(existing);
    const err = (await inventoryRepository
      .syncProductInventory(
        tx,
        'prod-6c',
        [{ name: 'Red', stocks: [{ size: 'S', quantity: 2 }] }],
        [{ skuCode: 'RENAMED', selectedOptions: { color: 'Red', size: 'S' } }],
        'SHIRTS',
        { isPublished: true },
      )
      .catch((e: unknown) => e)) as { details?: unknown };
    expect(productInventory.createMany).not.toHaveBeenCalled();
    expect(tx.$executeRaw).not.toHaveBeenCalled();
    expect(err.details).toEqual([
      {
        field: 'Red/S',
        message:
          'Cannot modify SKU for published variant "Red/S". Existing SKU is "LOCKED", received "RENAMED".',
      },
    ]);
  });

  it('orphan prune deletes only history-free rows (DB-filtered), never a blind catch-and-zero', async () => {
    // The old code called deleteMany() and swallowed any rejection with
    // .catch(() => null), so an FK-blocked orphan was silently kept and zeroed
    // without the caller ever learning. Order history is now evaluated by the
    // database BEFORE the delete, and survivors are zeroed with a logged reason.
    const existing = [{ id: 'inv-old', colorVariantName: 'Old', size: 'S', sku: 'OLD' }];
    const { tx, productInventory } = createMockTx(existing, { findMany: [existing, []] });
    await inventoryRepository.syncProductInventory(
      tx,
      'prod-7',
      [{ name: 'New', stocks: [{ size: 'S', quantity: 3 }] }],
      undefined,
      'SHIRTS',
      { isPublished: false },
    );
    expect(productInventory.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['inv-old'] }, orderItems: { none: {} } },
    });
    expect(productInventory.updateMany).not.toHaveBeenCalled();
  });

  it('orphan prune surfaces a real delete failure instead of swallowing it', async () => {
    const existing = [{ id: 'inv-old', colorVariantName: 'Old', size: 'S', sku: 'OLD' }];
    const { tx, productInventory } = createMockTx(existing, {
      deleteMany: () => Promise.reject(new Error('FK violation P2003')),
    });
    await expect(
      inventoryRepository.syncProductInventory(
        tx,
        'prod-7b',
        [{ name: 'New', stocks: [{ size: 'S', quantity: 3 }] }],
        undefined,
        'SHIRTS',
        { isPublished: false },
      ),
    ).rejects.toThrow(/FK violation P2003/);
    // No silent fallback write after a failed delete.
    expect(productInventory.updateMany).not.toHaveBeenCalled();
  });

  it('departmentHint feeds generated-SKU styleRef verbatim (real name, not an id)', async () => {
    // service.ts forwards a real department name/path (or the product name) on
    // BOTH create and update, so buildProductStyleRef derives the same prefix.
    // A category row id used to be passed instead, producing "CLB-A1B2…" style
    // refs from id characters.
    const { tx, created } = createMockTx();
    await inventoryRepository.syncProductInventory(
      tx,
      'prod-8',
      [{ name: 'Red', stocks: [{ size: 'M', quantity: 1 }] }],
      undefined,
      'Titanium Phone Pro',
      { isPublished: false },
    );
    expect(created).toHaveLength(1);
    const sku = (created[0] as { sku: string }).sku;
    expect(sku.startsWith('CLB-TITA')).toBe(true);
    expect(sku).toContain('RED');
  });

  it('styleSalt is threaded into the styleRef so SKU-conflict retries mint fresh SKUs', async () => {
    const { tx, created } = createMockTx();
    await inventoryRepository.syncProductInventory(
      tx,
      'prod-9',
      [{ name: 'Red', stocks: [{ size: 'M', quantity: 1 }] }],
      undefined,
      'Titanium Phone Pro',
      { isPublished: false, styleSalt: 'ZZZZ' },
    );
    expect((created[0] as { sku: string }).sku.startsWith('CLB-TITAZZZZ')).toBe(true);
  });
});
