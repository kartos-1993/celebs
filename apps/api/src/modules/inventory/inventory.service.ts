import prisma from '../../db';
import { ProductModel } from '../../db/models/product.model';
import { logger } from '@celebs/shared-utils';

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
   * Find or auto-sync inventory from MongoDB Product document into PostgreSQL ProductInventory
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
      logger.info({ inventoryId: existing.id, available }, '[InventoryService] Found existing inventory in Postgres');
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


    // Lookup stock from MongoDB product document to initialize PostgreSQL inventory
    let initialQty = 10; // Default fallback if product stock is unspecified
    try {
      const product = await ProductModel.findById(productId).exec();
      if (product && product.colorVariants) {
        const variant = product.colorVariants.find(
          (v) => v.name.toLowerCase() === colorVariantName.toLowerCase()
        );
        if (variant && variant.stocks) {
          const stockItem = variant.stocks.find(
            (s) => s.size.toLowerCase() === size.toLowerCase()
          );
          if (stockItem && typeof stockItem.quantity === 'number') {
            initialQty = stockItem.quantity;
          }
        }
      }
    } catch {
      // Keep default initialQty if Mongo lookup fails
    }

    const sku = `SKU-${productId.substring(productId.length - 6)}-${colorVariantName
      .substring(0, 3)
      .toUpperCase()}-${size.toUpperCase()}`;

    const created = await prisma.productInventory.create({
      data: {
        productId,
        colorVariantName,
        size,
        sku,
        quantity: initialQty,
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

  /**
   * Check stock availability for a given product variant and size
   */
  static async checkStock(
    productId: string,
    colorVariantName: string,
    size: string
  ): Promise<StockCheckResult> {
    return this.findOrCreateInventory(productId, colorVariantName, size);
  }
}
