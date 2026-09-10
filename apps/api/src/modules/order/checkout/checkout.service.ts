import { PaymentMethod } from '@prisma/client';

import { CheckoutInput, COD_MAX_LIMIT } from '@celebs/shared-types';
import { AppError, ErrorCode, HTTPSTATUS, logger } from '@celebs/shared-utils';

import { AddressRepository, addressRepository } from '../address/address.repository';
import { CoreOrderRepository, coreOrderRepository } from '../core/order.repository';
import { PaymentRepository, paymentRepository } from '../payment/payment.repository';
import { PaymentService, paymentService } from '../payment/payment.service';
import { enqueueOrderConfirmationEmail } from '../utils/order-email.util';
import { generateOrderNumber } from '../utils/order-number.util';

import {
  CheckoutRepository,
  checkoutRepository,
  InsufficientStockError,
} from './checkout.repository';

import { PLATFORM_VENDOR_ID } from '@/common/constants/platform-vendor';
import { resolveCallbackBase } from '@/common/utils/callback-base';
import { config } from '@/config/app.config';
import { Prisma } from '@/config/db.prisma';

export class CheckoutService {
  constructor(
    private checkoutRepo: CheckoutRepository = checkoutRepository,
    private addressRepo: AddressRepository = addressRepository,
    private paymentRepo: PaymentRepository = paymentRepository,
    private paymentSvc: PaymentService = paymentService,
    private coreOrderRepo: CoreOrderRepository = coreOrderRepository,
  ) {}

