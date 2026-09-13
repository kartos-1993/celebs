import { OrderItemStatus, OrderStatus, PaymentMethod } from '@prisma/client';

import { resolveOrderItemImageUrl } from '../utils/order-image.util';

import prisma, { Prisma } from '@/config/db.prisma';

export class CoreOrderRepository {
  async findOrderById(id: string, userId?: string) {
    const where: Prisma.OrderWhereInput = { id };
    if (userId) where.userId = userId;

    const order = await prisma.order.findFirst({
      where,
      include: {
        items: {
          include: {
            vendor: {
              select: { id: true, shopName: true },
            },
            inventory: {
              include: {
                product: {
                  select: {
                    id: true,
                    slug: true,
                    mainImages: true,
                    colorVariants: true,
                  },
                },
              },
            },
          },
        },
        address: true,
        user: { select: { id: true, name: true, email: true } },
        payments: {
          orderBy: { createdAt: 'desc' },
        },
        trackingEvents: {
          orderBy: { timestamp: 'asc' as const },
        },
      },
    });

    if (!order) return null;

    return {
      ...order,
      items: order.items.map((item) => ({
        ...item,
        imageUrl: resolveOrderItemImageUrl(item),
      })),
    };
  }

  async findOrdersByUser(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [rawOrders, total] = await Promise.all([
      prisma.order.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            include: {
              vendor: {
                select: { id: true, shopName: true },
              },
              inventory: {
                include: {
                  product: {
                    select: {
                      id: true,
                      slug: true,
                      mainImages: true,
                      colorVariants: true,
                    },
                  },
                },
              },
            },
          },
          address: true,
          payments: {
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
      prisma.order.count({ where: { userId } }),
    ]);

    const orders = rawOrders.map((order) => ({
      ...order,
      items: order.items.map((item) => ({
        ...item,
        imageUrl: resolveOrderItemImageUrl(item),
      })),
    }));

    return { orders, total, page, limit };
  }

  async findAdminOrders(status?: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const whereCondition: Prisma.OrderWhereInput = status ? { status: status as OrderStatus } : {};

    const [rawOrders, total] = await Promise.all([
      prisma.order.findMany({
        where: whereCondition,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            include: {
              inventory: {
                include: {
                  product: {
                    select: {
                      id: true,
                      slug: true,
                      mainImages: true,
                      colorVariants: true,
                    },
                  },
                },
              },
            },
          },
          address: true,
          user: { select: { id: true, name: true, email: true } },
          payments: { orderBy: { createdAt: 'desc' } },
        },
      }),
      prisma.order.count({ where: whereCondition }),
    ]);

    const orders = rawOrders.map((order) => ({
      ...order,
      items: order.items.map((item) => ({
        ...item,
        imageUrl: resolveOrderItemImageUrl(item),
      })),
    }));

    return { orders, total, page, limit };
  }

  async applyOrderCancellation(order: {
    id: string;
    items: { inventoryId: string; quantity: number }[];
  }) {
    const sortedItems = [...order.items].sort((a, b) => a.inventoryId.localeCompare(b.inventoryId));

    return prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        // Single set-based restore (sorted input keeps lock order deterministic).
        await tx.$executeRaw`
          UPDATE "ProductInventory" AS p
          SET "reservedQuantity" = p."reservedQuantity" - u.qty
          FROM (
            SELECT
              unnest(${sortedItems.map((item) => item.inventoryId)}::text[]) AS id,
              unnest(${sortedItems.map((item) => item.quantity)}::int[]) AS qty
          ) AS u
          WHERE p.id = u.id
        `;

        await tx.orderItem.updateMany({
          where: { orderId: order.id },
          data: { itemStatus: 'CANCELLED' },
        });

        await tx.orderTrackingEvent.create({
          data: {
            orderId: order.id,
            status: 'CANCELLED',
            title: 'Order Cancelled',
            description: 'This order was cancelled and reserved stock was released.',
            source: 'SYSTEM',
          },
        });

        return tx.order.update({
          where: { id: order.id },
          data: { status: 'CANCELLED' },
        });
      },
      { maxWait: 5000, timeout: 10000 },
    );
  }

  async getOrderSummaryCounts(userId: string) {
    const [toPay, toShip, toReceive, toReview, delivered, cancelled] = await Promise.all([
      prisma.order.count({
        where: {
          userId,
          status: { notIn: [OrderStatus.CANCELLED, OrderStatus.RETURNED] },
          paymentStatus: 'PENDING',
          paymentMethod: { not: PaymentMethod.COD },
        },
      }),
      prisma.order.count({
        where: {
          userId,
          status: { in: [OrderStatus.CONFIRMED, OrderStatus.PACKED] },
          OR: [{ paymentMethod: PaymentMethod.COD }, { paymentStatus: { not: 'PENDING' } }],
          items: {
            some: {
              itemStatus: { in: [OrderItemStatus.PENDING, OrderItemStatus.PACKED] },
            },
          },
        },
      }),
      prisma.order.count({
        where: {
          userId,
          status: { notIn: [OrderStatus.DELIVERED, OrderStatus.CANCELLED, OrderStatus.RETURNED] },
          OR: [
            { status: { in: [OrderStatus.HANDED_OVER, OrderStatus.OUT_FOR_DELIVERY] } },
            {
              items: {
                some: {
                  itemStatus: OrderItemStatus.HANDED_OVER,
                },
              },
            },
          ],
        },
      }),
      prisma.orderItem.count({
        where: {
          order: {
            userId,
          },
          itemStatus: OrderItemStatus.DELIVERED,
          review: null,
        },
      }),
      prisma.order.count({
        where: {
          userId,
          status: OrderStatus.DELIVERED,
        },
      }),
      prisma.order.count({
        where: {
          userId,
          status: { in: [OrderStatus.CANCELLED, OrderStatus.RETURNED] },
        },
      }),
    ]);

    return {
      toPay,
      toShip,
      toReceive,
      toReview,
      delivered,
      cancelled,
    };
  }
}

export const coreOrderRepository = new CoreOrderRepository();
