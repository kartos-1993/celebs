import { PaymentStatus, RefundStatus } from '@prisma/client';

import type { Prisma } from '@/config/db.prisma';
import prisma from '@/config/db.prisma';

export type RefundRecord = Prisma.PromiseReturnType<RefundRepository['findRefundById']>;

export interface StartRefundData {
  orderId: string;
  paymentId: string;
  amount: Prisma.Decimal;
  gateway: 'COD' | 'KHALTI' | 'ESEWA';
  initiatedBy: string;
  reason?: string;
}

export interface CompleteRefundData {
  refundId: string;
  status: RefundStatus;
  providerRefundId?: string;
  message?: string;
}

export class RefundRepository {
  /**
   * The payment whose money needs returning, if there is one.
   *
   * Only a completed online payment is a candidate. Cash on delivery was never
   * charged, and a payment that never completed has nothing to give back.
   */
  async findRefundablePayment(orderId: string) {
    return prisma.payment.findFirst({
      where: { orderId, status: PaymentStatus.COMPLETED, gateway: { not: 'COD' } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, amount: true, gateway: true, transactionId: true },
    });
  }

  /**
   * A refund attempt that has not failed, so the request can be answered with it.
   *
   * This is what makes a repeated cancellation safe. The gateway refund call is
   * not idempotent, so the second attempt has to be stopped before it reaches the
   * gateway rather than after.
   */
  async findOpenRefund(paymentId: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma;
    return client.refund.findFirst({
      where: {
        paymentId,
        status: {
          in: [RefundStatus.PENDING, RefundStatus.SUCCEEDED, RefundStatus.REQUIRES_MANUAL_ACTION],
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Atomically takes ownership of the refund attempt for a payment.
   *
   * Two concurrent cancellations must not both reach the gateway: the refund
   * call is not idempotent, so a second payment to the same customer is one
   * `await` of interleaving away. The advisory lock serializes claimants on
   * the payment inside a bounded transaction; the loser is answered with the
   * winner's record and never touches the gateway.
   */
  async claimOpenRefund(data: StartRefundData) {
    return prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`refund:${data.paymentId}`}))`;

        const open = await this.findOpenRefund(data.paymentId, tx);

        if (open) return { record: open, created: false as const };

        const record = await tx.refund.create({
          data: {
            orderId: data.orderId,
            paymentId: data.paymentId,
            amount: data.amount,
            gateway: data.gateway,
            status: RefundStatus.PENDING,
            initiatedBy: data.initiatedBy,
            reason: data.reason,
          },
        });

        return { record, created: true as const };
      },
      { maxWait: 5000, timeout: 10000 },
    );
  }

  async completeRefund(data: CompleteRefundData) {
    return prisma.refund.update({
      where: { id: data.refundId },
      data: {
        status: data.status,
        providerRefundId: data.providerRefundId,
        message: data.message,
      },
    });
  }

  async findRefundById(id: string) {
    return prisma.refund.findUniqueOrThrow({ where: { id } });
  }
}

export const refundRepository = new RefundRepository();