  async checkout(userId: string, input: CheckoutInput, requestHost?: string) {
    const { paymentMethod, idempotencyKey } = input;
    let targetAddressId = input.addressId;

    if (!targetAddressId && input.shippingAddress) {
      if (input.shippingAddress.isDefault) {
        await this.addressRepo.unsetOtherDefaultAddresses(userId, '');
      }
      const createdAddress = await this.addressRepo.createAddress({
        userId,
        fullName: input.shippingAddress.fullName,
        phone: input.shippingAddress.phone,
        altPhone: input.shippingAddress.altPhone,
        province: input.shippingAddress.province,
        district: input.shippingAddress.district,
        cityArea: input.shippingAddress.cityArea,
        streetAddress: input.shippingAddress.streetAddress,
        landmark: input.shippingAddress.landmark,
        label: input.shippingAddress.label || 'Home',
        isDefault: input.shippingAddress.isDefault ?? false,
      });
      targetAddressId = createdAddress.id;
    }

    if (!targetAddressId) {
      throw new AppError(
        'Shipping address or addressId is required',
        HTTPSTATUS.BAD_REQUEST,
        ErrorCode.INVALID_REQUEST,
      );
    }

    // Check Idempotency Key
    const existingIdempotency = await this.checkoutRepo.findIdempotencyKey(idempotencyKey, userId);

    if (existingIdempotency) {
      return JSON.parse(existingIdempotency.responseBody);
    }

    // Verify Address
    const address = await this.addressRepo.findAddressById(targetAddressId, userId);

    if (!address) {
      throw new AppError(
        'Selected shipping address not found',
        HTTPSTATUS.BAD_REQUEST,
        ErrorCode.INVALID_REQUEST,
      );
    }

    // Fetch Cart
    const cart = await this.checkoutRepo.findCartWithItemsByUserId(userId);

    if (!cart || cart.items.length === 0) {
      throw new AppError('Your cart is empty', HTTPSTATUS.BAD_REQUEST, ErrorCode.INVALID_REQUEST);
    }

    // Resolve Product Info and Calculate Totals
    let subtotalDecimal = new Prisma.Decimal(0);
    const itemDetails: Array<{
      inventoryId: string;
      productId: string;
      productName: string;
      colorVariantName: string;
      size: string;
      quantity: number;
      unitPrice: Prisma.Decimal;
      subtotal: Prisma.Decimal;
      vendorId: string;
    }> = [];

    // Batch product lookup — single query
    const cartProductIds = Array.from(new Set(cart.items.map((item) => item.inventory.productId)));
    const cartProducts = await this.checkoutRepo.findCheckoutProducts(cartProductIds);
    const productsById = new Map(cartProducts.map((p) => [p.id, p]));

    for (const item of cart.items) {
      const inv = item.inventory;
      const availableQty = inv.quantity - inv.reservedQuantity;

      if (availableQty < item.quantity) {
        throw new AppError(
          `Insufficient stock for item (${inv.colorVariantName} - ${inv.size}). Available: ${availableQty}, Requested: ${item.quantity}`,
          HTTPSTATUS.BAD_REQUEST,
          ErrorCode.INVALID_REQUEST,
        );
      }

      const product = productsById.get(inv.productId);
      if (!product) {
        throw new AppError(
          'Product details not found for inventory item',
          HTTPSTATUS.NOT_FOUND,
          ErrorCode.RESOURCE_NOT_FOUND,
        );
      }

      const rawPrice =
        product.discountedPrice && Number(product.discountedPrice) > 0
          ? Number(product.discountedPrice)
          : Number(product.price);
      const unitPriceDecimal = new Prisma.Decimal(rawPrice);
      const lineSubtotalDecimal = unitPriceDecimal.mul(item.quantity);
      subtotalDecimal = subtotalDecimal.add(lineSubtotalDecimal);

      const vendorId = product.vendorId || PLATFORM_VENDOR_ID;

      itemDetails.push({
        inventoryId: inv.id,
        productId: inv.productId,
        productName: product.name,
        colorVariantName: inv.colorVariantName,
        size: inv.size,
        quantity: item.quantity,
        unitPrice: unitPriceDecimal,
        subtotal: lineSubtotalDecimal,
        vendorId,
      });
    }

    // Enforce COD Maximum Limit with Decimal Precision
    const shippingFeeDecimal = subtotalDecimal.gt(3000)
      ? new Prisma.Decimal(0)
      : new Prisma.Decimal(150);
    const totalAmountDecimal = subtotalDecimal.add(shippingFeeDecimal);

    if (paymentMethod === 'COD' && totalAmountDecimal.gt(COD_MAX_LIMIT)) {
      throw new AppError(
        `Cash on Delivery (COD) is limited to maximum NPR ${COD_MAX_LIMIT}. Please pay the total of NPR ${totalAmountDecimal.toFixed(2)} with eSewa or Khalti.`,
        HTTPSTATUS.BAD_REQUEST,
        ErrorCode.INVALID_REQUEST,
      );
    }

    // Enterprise SHEIN/Daraz order numbering: CEL-YYMMDD-XXXXXX
    const orderNumber = generateOrderNumber();
    const isCOD = paymentMethod === 'COD';
    const orderStatus = isCOD ? 'CONFIRMED' : 'PENDING_PAYMENT';
    const paymentStatus = 'PENDING';

    let order;
    try {
      order = await this.checkoutRepo.createOrderWithReservation({
        orderNumber,
        userId,
        addressId: targetAddressId,
        cartId: cart.id,
        subtotal: subtotalDecimal,
        shippingFee: shippingFeeDecimal,
        totalAmount: totalAmountDecimal,
        orderStatus,
        paymentStatus,
        paymentMethod,
        isCOD,
        items: itemDetails,
        idempotencyKey,
      });
    } catch (err: unknown) {
      if (err instanceof InsufficientStockError) {
        throw new AppError(err.message, HTTPSTATUS.CONFLICT, ErrorCode.INVALID_REQUEST);
      }
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const recheck = await this.checkoutRepo.findIdempotencyKey(idempotencyKey, userId);
        if (recheck) {
          return JSON.parse(recheck.responseBody);
        }
        throw new AppError(
          'Idempotency key already in use',
          HTTPSTATUS.CONFLICT,
          ErrorCode.INVALID_REQUEST,
        );
      }
      throw err;
    }

    // Create online payment intent when not COD
    let paymentResult = null;
    if (paymentMethod !== 'COD') {
      try {
        const adapter = this.paymentSvc.getPaymentGateway(paymentMethod);
        const callbackBase = input.callbackBase
          ? resolveCallbackBase(input.callbackBase, requestHost, '')
          : '';
        const apiBase = (config.BASE_PATH || '/api/v1').replace(/\/+$/, '');
        const walletMeta = callbackBase
          ? {
              successUrl: `${callbackBase}${apiBase}/orders/payments/esewa/success`,
              failureUrl: `${callbackBase}${apiBase}/orders/payments/esewa/failure`,
              returnUrl: `${callbackBase}${apiBase}/orders/payments/khalti/return`,
            }
          : {};
        paymentResult = await adapter.createPaymentIntent(
          order.id,
          totalAmountDecimal.toNumber(),
          'NPR',
          {
            orderNumber: order.orderNumber,
            userId,
            ...walletMeta,
          },
        );

        await this.paymentRepo.createPayment({
          orderId: order.id,
          userId,
          amount: totalAmountDecimal,
          currency: 'NPR',
          gateway: paymentMethod,
          transactionId: paymentResult.paymentId,
          status: 'PENDING',
          rawResponse: (paymentResult.rawResponse as Prisma.InputJsonValue) || {},
        });
      } catch (paymentError: unknown) {
        const rawMsg = paymentError instanceof Error ? paymentError.message : String(paymentError);
        logger.error(
          { orderId: order.id, paymentMethod, err: rawMsg },
          'Failed to initiate online payment intent — releasing reserved stock',
        );

        try {
          await this.coreOrderRepo.applyOrderCancellation({
            id: order.id,
            items: order.items.map((item) => ({
              inventoryId: item.inventoryId,
              quantity: item.quantity,
            })),
          });
        } catch (cancelErr) {
          logger.error(
            { orderId: order.id, cancelErr },
            'Failed to auto-cancel order after payment intent failure',
          );
        }

        throw new AppError(
          `Unable to initiate ${paymentMethod} payment: ${rawMsg}. Please retry or choose another payment method.`,
          HTTPSTATUS.BAD_GATEWAY,
          ErrorCode.INTERNAL_SERVER_ERROR,
        );
      }
    }

