import { generateSheinStyleSku } from '@celebs/shared-utils';

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

  /**
   * Reconciles inventory rows with the product's current variant/size combos:
   * upserts every active combo (deduped, SKU from payload map or generated) and
   * prunes orphaned rows — deleting those without order history, zeroing the rest.
   */
  public async syncProductInventory(
    tx: Prisma.TransactionClient,
    productId: string,
    colorVariants?: Array<{
      name?: string;
      stocks?: Array<{ size?: string; quantity?: number }>;
    }>,
    skus?: Array<{ skuCode?: string; selectedOptions?: Record<string, unknown> }>,
    departmentHint?: string,
  ): Promise<void> {
    if (!colorVariants || !Array.isArray(colorVariants)) return;

    const seenVariantNames = new Map<string, number>();
    const activeComboKeys: Array<{ colorVariantName: string; size: string }> = [];

    const skuMap = new Map<string, string>();
    if (Array.isArray(skus)) {
      for (const s of skus) {
        if (s?.skuCode && s?.selectedOptions) {
          const optEntries = Object.entries(s.selectedOptions)
            .map(([k, v]) => `${k.toLowerCase()}:${String(v).toLowerCase().trim()}`)
            .sort()
            .join('|');
          skuMap.set(optEntries, s.skuCode.trim());
        }
      }
    }

    for (const variant of colorVariants) {
      const baseName = variant.name?.trim() || 'Default';
      const count = seenVariantNames.get(baseName) || 0;
      seenVariantNames.set(baseName, count + 1);
      const colorVariantName = count > 0 ? `${baseName} (${count + 1})` : baseName;

      if (!variant.stocks || !Array.isArray(variant.stocks)) continue;

      const seenSizes = new Set<string>();

      for (const stockItem of variant.stocks) {
        const size = stockItem.size?.trim() || 'Default';
        const sizeKey = size.toLowerCase();
        if (seenSizes.has(sizeKey)) continue;
        seenSizes.add(sizeKey);

        const quantity = stockItem.quantity ?? 0;
        activeComboKeys.push({ colorVariantName, size });

        const matchKey1 = `color:${colorVariantName.toLowerCase()}|size:${sizeKey}`;
        const matchKey2 = `color:${baseName.toLowerCase()}|size:${sizeKey}`;
        let sku = skuMap.get(matchKey1) || skuMap.get(matchKey2);

        if (!sku) {
          sku = generateSheinStyleSku({
            brandPrefix: 'c',
            department: departmentHint,
          });
        }

        await this.upsertInventoryRecord(
          {
            productId,
            colorVariantName,
            size,
            sku,
            quantity,
          },
          tx,
        );
      }
    }

    // Prune orphaned inventory rows if variants/sizes were removed from the product
    if (activeComboKeys.length > 0) {
      const existingInventories = await tx.productInventory.findMany({
        where: { productId },
        select: { id: true, colorVariantName: true, size: true },
      });

      const activeSet = new Set(
        activeComboKeys.map((k) => `${k.colorVariantName.toLowerCase()}:::${k.size.toLowerCase()}`),
      );
      const toDeleteIds: string[] = [];

      for (const inv of existingInventories) {
        const key = `${inv.colorVariantName.toLowerCase()}:::${inv.size.toLowerCase()}`;
        if (!activeSet.has(key)) {
          toDeleteIds.push(inv.id);
        }
      }

      if (toDeleteIds.length > 0) {
        await tx.productInventory
          .deleteMany({
            where: {
              id: { in: toDeleteIds },
              orderItems: { none: {} },
            },
          })
          .catch(() => null);

        await tx.productInventory.updateMany({
          where: { id: { in: toDeleteIds } },
          data: { quantity: 0 },
        });
      }
    }
  }
}
