import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';

import prisma, { Prisma } from '@/config/db.prisma';

export class PaymentRepository {
  async findOrderWithPayments(orderId: string) {
    return prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: { orderBy: { createdAt: 'desc' } } },
    });
  }

  async createPayment(data: Prisma.PaymentUncheckedCreateInput) {
    return prisma.payment.create({ data });
  }

  async findPaymentByTransactionId(transactionId: string) {
    return prisma.payment.findUnique({
      where: { transactionId },
      include: { order: true },
    });
  }

  async applyPaymentStatusUpdate(data: {
    orderId: string;
    userId: string;
    totalAmount: Prisma.Decimal;
    gateway: PaymentMethod;
    orderStatus: OrderStatus;
    next: PaymentStatus;
    reference: string;
    actorLabel: string;
    latestPayment?: { id: string; rawResponse: unknown } | null;
  }) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Acquire pessimistic row lock to serialize concurrent webhook callbacks and user redirects
      await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${data.orderId} FOR UPDATE`;

      const currentOrder = await tx.order.findUnique({
        where: { id: data.orderId },
        select: { id: true, paymentStatus: true, status: true },
      });

      if (currentOrder && currentOrder.paymentStatus === data.next) {
        return tx.order.findUniqueOrThrow({
          where: { id: data.orderId },
          include: {
            payments: { orderBy: { createdAt: 'desc' } },
            items: true,
            address: true,
            user: { select: { id: true, name: true, email: true } },
          },
        });
      }

      if (data.latestPayment) {
        await tx.payment.update({
          where: { id: data.latestPayment.id },
          data: {
            status: data.next,
            rawResponse: {
              ...((data.latestPayment.rawResponse as Record<string, unknown>) || {}),
              manualUpdate: {
                by: data.actorLabel,
                reference: data.reference,
                at: new Date().toISOString(),
              },
            } as Prisma.InputJsonValue,
          },
        });
      } else {
        await tx.payment.create({
          data: {
            orderId: data.orderId,
            userId: data.userId,
            amount: data.totalAmount,
            currency: 'NPR',
            gateway: data.gateway,
            status: data.next,
            rawResponse: {
              manualUpdate: {
                by: data.actorLabel,
                reference: data.reference,
                at: new Date().toISOString(),
              },
            } as Prisma.InputJsonValue,
          },
        });
      }

      const nextOrderStatus: OrderStatus =
        data.next === 'COMPLETED' && data.orderStatus === 'PENDING_PAYMENT'
          ? 'CONFIRMED'
          : data.orderStatus;

      await tx.orderTrackingEvent.create({
        data: {
          orderId: data.orderId,
          status: nextOrderStatus,
          title:
            data.next === 'COMPLETED'
              ? 'Payment Confirmed'
              : data.next === 'FAILED'
                ? 'Payment Failed'
                : 'Payment Refunded',
          description: `${data.reference} (by ${data.actorLabel})`,
          source: 'PLATFORM',
        },
      });

      return tx.order.update({
        where: { id: data.orderId },
        data: {
          paymentStatus: data.next,
          status: nextOrderStatus,
        },
        include: {
          payments: { orderBy: { createdAt: 'desc' } },
          items: true,
          address: true,
          user: { select: { id: true, name: true, email: true } },
        },
      });
    });
  }
}

export const paymentRepository = new PaymentRepository();
