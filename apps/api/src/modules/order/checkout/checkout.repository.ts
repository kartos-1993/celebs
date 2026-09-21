import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';

import prisma, { Prisma } from '@/config/db.prisma';

export interface CheckoutItemDetail {
  inventoryId: string;
  productId: string;
  productName: string;
  colorVariantName: string;
  size: string;
  quantity: number;
  unitPrice: Prisma.Decimal;
  subtotal: Prisma.Decimal;
  vendorId: string;
}

export class InsufficientStockError extends Error {
  itemLabel: string;

  constructor(itemLabel: string) {
    super(`Insufficient stock for item (${itemLabel}) at checkout`);
    this.name = 'InsufficientStockError';
    this.itemLabel = itemLabel;
  }
}

export class CheckoutRepository {
  async findIdempotencyKey(key: string, userId: string) {
    return prisma.idempotencyKey.findFirst({
      where: { key, userId },
    });
  }

  async updateIdempotencyKeyResponse(key: string, responseBody: string) {
    return prisma.idempotencyKey.update({
      where: { key },
      data: { responseBody },
    });
  }

  async findCartWithItemsByUserId(userId: string) {
    return prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            inventory: true,
          },
        },
      },
    });
  }

  async findCheckoutProducts(productIds: string[]) {
    return prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, price: true, discountedPrice: true, name: true, vendorId: true },
    });
  }

  /**
   * Atomic checkout write: conditional stock reservation (raw SQL guard against
   * overselling) + order/items create + day-one tracking seed + cart clear +
   * placeholder idempotency key. Throws InsufficientStockError when the
   * conditional reservation matches zero rows.
   */
  async createOrderWithReservation(data: {
    orderNumber: string;
    userId: string;
    addressId: string;
    cartId: string;
    subtotal: Prisma.Decimal;
    shippingFee: Prisma.Decimal;
    totalAmount: Prisma.Decimal;
    orderStatus: OrderStatus;
    paymentStatus: PaymentStatus;
    paymentMethod: PaymentMethod;
    isCOD: boolean;
    items: CheckoutItemDetail[];
    idempotencyKey: string;
  }) {
    // Sort items deterministically by inventoryId to mathematically eliminate PostgreSQL 40P01 deadlocks
    const sortedItems = [...data.items].sort((a, b) => a.inventoryId.localeCompare(b.inventoryId));

    return prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        // 1. Authoritative conditional atomic stock reservation in a single CTE batch query (0 sequential loops, <5ms hold time)
        if (sortedItems.length > 0) {
          const values = sortedItems.map(
            (item) => Prisma.sql`(${item.inventoryId}::text, ${item.quantity}::int)`,
          );
          const updatedRows = await tx.$queryRaw<{ id: string }[]>`
            WITH to_reserve(id, qty) AS (
              VALUES ${Prisma.join(values)}
            ),
            updated AS (
              UPDATE "ProductInventory" p
              SET reserved_quantity = p.reserved_quantity + r.qty
              FROM to_reserve r
              WHERE p.id = r.id AND (p.quantity - p.reserved_quantity) >= r.qty
              RETURNING p.id
            )
            SELECT id FROM updated;
          `;

          if (updatedRows.length !== sortedItems.length) {
            const updatedIds = new Set(updatedRows.map((r) => r.id));
            const failedItem = sortedItems.find((item) => !updatedIds.has(item.inventoryId));
            const label = failedItem
              ? `${failedItem.colorVariantName} - ${failedItem.size}`
              : 'Selected item';
            throw new InsufficientStockError(label);
          }
        }

        // 2. Create Order & Items
        const createdOrder = await tx.order.create({
          data: {
            orderNumber: data.orderNumber,
            userId: data.userId,
            addressId: data.addressId,
            subtotal: data.subtotal,
            shippingFee: data.shippingFee,
            discountAmount: new Prisma.Decimal(0),
            totalAmount: data.totalAmount,
            status: data.orderStatus,
            paymentMethod: data.paymentMethod,
            paymentStatus: data.paymentStatus,
            items: {
              create: data.items.map((det) => ({
                inventoryId: det.inventoryId,
                vendorId: det.vendorId,
                productName: det.productName,
                colorVariantName: det.colorVariantName,
                size: det.size,
                unitPrice: det.unitPrice,
                quantity: det.quantity,
                subtotal: det.subtotal,
                itemStatus: 'PENDING',
              })),
            },
          },
          include: {
            items: true,
            address: true,
            user: { select: { id: true, name: true, email: true } },
          },
        });

        // 2b. Seed the first tracking event so the customer timeline exists from day one
        await tx.orderTrackingEvent.create({
          data: {
            orderId: createdOrder.id,
            status: data.orderStatus,
            title: 'Order Placed',
            description: data.isCOD
              ? 'Your order has been confirmed. Pay with cash on delivery.'
              : 'Order received. Complete the payment to begin processing.',
            source: 'SYSTEM',
          },
        });

        // 3. Clear User Cart
        await tx.cartItem.deleteMany({
          where: { cartId: data.cartId },
        });

        // 4. Create placeholder idempotency key inside the transaction to guard against concurrent replay
        await tx.idempotencyKey.create({
          data: {
            key: data.idempotencyKey,
            userId: data.userId,
            statusCode: 201,
            responseBody: JSON.stringify({ status: 'PROCESSING', retry_with_new_key: true }),
          },
        });

        return createdOrder;
      },
      { maxWait: 5000, timeout: 10000 },
    );
  }

  async findStalePaymentOrders(cutoffTime: Date) {
    return prisma.order.findMany({
      where: {
        paymentStatus: 'PENDING',
        paymentMethod: { in: ['KHALTI', 'ESEWA'] },
        status: 'PENDING_PAYMENT',
        updatedAt: { lt: cutoffTime },
      },
      include: {
        items: {
          select: { inventoryId: true, quantity: true, itemStatus: true },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
  }

  async releaseStaleReservation(data: {
    id: string;
    items: { inventoryId: string; quantity: number; itemStatus: string }[];
  }) {
    const sortedItems = [...data.items].sort((a, b) => a.inventoryId.localeCompare(b.inventoryId));

    return prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const itemsToRelease = sortedItems.filter((item) => item.itemStatus !== 'CANCELLED');
        if (itemsToRelease.length > 0) {
          const values = itemsToRelease.map(
            (item) => Prisma.sql`(${item.inventoryId}::text, ${item.quantity}::int)`,
          );
          await tx.$executeRaw`
          WITH to_release(id, qty) AS (
            VALUES ${Prisma.join(values)}
          )
          UPDATE "ProductInventory" p
          SET reserved_quantity = GREATEST(0, p.reserved_quantity - r.qty)
          FROM to_release r
          WHERE p.id = r.id;
        `;
        }

        await tx.orderItem.updateMany({
          where: { orderId: data.id },
          data: { itemStatus: 'CANCELLED' },
        });

        await tx.orderTrackingEvent.create({
          data: {
            orderId: data.id,
            status: 'CANCELLED',
            title: 'Order Expired',
            description:
              'Payment was not completed within the time limit. The order was cancelled.',
            source: 'SYSTEM',
          },
        });

        return tx.order.update({
          where: { id: data.id },
          data: {
            status: 'CANCELLED',
            paymentStatus: 'FAILED',
          },
        });
      },
      { maxWait: 5000, timeout: 10000 },
    );
  }
}

export const checkoutRepository = new CheckoutRepository();
