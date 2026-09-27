import { ProductInventory } from '@prisma/client';

import {
  AppError,
  buildProductStyleRef,
  buildVariantKey,
  ErrorCode,
  generateRetailSku,
  HTTPSTATUS,
  logger,
} from '@celebs/shared-utils';

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

  public async findInventoriesByProductId(
    productId: string,
    tx: Prisma.TransactionClient = prisma,
  ): Promise<
    Array<{
      colorVariantName: string;
      size: string;
      quantity: number;
      reservedQuantity: number;
    }>
  > {
    return tx.productInventory.findMany({
      where: { productId },
      select: {
        colorVariantName: true,
        size: true,
        quantity: true,
        reservedQuantity: true,
      },
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
    skus?: Array<{
      skuCode?: string;
      selectedOptions?: Record<string, unknown>;
      isDefault?: boolean;
    }>,
    departmentHint?: string,
    options?: { isPublished?: boolean; styleSalt?: string },
  ): Promise<void> {
    if (!colorVariants || !Array.isArray(colorVariants)) return;

    const seenVariantNames = new Map<string, number>();

    // Index skus dynamically by canonical sorted option values.
    // KEY SCHEME A (pinned, ): buildVariantKey — trimmed, lowercased,
    // sorted, Default-filtered, ':::'-joined. Used for skuMap + rowKey only;
    // the published-removal / existingByKey / activeSet lookups below use a
    // DIFFERENT raw `${lower}:::${lower}` template (Scheme B) that keeps
    // 'default' segments and is order-sensitive.
    // @todo-fix: unify on one canonical key builder.
    const skuMap = new Map<string, string>();
    let singleFallbackSku: string | undefined;

    if (Array.isArray(skus)) {
      for (const s of skus) {
        if (!s?.skuCode) continue;
        const code = s.skuCode.trim();
        if (!code) continue;

        if (!singleFallbackSku || s.isDefault) {
          singleFallbackSku = code;
        }

        const options = s.selectedOptions;
        const values =
          options && typeof options === 'object' ? Object.values(options).map(String) : [];

        const valueKey = buildVariantKey(values);
        skuMap.set(valueKey, code);
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
        const normSize = size.toLowerCase();
        if (seenSizes.has(normSize)) continue;
        seenSizes.add(normSize);

        const rowKey = buildVariantKey([baseName, size]);

        const sku =
          skuMap.get(rowKey) ||
          skuMap.get('') ||
          singleFallbackSku ||
          generateRetailSku({
            brandToken: 'CLB',
            // the fix: callers thread an explicit styleSalt so SKU-conflict
            // retries mint a provably fresh salt instead of relying on the
            // implicit Math.random re-roll inside buildProductStyleRef.
            styleRef: buildProductStyleRef(departmentHint, options?.styleSalt),
            options: [colorVariantName, size],
          });

        rows.push({ colorVariantName, size, sku, quantity: stockItem.quantity ?? 0 });
      }
    }

    const seenSkus = new Set<string>();
    for (const row of rows) {
      if (seenSkus.has(row.sku)) {
        const message = `Duplicate SKU "${row.sku}" found in product variants. Every variant must have a unique SKU code.`;
        throw Object.assign(
          new AppError(message, HTTPSTATUS.BAD_REQUEST, ErrorCode.VALIDATION_ERROR),
          { details: [{ field: 'skus', message }] },
        );
      }
      seenSkus.add(row.sku);
    }

    const existingInventories = await tx.productInventory.findMany({
      where: { productId },
      select: { id: true, colorVariantName: true, size: true, sku: true },
    });

    // the fix (lock ordering): this published removal/SKU-lock validation runs
    // AFTER the read but BEFORE any insert/update/delete, so violations never
    // partially write. It is the ONLY removal guard — the duplicate check that
    // used to sit after the writes was removed; both incoming keys and
    // existing inventories are available here, so nothing executes pre-throw.
    if (options?.isPublished && existingInventories.length > 0) {
      const incomingKeySet = new Set(
        rows.map((k) => `${k.colorVariantName.toLowerCase()}:::${k.size.toLowerCase()}`),
      );
      const removedKeys = existingInventories
        .filter(
          (inv) =>
            !incomingKeySet.has(
              `${inv.colorVariantName.toLowerCase()}:::${inv.size.toLowerCase()}`,
            ),
        )
        .map((inv) => `${inv.colorVariantName}/${inv.size}`);
      if (removedKeys.length > 0) {
        const message =
          'Cannot remove variants from an already published product. Set stock quantity to 0 instead.';
        throw Object.assign(
          new AppError(message, HTTPSTATUS.BAD_REQUEST, ErrorCode.INVALID_REQUEST),
          { details: removedKeys.map((key) => ({ field: key, message })) },
        );
      }
    }

    // the fix (empty-rows prune): no early return — when rows is empty every
    // existing row is an orphan and falls into the prune path below (delete
    // iff no order history, else zero-out).

    // Deterministic lock order eliminates 40P01 deadlocks under concurrent saves.
    rows.sort(
      (a, b) =>
        a.colorVariantName.localeCompare(b.colorVariantName) || a.size.localeCompare(b.size),
    );

    const existingByKey = new Map(
      existingInventories.map((inv) => [
        `${inv.colorVariantName.toLowerCase()}:::${inv.size.toLowerCase()}`,
        inv,
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
      const existing = existingByKey.get(
        `${row.colorVariantName.toLowerCase()}:::${row.size.toLowerCase()}`,
      );
      if (existing) {
        if (
          options?.isPublished &&
          existing.sku &&
          row.sku &&
          existing.sku.trim() !== row.sku.trim()
        ) {
          const variantKey = `${row.colorVariantName}/${row.size}`;
          const message = `Cannot modify SKU for published variant "${variantKey}". Existing SKU is "${existing.sku}", received "${row.sku}".`;
          throw Object.assign(
            new AppError(message, HTTPSTATUS.BAD_REQUEST, ErrorCode.INVALID_REQUEST),
            { details: [{ field: variantKey, message }] },
          );
        }
        const resolvedSku = (options?.isPublished ? existing.sku : row.sku) || existing.sku;
        toUpdate.push({ id: existing.id, sku: resolvedSku, quantity: row.quantity });
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
      // the fix (orphan prune FK handling): the removal guard above already ran
      // pre-write, so no second published check is needed here. Delete ONLY
      // history-free rows (the orderItems filter is evaluated by the database
      // before deleting — no blind catch); survivors keep their order history
      // and are zeroed instead, with the reason logged.
      await tx.productInventory.deleteMany({
        where: {
          id: { in: toDeleteIds },
          orderItems: { none: {} },
        },
      });

      const survivors = await tx.productInventory.findMany({
        where: { id: { in: toDeleteIds } },
        select: { id: true },
      });

      if (survivors.length > 0) {
        const survivorIds = survivors.map((s) => s.id);
        logger.warn(
          { productId, inventoryIds: survivorIds },
          'Orphan inventory prune: rows have order history, zeroing quantity instead of delete',
        );
        await tx.productInventory.updateMany({
          where: { id: { in: survivorIds } },
          data: { quantity: 0 },
        });
      }
    }
  }
}

export const inventoryRepository = new InventoryRepository();
