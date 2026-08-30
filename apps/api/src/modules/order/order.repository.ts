import { OrderStatus } from '@prisma/client';

import prisma, { Prisma } from '@/config/db.prisma';

export class OrderRepository {
  async createAddress(data: Prisma.AddressUncheckedCreateInput) {
    return prisma.address.create({ data });
  }

  async findAddressesByUser(userId: string) {
    return prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findAddressById(id: string, userId: string) {
    return prisma.address.findFirst({
      where: { id, userId },
    });
  }

  async updateAddress(id: string, userId: string, data: Prisma.AddressUpdateInput) {
    return prisma.address.update({
      where: { id },
      data,
    });
  }

  async deleteAddress(id: string) {
    return prisma.address.delete({
      where: { id },
    });
  }

  async unsetOtherDefaultAddresses(userId: string, currentId?: string) {
    return prisma.address.updateMany({
      where: {
        userId,
        ...(currentId ? { id: { not: currentId } } : {}),
      },
      data: { isDefault: false },
    });
  }

  async findOrderById(id: string, userId?: string) {
    const where: Prisma.OrderWhereInput = { id };
    if (userId) where.userId = userId;

    return prisma.order.findFirst({
      where,
      include: {
        items: true,
        address: true,
        payments: true,
        trackingEvents: {
          orderBy: { timestamp: 'asc' as const },
        },
      },
    });
  }

  async findOrdersByUser(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: true,
          address: true,
        },
      }),
      prisma.order.count({ where: { userId } }),
    ]);

    return { orders, total, page, limit };
  }

  async findVendorOrderItems(where: Prisma.OrderItemWhereInput, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.orderItem.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          order: {
            include: {
              address: true,
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
      }),
      prisma.orderItem.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async findVendorOrderItemById(id: string, vendorId: string) {
    return prisma.orderItem.findFirst({
      where: { id, vendorId },
      include: { order: { include: { items: true } } },
    });
  }

  async findOrderItemById(id: string) {
    return prisma.orderItem.findUnique({
      where: { id },
      include: { order: { include: { items: true } } },
    });
  }

  async findVendorOrderWithItems(orderId: string, vendorId?: string) {
    return prisma.order.findFirst({
      where: {
        id: orderId,
        ...(vendorId ? { items: { some: { vendorId } } } : {}),
      },
      include: {
        items: vendorId ? { where: { vendorId } } : true,
        address: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async findAdminOrders(status?: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const whereCondition: Prisma.OrderWhereInput = status ? { status: status as OrderStatus } : {};

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: whereCondition,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: true,
          address: true,
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.order.count({ where: whereCondition }),
    ]);

    return { orders, total, page, limit };
  }

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

  async createPayment(data: Prisma.PaymentUncheckedCreateInput) {
    return prisma.payment.create({ data });
  }

  async createIdempotencyKey(data: Prisma.IdempotencyKeyUncheckedCreateInput) {
    return prisma.idempotencyKey.create({ data });
  }

  async runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn);
  }
}

export const orderRepository = new OrderRepository();
