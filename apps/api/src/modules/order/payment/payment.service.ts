import { UpdatePaymentStatusInput } from '@celebs/shared-types';
import { AppError, ErrorCode, HTTPSTATUS, logger } from '@celebs/shared-utils';

import {
  decodeEsewaCallback,
  EsewaAdapter,
  resolveEsewaConfig,
  verifyEsewaCallbackSignature,
} from '../adapters/esewa.adapter';
import { KhaltiAdapter, toPaisa } from '../adapters/khalti.adapter';
import { IPaymentGateway } from '../adapters/payment-gateway.interface';
import { enqueueOrderConfirmationEmail } from '../utils/order-email.util';

import { PaymentRepository, paymentRepository } from './payment.repository';

export class PaymentService {
  constructor(private repo: PaymentRepository = paymentRepository) {}

  getPaymentGateway(method: 'KHALTI' | 'ESEWA'): IPaymentGateway {
    switch (method) {
      case 'ESEWA':
        return new EsewaAdapter();
      case 'KHALTI':
        return new KhaltiAdapter();
    }
  }

  async updatePaymentStatus(
    orderId: string,
    input: UpdatePaymentStatusInput,
    actorLabel = 'PLATFORM',
  ) {
    const order = await this.repo.findOrderWithPayments(orderId);

    if (!order) {
      throw new AppError('Order not found', HTTPSTATUS.NOT_FOUND, ErrorCode.RESOURCE_NOT_FOUND);
    }

    const current = order.paymentStatus;
    const next = input.status;

    if (current === next) {
      return order;
    }

    const allowedFrom: Record<string, string[]> = {
      COMPLETED: ['PENDING', 'FAILED'],
      FAILED: ['PENDING'],
      REFUNDED: ['COMPLETED'],
    };

    if (!allowedFrom[next]?.includes(current)) {
      throw new AppError(
        `Invalid payment status transition from '${current}' to '${next}'.`,
        HTTPSTATUS.BAD_REQUEST,
        ErrorCode.INVALID_REQUEST,
      );
    }

    const updated = await this.repo.applyPaymentStatusUpdate({
      orderId: order.id,
      userId: order.userId,
      totalAmount: order.totalAmount,
      gateway: order.paymentMethod,
      orderStatus: order.status,
      next,
      reference: input.reference,
      actorLabel,
      latestPayment: order.payments[0] ?? null,
    });

    logger.info(
      { orderId, from: current, to: next, reference: input.reference, by: actorLabel },
      'Updated order payment status',
    );

    // Enqueue payment confirmation receipt when payment completes
    if (next === 'COMPLETED' && updated) {
      await enqueueOrderConfirmationEmail(updated, 'payment-completed');
    }

    return updated;
  }

  async confirmEsewaPayment(dataBase64: string, actorLabel = 'ESEWA-CALLBACK') {
    const { secretKey, productCode } = resolveEsewaConfig();
    const payload = decodeEsewaCallback(dataBase64);

    if (!verifyEsewaCallbackSignature(payload, secretKey)) {
      throw new AppError(
        'eSewa signature mismatch — possible tampering',
        HTTPSTATUS.BAD_REQUEST,
        ErrorCode.INVALID_REQUEST,
      );
    }

    if (payload.product_code !== productCode) {
      throw new AppError(
        'eSewa merchant code mismatch',
        HTTPSTATUS.BAD_REQUEST,
        ErrorCode.INVALID_REQUEST,
      );
    }

    const order = await this.repo.findOrderWithPayments(payload.transaction_uuid);

    if (!order) {
      throw new AppError('Order not found', HTTPSTATUS.NOT_FOUND, ErrorCode.RESOURCE_NOT_FOUND);
    }

    if (Math.abs(Number(payload.total_amount) - Number(order.totalAmount)) > 0.005) {
      logger.error(
        { orderId: order.id, expected: String(order.totalAmount), got: payload.total_amount },
        'eSewa amount mismatch — held for review, order NOT fulfilled',
      );
      throw new AppError(
        'Paid amount does not match order total — held for review',
        HTTPSTATUS.BAD_REQUEST,
        ErrorCode.INVALID_REQUEST,
      );
    }

    const adapter = this.getPaymentGateway('ESEWA');
    const verification = await adapter.verifyPayment(payload.transaction_uuid, {
      totalAmount: Number(order.totalAmount),
    });

    if (verification.status === 'COMPLETED') {
      const updated = await this.updatePaymentStatus(
        order.id,
        { status: 'COMPLETED', reference: `eSewa ${verification.transactionId}` },
        actorLabel,
      );
      return { order: updated, verification };
    }

    if (verification.status === 'REFUNDED') {
      const updated = await this.updatePaymentStatus(
        order.id,
        { status: 'REFUNDED', reference: `eSewa ${verification.transactionId}` },
        actorLabel,
      );
      return { order: updated, verification };
    }

    return { order, verification };
  }