    const responseBody = {
      order,
      payment: paymentResult,
    };

    // Store response for idempotency
    await this.checkoutRepo.updateIdempotencyKeyResponse(
      idempotencyKey,
      JSON.stringify(responseBody),
    );

    // Enqueue order confirmation email for COD orders (immediately confirmed)
    if (order.paymentMethod === 'COD') {
      await enqueueOrderConfirmationEmail(order, 'checkout-cod');
    }

    return responseBody;
  }

  private async verifyOrderGatewayPayment(order: {
    id: string;
    totalAmount: Prisma.Decimal;
    paymentMethod: PaymentMethod;
    payments?: Array<{ id: string; transactionId: string | null; rawResponse: unknown }>;
  }): Promise<boolean> {
    try {
      if (order.paymentMethod === 'KHALTI') {
        const latestPayment = order.payments?.[0];
        const pidx = latestPayment?.transactionId;
        if (!pidx) return false;

        const adapter = this.paymentSvc.getPaymentGateway('KHALTI');
        const verification = await adapter.verifyPayment(pidx);
        if (verification.success) {
          await this.paymentSvc.updatePaymentStatus(
            order.id,
            { status: 'COMPLETED', reference: `Khalti Reconciled ${verification.transactionId}` },
            'AUTO-REMEDIATION-VERIFY',
          );
          return true;
        }
      } else if (order.paymentMethod === 'ESEWA') {
        const adapter = this.paymentSvc.getPaymentGateway('ESEWA');
        const verification = await adapter.verifyPayment(order.id, {
          totalAmount: Number(order.totalAmount),
        });
        if (verification.status === 'COMPLETED') {
          await this.paymentSvc.updatePaymentStatus(
            order.id,
            { status: 'COMPLETED', reference: `eSewa Reconciled ${verification.transactionId}` },
            'AUTO-REMEDIATION-VERIFY',
          );
          return true;
        }
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      logger.warn(
        { orderId: order.id, gateway: order.paymentMethod, error: errMsg },
        'Pre-cancellation gateway verification failed or inconclusive; proceeding to cancel',
      );
    }
    return false;
  }

  async releaseStaleReservations(): Promise<{ cancelledOrders: number }> {
    const ttlHours = Number(process.env.ORDER_RESERVATION_TTL_HOURS ?? 2);
    const cutoff = new Date(Date.now() - ttlHours * 3600_000);

    const staleOrders = await this.checkoutRepo.findStalePaymentOrders(cutoff);
    let cancelledCount = 0;

    for (const order of staleOrders) {
      try {
        // 1. Verify with payment gateway first — never cancel an order the customer actually paid for
        const isVerifiedPaid = await this.verifyOrderGatewayPayment(order);
        if (isVerifiedPaid) {
          logger.info(
            { orderId: order.id, gateway: order.paymentMethod },
            'Stale order verified as PAID at gateway; fulfilled and preserved inventory',
          );
          continue;
        }

        // 2. Safe to cancel unpaid order and release reserved stock
        await this.checkoutRepo.releaseStaleReservation({
          id: order.id,
          items: order.items.map((item) => ({
            inventoryId: item.inventoryId,
            quantity: item.quantity,
            itemStatus: item.itemStatus,
          })),
        });

        cancelledCount++;
        const ageMinutes = Math.round((Date.now() - order.updatedAt.getTime()) / 60000);
        logger.warn({ orderId: order.id, ageMinutes }, 'Released stale payment reservation');
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        logger.error(
          { orderId: order.id, error: errorMsg },
          'Failed to release stale reservation for order',
        );
      }
    }

    return { cancelledOrders: cancelledCount };
  }
}

export const checkoutService = new CheckoutService();
