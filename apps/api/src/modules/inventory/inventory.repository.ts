import { ProductInventory } from '@prisma/client';

import prisma from '@/config/db.prisma';

export interface DecrementResult {
  id: string;
  quantity: number;
}

export class InventoryRepository {
  public async decrementStockAtomic(
    inventoryId: string,
    quantity: number,
  ): Promise<DecrementResult | null> {
    const updatedRows = await prisma.$queryRaw<Array<DecrementResult>>`
      UPDATE "ProductInventory"
      SET "quantity" = "quantity" - ${quantity}
      WHERE "id" = ${inventoryId} AND "quantity" >= ${quantity}
      RETURNING "id", "quantity"
    `;

    return updatedRows[0] ?? null;
  }

  public async findByProductVariantSize(
    productId: string,
    colorVariantName: string,
    size: string,
  ): Promise<ProductInventory | null> {
    return prisma.productInventory.findUnique({
      where: {
        productId_colorVariantName_size: {
          productId,
          colorVariantName,
          size,
        },
      },
    });
  }

  public async findProductColorVariants(productId: string) {
    return prisma.product.findUnique({
      where: { id: productId },
      select: { colorVariants: true },
    });
  }

  public async createInventory(data: {
    productId: string;
    colorVariantName: string;
    size: string;
    sku: string;
    quantity: number;
    reservedQuantity: number;
  }): Promise<ProductInventory> {
    return prisma.productInventory.create({
      data,
    });
  }
}

export const inventoryRepository = new InventoryRepository();
