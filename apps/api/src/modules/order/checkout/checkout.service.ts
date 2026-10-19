import { DeliveryPricingSource, PaymentMethod } from '@prisma/client';

import {
  CheckoutInput,
  isCodAllowed,
  MIN_PARCEL_WEIGHT_KG,
  WEIGHT_DECIMALS,
} from '@celebs/shared-types';
import { AppError, ErrorCode, HTTPSTATUS, logger } from '@celebs/shared-utils';

import { resolvePathaoStoreId } from '../../logistics/adapters/pathao-token.provider';
import {
  CourierDestinationRepository,
  courierDestinationRepository,
} from '../../logistics/courier-destination.repository';
import { resolveDeliveryPricing } from '../../logistics/delivery-pricing';
import { deliveryPricingRepository } from '../../logistics/delivery-pricing.repository';
import { DeliveryQuoteService, deliveryQuoteService } from '../../logistics/delivery-quote.service';
import { sumBillableWeightKg } from '../../logistics/parcel-weight';
import { computeBillableLineWeightKg } from '../../logistics/parcel-weight';
import { vendorRepository } from '../../vendor/vendor.repository';
import { AddressRepository, addressRepository } from '../address/address.repository';
import { CoreOrderRepository, coreOrderRepository } from '../core/order.repository';
import { PaymentRepository, paymentRepository } from '../payment/payment.repository';
import { PaymentService, paymentService } from '../payment/payment.service';
import { enqueueOrderConfirmationEmail } from '../utils/order-email.util';
import { generateOrderNumber } from '../utils/order-number.util';

import {
  CheckoutItemDetail,
  CheckoutRepository,
  checkoutRepository,
  InsufficientStockError,
} from './checkout.repository';

import { PLATFORM_VENDOR_ID } from '@/common/constants/platform-vendor';
import { resolveCallbackBase } from '@/common/utils/callback-base';
import { config } from '@/config/app.config';
import { Prisma } from '@/config/db.prisma';
import { resolveCartLineUnitPrice } from '@/modules/cart/cart-line-price';
import { commissionService } from '@/modules/finance/commission/commission.service';
import {
  postOrderCommissionEntries,
  postOrderPlacementEntries,
} from '@/modules/finance/ledger/ledger-posting.service';
import {
  NotificationService,
  notificationService as defaultNotificationService,
} from '@/modules/notification/notification.service';
import {
  PlatformSettingsService,
  platformSettingsService as defaultPlatformSettingsService,
} from '@/modules/platform-settings/platform-settings.service';
import { purgeProductDetail, purgeProductHome } from '@/modules/product/product-cache';

export class CheckoutService {
  constructor(
    private checkoutRepo: CheckoutRepository = checkoutRepository,
    private addressRepo: AddressRepository = addressRepository,
    private paymentRepo: PaymentRepository = paymentRepository,
    private paymentSvc: PaymentService = paymentService,
    private coreOrderRepo: CoreOrderRepository = coreOrderRepository,
    private notificationService: NotificationService = defaultNotificationService,
    private platformSettingsService: PlatformSettingsService = defaultPlatformSettingsService,
    private deliveryQuoteSvc: DeliveryQuoteService = deliveryQuoteService,
    private courierDestinationRepo: CourierDestinationRepository = courierDestinationRepository,
    private pathaoStoreIdOverride?: number,
  ) {}

  /**
   * The courier pickup store. Resolved per use, not at construction: the module
   * singleton is built at import time, and importing a module must not throw
   * for a missing variable.
   */
  private pathaoStoreId(): number {
    return this.pathaoStoreIdOverride ?? resolvePathaoStoreId();
  }

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
    // Typed from the repository's own interface rather than restated here, so a
    // new snapshot field cannot be added to one and forgotten on the other.
    const itemDetails: CheckoutItemDetail[] = [];

    // Batch product lookup — single query
    const cartProductIds = Array.from(new Set(cart.items.map((item) => item.inventory.productId)));
    const cartProducts = await this.checkoutRepo.findCheckoutProducts(cartProductIds);
    const productsById = new Map(cartProducts.map((p) => [p.id, p]));