  async getEsewaFormFields(orderId: string) {
    const order = await this.repo.findOrderWithPayments(orderId);

    if (!order || order.paymentMethod !== 'ESEWA') {
      throw new AppError(
        'eSewa order not found',
        HTTPSTATUS.NOT_FOUND,
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    const latest = order.payments[0];
    if (!latest) {
      throw new AppError(
        'No pending eSewa intent for this order',
        HTTPSTATUS.BAD_REQUEST,
        ErrorCode.INVALID_REQUEST,
      );
    }

    const stored =
      typeof latest.rawResponse === 'object' && latest.rawResponse !== null
        ? (latest.rawResponse as Record<string, unknown>)
        : {};

    if (latest.status !== 'PENDING' || typeof stored.signature !== 'string') {
      throw new AppError(
        'No pending eSewa intent for this order',
        HTTPSTATUS.BAD_REQUEST,
        ErrorCode.INVALID_REQUEST,
      );
    }

    const names = [
      'amount',
      'tax_amount',
      'total_amount',
      'transaction_uuid',
      'product_code',
      'product_service_charge',
      'product_delivery_charge',
      'success_url',
      'failure_url',
      'signed_field_names',
      'signature',
    ];
    const fields: Record<string, string> = {};
    for (const name of names) {
      fields[name] = String(stored[name] ?? '');
    }

    const actionUrl =
      typeof stored.actionUrl === 'string' && stored.actionUrl.length > 0
        ? stored.actionUrl
        : `${resolveEsewaConfig().baseUrl}/api/epay/main/v2/form`;

    return { actionUrl, fields };
  }

  async confirmKhaltiPayment(pidx: string, actorLabel = 'KHALTI-CALLBACK') {
    const payment = await this.repo.findPaymentByTransactionId(pidx);

    if (!payment) {
      throw new AppError(
        'Unknown Khalti payment reference',
        HTTPSTATUS.NOT_FOUND,
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    const order = await this.repo.findOrderWithPayments(payment.orderId);

    if (!order) {
      throw new AppError('Order not found', HTTPSTATUS.NOT_FOUND, ErrorCode.RESOURCE_NOT_FOUND);
    }

    const adapter = this.getPaymentGateway('KHALTI');
    const verification = await adapter.verifyPayment(pidx);

    if (verification.success) {
      const expectedPaisa = toPaisa(Number(order.totalAmount));
      const gotPaisa = Number(
        (verification.rawResponse as Record<string, unknown> | undefined)?.total_amount,
      );
      if (gotPaisa !== expectedPaisa) {
        logger.error(
          { orderId: order.id, expectedPaisa, gotPaisa },
          'Khalti amount mismatch — held for review, order NOT fulfilled',
        );
        throw new AppError(
          'Paid amount does not match order total — held for review',
          HTTPSTATUS.BAD_REQUEST,
          ErrorCode.INVALID_REQUEST,
        );
      }
      const updated = await this.updatePaymentStatus(
        order.id,
        { status: 'COMPLETED', reference: `Khalti ${verification.transactionId}` },
        actorLabel,
      );
      return { order: updated, verification };
    }

    if (verification.status === 'REFUNDED') {
      const updated = await this.updatePaymentStatus(
        order.id,
        { status: 'REFUNDED', reference: `Khalti ${verification.transactionId}` },
        actorLabel,
      );
      return { order: updated, verification };
    }

    if (verification.status === 'FAILED') {
      const updated = await this.updatePaymentStatus(
        order.id,
        { status: 'FAILED', reference: `Khalti ${pidx} not completed` },
        actorLabel,
      );
      return { order: updated, verification };
    }

    return { order, verification };
  }
}

export const paymentService = new PaymentService();
