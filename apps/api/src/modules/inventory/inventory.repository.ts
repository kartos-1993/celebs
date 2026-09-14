import { ProductInventory } from '@prisma/client';

import { generateSku } from '@celebs/shared-utils';

import prisma, { Prisma } from '@/config/db.prisma';

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

  /** Live quantities for publish-floor and stock derivations. */
  public async findQuantitiesByProductId(productId: string): Promise<Array<{ quantity: number }>> {
    return prisma.productInventory.findMany({
      where: { productId },
      select: { quantity: true },
    });
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

  /**
   * Reconciles inventory rows with the product's current variant/size combos.
   * Batched: the loop below is memory-only (dedupe + SKU resolution); all writes
   * execute as set-based statements (createMany + one UPDATE + prune), so a
   * 3-color x 5-size matrix holds the pooled connection for ~4 round-trips
   * instead of ~17. Rows are sorted before writing for deterministic lock order.
   * Must run inside the caller's transaction (PgBouncer 6543 safety).
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

    // Memory-only pass: dedupe combos + resolve SKUs, no I/O.
    const rows: Array<{ colorVariantName: string; size: string; sku: string; quantity: number }> =
      [];
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

        const matchKey1 = `color:${colorVariantName.toLowerCase()}|size:${sizeKey}`;
        const matchKey2 = `color:${baseName.toLowerCase()}|size:${sizeKey}`;
        const sku =
          skuMap.get(matchKey1) ||
          skuMap.get(matchKey2) ||
          generateSku({ brandPrefix: 'c', department: departmentHint });

        rows.push({ colorVariantName, size, sku, quantity: stockItem.quantity ?? 0 });
      }
    }

    if (rows.length === 0) return;

    // Deterministic lock order eliminates 40P01 deadlocks under concurrent saves.
    rows.sort(
      (a, b) =>
        a.colorVariantName.localeCompare(b.colorVariantName) || a.size.localeCompare(b.size),
    );

    const existingInventories = await tx.productInventory.findMany({
      where: { productId },
      select: { id: true, colorVariantName: true, size: true },
    });
    const existingByKey = new Map(
      existingInventories.map((inv) => [
        `${inv.colorVariantName.toLowerCase()}:::${inv.size.toLowerCase()}`,
        inv.id,
      ]),
    );

    const toCreate: Array<{
      productId: string;
      colorVariantName: string;
      size: string;
      sku: string;
      quantity: number;
    }> = [];
    const toUpdate: Array<{ id: string; sku: string; quantity: number }> = [];
    for (const row of rows) {
      const id = existingByKey.get(
        `${row.colorVariantName.toLowerCase()}:::${row.size.toLowerCase()}`,
      );
      if (id) {
        toUpdate.push({ id, sku: row.sku, quantity: row.quantity });
      } else {
        toCreate.push({ productId, ...row });
      }
    }

    // Statement 1: inserts (single round-trip; P2002 on sku surfaces for service retry).
    if (toCreate.length > 0) {
      await tx.productInventory.createMany({ data: toCreate });
    }

    // Statement 2: updates (single round-trip for all rows).
    if (toUpdate.length > 0) {
      await tx.$executeRaw`
        UPDATE "ProductInventory" AS p
        SET "sku" = u.sku, "quantity" = u.qty, "updatedAt" = NOW()
        FROM (
          SELECT
            unnest(${toUpdate.map((u) => u.id)}::text[]) AS id,
            unnest(${toUpdate.map((u) => u.sku)}::text[]) AS sku,
            unnest(${toUpdate.map((u) => u.quantity)}::int[]) AS qty
        ) AS u
        WHERE p.id = u.id
      `;
    }

    // Statement 3+: prune orphaned rows — delete those without order history, zero the rest.
    const activeSet = new Set(
      rows.map((k) => `${k.colorVariantName.toLowerCase()}:::${k.size.toLowerCase()}`),
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

export const inventoryRepository = new InventoryRepository();