    // Legacy vendor-less rows fall back to the 1P store below. Verify it once,
    // up front: `OrderItem.vendorId` is a NOT NULL + RESTRICT FK, so a missing
    // store would otherwise surface as a P2003 after the order write instead of
    // a typed domain error the customer can be shown.
    const hasVendorlessLine = cart.items.some((item) => {
      const product = productsById.get(item.inventory.productId);
      return Boolean(product && !product.vendorId);
    });
    if (hasVendorlessLine) {
      const platformStore = await vendorRepository.findById(PLATFORM_VENDOR_ID);
      if (!platformStore) {
        throw new AppError(
          'This order contains a product without a seller, and the 1P platform store is not provisioned yet. Complete the initial superadmin setup and retry.',
          HTTPSTATUS.SERVICE_UNAVAILABLE,
          ErrorCode.PLATFORM_VENDOR_NOT_PROVISIONED,
        );
      }
    }

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

      // The line's unit price comes from the single line-price authority —
      // the same rule CartService.getCart renders — so the figure the shopper
      // saw in the cart is the figure charged here, combo discounts included.
      //
      // Decimals from the columns to the line total, with no JS number in the
      // middle. Converting the price to a number first would put a binary float
      // into the one calculation a seller is later paid from; the round trip
      // usually survives for 2dp values today, which is exactly why it is worth
      // removing.
      const unitPriceDecimal = resolveCartLineUnitPrice({
        price: product.price,
        discountedPrice: product.discountedPrice,
        appliedDiscount: item.appliedDiscount,
      });
      const lineSubtotalDecimal = unitPriceDecimal.mul(item.quantity);
      subtotalDecimal = subtotalDecimal.add(lineSubtotalDecimal);

      const vendorId = product.vendorId || PLATFORM_VENDOR_ID;

      // Billable weight for this line, snapshotted so the shipment stays
      // reproducible if the product's weight is edited later.
      //
      // Computed with Decimal rather than the shared float helper: a courier
      // charge is reconciled against this stored figure, and float arithmetic
      // drifts (0.7 * 3 is 2.0999999999999996, and `toFixed` rounds 1.005 down
      // to 1.00). The shared helper produces the same value for display, but
      // this is the one that has to be exact.
      const lineBillableWeightKg = computeBillableLineWeightKg({
        weightKg: product.packageWeightKg,
        quantity: item.quantity,
        lengthCm: product.packageLengthCm,
        widthCm: product.packageWidthCm,
        heightCm: product.packageHeightCm,
      });

