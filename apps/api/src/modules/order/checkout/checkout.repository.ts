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
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Authoritative conditional atomic stock reservation
      for (const item of data.items) {
        const updated = await tx.$executeRaw`
          UPDATE "ProductInventory"
          SET reserved_quantity = reserved_quantity + ${item.quantity}
          WHERE id = ${item.inventoryId}
            AND quantity - reserved_quantity >= ${item.quantity}`;
        if (updated === 0) {
          throw new InsufficientStockError(`${item.colorVariantName} - ${item.size}`);
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
    });
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
      },
    });
  }

  async releaseStaleReservation(data: {
    id: string;
    items: { inventoryId: string; quantity: number; itemStatus: string }[];
  }) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      for (const item of data.items) {
        if (item.itemStatus !== 'CANCELLED') {
          await tx.productInventory.update({
            where: { id: item.inventoryId },
            data: {
              reservedQuantity: {
                decrement: item.quantity,
              },
            },
          });
        }
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
          description: 'Payment was not completed within the time limit. The order was cancelled.',
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
    });
  }
}

export const checkoutRepository = new CheckoutRepository();
