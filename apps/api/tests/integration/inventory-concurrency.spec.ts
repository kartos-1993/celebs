import { describe, it, expect } from 'vitest';
import prisma from '@/config/db.prisma';
import { InventoryService, OutOfStockError } from '@/modules/inventory/inventory.service';

describe('Inventory Concurrency Integration Test', () => {
  it('should prevent race conditions and allow only available stock to be decremented', async () => {
    const category = await prisma.category.create({
      data: {
        name: 'Concurrency Category',
        slug: `cat-concurrency-${Date.now()}`,
      },
    });

    const parentProduct = await prisma.product.create({
      data: {
        name: 'Concurrency Test Product',
        slug: `prod-concurrency-${Date.now()}`,
        price: 100,
        categoryId: category.id,
      },
    });

    const inventory = await prisma.productInventory.create({
      data: {
        productId: parentProduct.id,
        colorVariantName: 'Black',
        size: 'M',
        sku: `SKU-CONCURRENCY-${Date.now()}`,
        quantity: 2,
        reservedQuantity: 0,
      },
    });

    const requests = [
      InventoryService.decrementStock(inventory.id, 1),
      InventoryService.decrementStock(inventory.id, 1),
      InventoryService.decrementStock(inventory.id, 1),
    ];

    const results = await Promise.allSettled(requests);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled).toHaveLength(2);
    expect(rejected).toHaveLength(1);

    const rejectedReason = (rejected[0] as PromiseRejectedResult).reason;
    expect(rejectedReason).toBeInstanceOf(OutOfStockError);

    const finalRecord = await prisma.productInventory.findUnique({
      where: { id: inventory.id },
    });

    expect(finalRecord?.quantity).toBe(0);
  });
});
