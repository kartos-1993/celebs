import prisma, { Prisma } from '@/config/db.prisma';

export class PostgresInventoryRepository {
  public async createInventoryRecord(
    data: {
      productId: string;
      colorVariantName: string;
      size: string;
      sku: string;
      quantity: number;
      warehouseId?: string;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || prisma;
    return await client.productInventory.create({
      data: {
        productId: data.productId,
        colorVariantName: data.colorVariantName,
        size: data.size,
        sku: data.sku,
        quantity: data.quantity,
        warehouseId: data.warehouseId,
      },
    });
  }

  public async upsertInventoryRecord(
    data: {
      productId: string;
      colorVariantName: string;
      size: string;
      sku: string;
      quantity: number;
      warehouseId?: string;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || prisma;
    return await client.productInventory.upsert({
      where: {
        productId_colorVariantName_size: {
          productId: data.productId,
          colorVariantName: data.colorVariantName,
          size: data.size,
        },
      },
      update: {
        sku: data.sku,
        quantity: data.quantity,
        warehouseId: data.warehouseId,
      },
      create: {
        productId: data.productId,
        colorVariantName: data.colorVariantName,
        size: data.size,
        sku: data.sku,
        quantity: data.quantity,
        warehouseId: data.warehouseId,
      },
    });
  }

  public async findByProductId(productId: string, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return await client.productInventory.findMany({
      where: { productId },
    });
  }

  public async deleteOrphanedInventories(
    productId: string,
    activeComboKeys: Array<{ colorVariantName: string; size: string }>,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const client = tx || prisma;
    const existing = await client.productInventory.findMany({
      where: { productId },
      select: { id: true, colorVariantName: true, size: true },
    });

    const activeSet = new Set(
      activeComboKeys.map(
        (c) => `${c.colorVariantName.trim().toLowerCase()}|${c.size.trim().toLowerCase()}`,
      ),
    );

    const orphanedIds = existing
      .filter(
        (item) =>
          !activeSet.has(
            `${item.colorVariantName.trim().toLowerCase()}|${item.size.trim().toLowerCase()}`,
          ),
      )
      .map((item) => item.id);

    if (orphanedIds.length > 0) {
      await client.productInventory.deleteMany({
        where: { id: { in: orphanedIds } },
      });
    }

    return orphanedIds.length;
  }

  public async createOutboxEvent(
    data: {
      aggregate: string;
      eventType: string;
      payload: Prisma.InputJsonValue;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || prisma;
    return await client.outboxEvent.create({
      data: {
        aggregate: data.aggregate,
        eventType: data.eventType,
        payload: data.payload,
      },
    });
  }

  public async deleteByInventoryId(id: string, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return await client.productInventory.delete({
      where: { id },
    });
  }
}
