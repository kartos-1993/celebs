import { AppError, ErrorCode, HTTPSTATUS, logger } from '@celebs/shared-utils';
import prisma from '@/config/db.prisma';

export class OutOfStockError extends AppError {
  constructor(message: string) {
    super(message, HTTPSTATUS.BAD_REQUEST, ErrorCode.VALIDATION_ERROR);
    this.name = 'OutOfStockError';
  }
}

export interface StockCheckResult {
  inventoryId: string;
  productId: string;
  colorVariantName: string;
  size: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  isAvailable: boolean;
}

export class InventoryService {
  /**
   * Atomic PostgreSQL stock decrement to prevent race conditions during concurrent orders.
   */
  static async decrementStock(inventoryId: string, quantity: number): Promise<{ id: string; quantity: number }> {
    logger.info({ inventoryId, quantity }, '[InventoryService.decrementStock] Attempting stock decrement');

    const updatedRows: Array<{ id: string; quantity: number }> = await prisma.$queryRaw`
      UPDATE "ProductInventory"
      SET "quantity" = "quantity" - ${quantity}
      WHERE "id" = ${inventoryId} AND "quantity" >= ${quantity}
      RETURNING "id", "quantity"
    `;

    if (!updatedRows || updatedRows.length === 0) {
      throw new OutOfStockError(`Insufficient stock available for inventory item ${inventoryId}`);
    }

    return updatedRows[0]!;
  }

  /**
   * Find or auto-sync inventory from Product record into PostgreSQL ProductInventory
   */
  static async findOrCreateInventory(
    productId: string,
    colorVariantName: string,
    size: string
  ): Promise<StockCheckResult> {
    logger.info({ productId, colorVariantName, size }, '[InventoryService] Looking up inventory');
    const existing = await prisma.productInventory.findUnique({
      where: {
        productId_colorVariantName_size: {
          productId,
          colorVariantName,
          size,
        },
      },
    });

    if (existing) {
      const available = existing.quantity - existing.reservedQuantity;
      logger.info(
        { inventoryId: existing.id, available },
        '[InventoryService] Found existing inventory in Postgres'
      );
      return {
        inventoryId: existing.id,
        productId: existing.productId,
        colorVariantName: existing.colorVariantName,
        size: existing.size,
        quantity: existing.quantity,
        reservedQuantity: existing.reservedQuantity,
        availableQuantity: available > 0 ? available : 0,
        isAvailable: available > 0,
      };
    }

    let initialQty = 10;
    try {
      const product = await prisma.product.findUnique({ where: { id: productId } });
      if (product && Array.isArray(product.colorVariants)) {
        const variants = product.colorVariants as Array<{ name: string; stocks?: Array<{ size: string; quantity: number }> }>;
        const variant = variants.find(
          (v) => v.name.toLowerCase() === colorVariantName.toLowerCase()
        );
        if (variant && variant.stocks) {
          const stockItem = variant.stocks.find((s) => s.size.toLowerCase() === size.toLowerCase());
          if (stockItem && typeof stockItem.quantity === 'number') {
            initialQty = stockItem.quantity;
          }
        }
      }
    } catch {
      // Keep default initialQty
    }

    const sku = `SKU-${productId.substring(Math.max(0, productId.length - 6))}-${colorVariantName
      .substring(0, 3)
      .toUpperCase()}-${size.toUpperCase()}`;

    const created = await prisma.productInventory.create({
      data: {
        productId,
        colorVariantName,
        size,
        sku,
        quantity: initialQty,
        reservedQuantity: 0,
      },
    });

    const available = created.quantity - created.reservedQuantity;
    return {
      inventoryId: created.id,
      productId: created.productId,
      colorVariantName: created.colorVariantName,
      size: created.size,
      quantity: created.quantity,
      reservedQuantity: created.reservedQuantity,
      availableQuantity: available > 0 ? available : 0,
      isAvailable: available > 0,
    };
  }
}