      // Commission is resolved and frozen onto this line before it is written.
      //
      // The seller listed the price the customer sees; the platform's cut is
      // deducted from it. Both the rate and the resulting amounts are snapshotted
      // so a later rate change cannot retroactively alter what this seller earned
      // on a sale they already made.
      const commission = await commissionService.applyToLine({
        lineId: inv.id,
        subtotal: lineSubtotalDecimal,
        categoryId: product.categoryId,
        subcategoryId: product.subcategoryId,
        vendorId,
      });

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
        commissionRatePercent: commission.ratePercent,
        commissionAmount: commission.commissionAmount,
        sellerNetAmount: commission.sellerNetAmount,
        unitWeightKg: new Prisma.Decimal(
          product.packageWeightKg ?? MIN_PARCEL_WEIGHT_KG,
        ).toDecimalPlaces(WEIGHT_DECIMALS, Prisma.Decimal.ROUND_HALF_UP),
        billableWeightKg: lineBillableWeightKg,
      });
    }

    // Delivery pricing: calculated deterministically from the Platform Rate Card and
    // Commerce Policy (isValley ? valleyFee : outerFee, plus free delivery threshold waiver).
    // Checkout is 100% offline-resilient, never blocked by third-party 3PL courier downtime.
    const policy = await this.platformSettingsService.getCommercePolicy();
    const destination = await deliveryPricingRepository.thresholdForAddress({
      logisticsZoneId: address.logisticsZoneId,
    });
    const activeRates = await deliveryPricingRepository.activeRates(destination.cityId);

    const totalBillableWeight = sumBillableWeightKg(
      itemDetails.map((item) => item.billableWeightKg),
    );

    const isCod = paymentMethod === 'COD';

    const delivery = resolveDeliveryPricing({
      subtotal: subtotalDecimal,
      weightKg: totalBillableWeight,
      isCod,
      freeDeliveryThreshold: destination.freeDeliveryThreshold,
      flatShippingFee: new Prisma.Decimal(policy.flatShippingFee),
      rates: activeRates,
      cityId: destination.cityId,
    });

    const shippingFeeDecimal = delivery.shippingFee;
    const totalAmountDecimal = subtotalDecimal.plus(shippingFeeDecimal);
    const deliveryPricingSource =
      delivery.source === 'RATE_CARD'
        ? DeliveryPricingSource.RATE_CARD
        : DeliveryPricingSource.FALLBACK;

    if (paymentMethod === 'COD' && !isCodAllowed(totalAmountDecimal.toNumber(), policy)) {
      throw new AppError(
        `Cash on Delivery (COD) is limited to maximum NPR ${policy.codMaxLimit}. Please pay the total of NPR ${totalAmountDecimal.toFixed(2)} with eSewa or Khalti.`,
        HTTPSTATUS.BAD_REQUEST,
        ErrorCode.INVALID_REQUEST,
      );
    }

    // Enterprise order numbering: CEL-YYMMDD-XXXXXX
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
        courierFee: delivery.courierFee,
        absorbedShippingCost: delivery.absorbedCost,
        deliveryPricingSource,
        matchedShippingRateId: delivery.matchedRateId,
        codHandlingFee: new Prisma.Decimal(0),
        amountToCollect: isCOD ? totalAmountDecimal : null,
        logisticsZoneId: destination.zoneId,
        totalBillableWeightKg: totalBillableWeight,
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
        for (let attempt = 0; attempt < 10; attempt++) {
          const recheck = await this.checkoutRepo.findIdempotencyKey(idempotencyKey, userId);
          if (recheck) {
            const parsed = JSON.parse(recheck.responseBody);
            if (parsed.order?.id) {
              return parsed;
            }
          }
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
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

    // Stock just moved: refresh cached PDP truth for the ordered products.
    // Home rails follow on the same beat: one DEL, ~1:100 write:read.
    for (const productId of new Set(itemDetails.map((item) => item.productId))) {
      purgeProductDetail(productId);
    }
    purgeProductHome();

    // Record what the sale was worth. Runs after the reservation committed, and is
    // keyed on the order so a retried checkout records it once. Best effort: a
    // ledger failure must not fail an order the customer has already placed, and
    // the entry is derived from the order row rather than from live pricing, so it
    // can be posted again later from the same numbers.
    await postOrderPlacementEntries({ orderId: order.id }).catch((error: unknown) => {
      logger.error(
        { orderId: order.id, error: (error as Error).message },
        'Could not record the order in the ledger; it must be posted manually',
      );
    });

    // Commission, one entry per seller, from the rate frozen on each line. Separate
    // from the placement entries above because it is attributed per line rather
    // than per order: a basket can hold several sellers' goods, and revenue is
    // posted once for the whole subtotal.
    await postOrderCommissionEntries({ orderId: order.id }).catch((error: unknown) => {
      logger.error(
        { orderId: order.id, error: (error as Error).message },
        'Could not record commission in the ledger; it must be posted manually',
      );
    });

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
        paymentResult = await adapter.createPaymentIntent(order.id, totalAmountDecimal, 'NPR', {
          orderNumber: order.orderNumber,
          userId,
          ...walletMeta,
        });

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
          // Released stock moved truth again for the same products.
          for (const productId of new Set(itemDetails.map((item) => item.productId))) {
            purgeProductDetail(productId);
          }
          purgeProductHome();
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

    // Dispatch in-app and push notification for customer
    this.notificationService
      .notifyOrderStatus({
        userId,
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: order.paymentMethod === 'COD' ? 'CONFIRMED' : 'PENDING',
        totalAmount: totalAmountDecimal.toNumber(),
      })
      .catch((notifErr) => {
        logger.warn({ orderId: order.id, err: notifErr }, 'Failed to dispatch order notification');
      });

    // Dispatch in-app notification for platform admins and vendors
    const vendorIds = Array.from(
      new Set(order.items.map((i) => i.vendorId).filter((v): v is string => Boolean(v))),
    );
    this.notificationService
      .notifyNewOrderForAdminsAndVendors({
        orderId: order.id,
        orderNumber: order.orderNumber,
        totalAmount: totalAmountDecimal.toNumber(),
        vendorIds,
      })
      .catch((err) => {
        logger.warn(
          { orderId: order.id, err },
          'Failed to dispatch admin/vendor order notification',
        );
      });

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
