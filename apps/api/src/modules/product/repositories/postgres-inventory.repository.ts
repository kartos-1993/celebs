import { prisma } from '@/config/db.prisma';

export class PostgresInventoryRepository {
  public async createInventoryRecord(data: {
    productId: string;
    colorVariantName: string;
    size: string;
    sku: string;
    quantity: number;
    warehouseId?: string;
  }) {
    return await prisma.productInventory.create({
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

  public async createOutboxEvent(data: { aggregate: string; eventType: string; payload: any }) {
    return await prisma.outboxEvent.create({
      data: {
        aggregate: data.aggregate,
        eventType: data.eventType,
        payload: data.payload,
      },
    });
  }

  public async findByProductId(productId: string) {
    return await prisma.productInventory.findFirst({
      where: { productId },
    });
  }

  public async repairMissingInventoryRecord(data: {
    productId: string;
    sku: string;
    quantity: number;
    colorVariantName?: string;
    size?: string;
  }) {
    return await prisma.productInventory.create({
      data: {
        productId: data.productId,
        colorVariantName: data.colorVariantName || 'Default',
        size: data.size || 'Standard',
        sku: data.sku,
        quantity: data.quantity,
      },
    });
  }

  public async deleteByInventoryId(id: string) {
    return await prisma.productInventory.delete({
      where: { id },
    });
  }
}
