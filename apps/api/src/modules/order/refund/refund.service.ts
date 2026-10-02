import { PaymentMethod, RefundStatus } from '@prisma/client';

import { EsewaAdapter } from '../adapters/esewa.adapter';
import { KhaltiAdapter } from '../adapters/khalti.adapter';
import type { IPaymentGateway } from '../adapters/payment-gateway.interface';

import { RefundRepository, refundRepository } from './refund.repository';

import { postRefundEntries } from '@/modules/finance/ledger/ledger-posting.service';

/**
 * Returns money to a customer after an order is cancelled.
 *
 * The attempt is recorded whether or not the gateway could act on it. That is the
 * point: one of the two wallets has no refund API, so a cancellation there leaves
 * a real obligation that a person has to discharge in a merchant dashboard. A
 * refund that is only ever a transient status loses that obligation, and the
 * customer waits on money nobody is tracking.
 *
 * Repeated requests are answered from the record rather than re-sent. The gateway
 * refund call is not idempotent, so a retried cancellation must not become a second
 * payment to the same customer. A refund that genuinely failed is left open for
 * another attempt, because one transient timeout should not strand the money.
 */

export interface InitiateRefundInput {
  orderId: string;
  initiatedBy: string;
  reason?: string;
}

/** Gateway result statuses mapped onto what we store. */
const STATUS_MAP: Record<string, RefundStatus> = {
  SUCCEEDED: RefundStatus.SUCCEEDED,
  REQUIRES_MANUAL_ACTION: RefundStatus.REQUIRES_MANUAL_ACTION,
  FAILED: RefundStatus.FAILED,
};

export class RefundService {
  constructor(
    private readonly gateways: Partial<Record<PaymentMethod, IPaymentGateway>> = {},
    private readonly repo: RefundRepository = refundRepository,
  ) {}

  /**
   * Starts a refund for an order's online payment.
   *
   * Returns null when there is nothing to return: a cash on delivery order was
   * never charged, and a payment that never completed holds no money.
   */
  async initiateRefund(input: InitiateRefundInput) {
    const payment = await this.repo.findRefundablePayment(input.orderId);
    if (!payment) return null;

    const already = await this.repo.findOpenRefund(payment.id);
    if (already) return already;

    const gateway = this.gateways[payment.gateway as PaymentMethod];
    if (!gateway) {
      // Refusing is not a refund. If no adapter is wired for the wallet, say so
      // rather than recording a failure that will be retried forever.
      return this.repo
        .startRefund({
          orderId: input.orderId,
          paymentId: payment.id,
          amount: payment.amount,
          gateway: payment.gateway,
          initiatedBy: input.initiatedBy,
          reason: input.reason,
        })
        .then((refund) =>
          this.repo.completeRefund({
            refundId: refund.id,
            status: RefundStatus.FAILED,
            message: `No refund adapter is configured for ${payment.gateway}`,
          }),
        );
    }

    const refund = await this.repo.startRefund({
      orderId: input.orderId,
      paymentId: payment.id,
      amount: payment.amount,
      gateway: payment.gateway,
      initiatedBy: input.initiatedBy,
      reason: input.reason,
    });

    const result = await gateway.refund({
      paymentId: payment.transactionId ?? payment.id,
      amount: payment.amount.toNumber(),
      reason: input.reason,
    });

    return this.repo
      .completeRefund({
        refundId: refund.id,
        status: STATUS_MAP[result.status] ?? RefundStatus.FAILED,
        providerRefundId: result.providerRefundId,
        message: result.message,
      })
      .then(async (completed) => {
        // Only money that actually left the platform is recorded. A refund waiting
        // on a person in a merchant dashboard has not moved, and booking it now
        // would understate what we still hold.
        if (completed.status === RefundStatus.SUCCEEDED) {
          await postRefundEntries({
            refundId: completed.id,
            orderId: completed.orderId,
            amount: completed.amount,
            gateway: completed.gateway,
          });
        }

        return completed;
      });
  }
}

/**
 * Wired with the wallets we actually use. COD is absent on purpose: it was never
 * charged, so there is nothing to return.
 */
export const refundService = new RefundService({
  KHALTI: new KhaltiAdapter(),
  ESEWA: new EsewaAdapter(),
});
