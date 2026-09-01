import {
  AddressInput,
  CheckoutInput,
  COD_MAX_LIMIT,
  UpdateAddressInput,
} from '@celebs/shared-types';
import { AppError, ErrorCode, HTTPSTATUS, logger } from '@celebs/shared-utils';

import { IPaymentGateway } from './adapters/payment-gateway.interface';
import { StripePaymentAdapter } from './adapters/stripe-payment.adapter';
import { orderRepository } from './order.repository';

import { PLATFORM_VENDOR_ID } from '@/common/constants/platform-vendor';
import prisma, { Prisma } from '@/config/db.prisma';

export class OrderService {
  private getPaymentGateway(method: 'STRIPE' | 'KHALTI' | 'ESEWA'): IPaymentGateway {
    switch (method) {
      case 'STRIPE':
        return new StripePaymentAdapter();
      default:
        throw new AppError(
          `Payment gateway for ${method} is not configured`,
          HTTPSTATUS.BAD_REQUEST,
          ErrorCode.INVALID_REQUEST,
        );
    }
  }

  // --- ADDRESS MANAGEMENT ---

  async getUserAddresses(userId: string) {
    return orderRepository.findAddressesByUser(userId);
  }

  async createAddress(userId: string, input: AddressInput) {
    if (input.isDefault) {
      await orderRepository.unsetOtherDefaultAddresses(userId, '');
    }

    return orderRepository.createAddress({
      userId,
      fullName: input.fullName,
      phone: input.phone,
      altPhone: input.altPhone,
      province: input.province,
      district: input.district,
      cityArea: input.cityArea,
      streetAddress: input.streetAddress,
      landmark: input.landmark,
      label: input.label || 'Home',
      isDefault: input.isDefault,
    });
  }

  async updateAddress(userId: string, addressId: string, input: UpdateAddressInput) {
    const existing = await orderRepository.findAddressById(addressId, userId);

    if (!existing) {
      throw new AppError('Address not found', HTTPSTATUS.NOT_FOUND, ErrorCode.RESOURCE_NOT_FOUND);
    }

    if (input.isDefault) {
      await orderRepository.unsetOtherDefaultAddresses(userId, addressId);
    }

    return orderRepository.updateAddress(addressId, userId, input);
  }

  async deleteAddress(userId: string, addressId: string) {
    const existing = await orderRepository.findAddressById(addressId, userId);

    if (!existing) {
      throw new AppError('Address not found', HTTPSTATUS.NOT_FOUND, ErrorCode.RESOURCE_NOT_FOUND);
    }

    return orderRepository.deleteAddress(addressId);
  }

  // --- CHECKOUT & ORDER CREATION ---

  async checkout(userId: string, input: CheckoutInput) {
    const { paymentMethod, idempotencyKey } = input;
    let targetAddressId = input.addressId;

    if (!targetAddressId && input.shippingAddress) {
      const createdAddress = await this.createAddress(userId, input.shippingAddress);
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
    const existingIdempotency = await orderRepository.findIdempotencyKey(idempotencyKey, userId);

    if (existingIdempotency) {
      return JSON.parse(existingIdempotency.responseBody);
    }

    // Verify Address
    const address = await orderRepository.findAddressById(targetAddressId, userId);

    if (!address) {
      throw new AppError(
        'Selected shipping address not found',
        HTTPSTATUS.BAD_REQUEST,
        ErrorCode.INVALID_REQUEST,
      );
    }

    // Fetch Cart
    const cart = await orderRepository.findCartWithItemsByUserId(userId);

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

    // Batch product lookup — one query instead of N+1 per cart line.
    const cartProductIds = Array.from(new Set(cart.items.map((item) => item.inventory.productId)));
    const cartProducts = await prisma.product.findMany({
      where: { id: { in: cartProductIds } },
      select: { id: true, price: true, discountedPrice: true, name: true, vendorId: true },
    });
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
          `Product details not found for inventory item`,
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
      : new Prisma.Decimal(150); // Free shipping over Rs. 3000
    const totalAmountDecimal = subtotalDecimal.add(shippingFeeDecimal);

    if (paymentMethod === 'COD' && totalAmountDecimal.gt(COD_MAX_LIMIT)) {
      throw new AppError(
        `Cash on Delivery (COD) is limited to maximum NPR ${COD_MAX_LIMIT}. Please select Stripe or local online payment for total NPR ${totalAmountDecimal.toFixed(2)}.`,
        HTTPSTATUS.BAD_REQUEST,
        ErrorCode.INVALID_REQUEST,
      );
    }

    const orderNumber = `CEL-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;
    const isCOD = paymentMethod === 'COD';
    const orderStatus = isCOD ? 'CONFIRMED' : 'PENDING_PAYMENT';
    const paymentStatus = isCOD ? 'PENDING' : 'PENDING';

    let order;
    try {
      // Atomic Transaction: Reserve Stock + Create Order + Clear Cart + Placeholder Idempotency
      order = await orderRepository.runTransaction(async (tx: Prisma.TransactionClient) => {
        // 1. Authoritative conditional atomic stock reservation
        for (const item of itemDetails) {
          const updated = await tx.$executeRaw`
            UPDATE "ProductInventory"
            SET reserved_quantity = reserved_quantity + ${item.quantity}
            WHERE id = ${item.inventoryId}
              AND quantity - reserved_quantity >= ${item.quantity}`;
          if (updated === 0) {
            throw new AppError(
              `Insufficient stock for item (${item.colorVariantName} - ${item.size}) at checkout`,
              HTTPSTATUS.CONFLICT,
              ErrorCode.INVALID_REQUEST,
            );
          }
        }

        // 2. Create Order & Items
        const createdOrder = await tx.order.create({
          data: {
            orderNumber,
            userId,
            addressId: targetAddressId,
            subtotal: subtotalDecimal,
            shippingFee: shippingFeeDecimal,
            discountAmount: new Prisma.Decimal(0),
            totalAmount: totalAmountDecimal,
            status: orderStatus,
            paymentMethod,
            paymentStatus,
            items: {
              create: itemDetails.map((det) => ({
                inventoryId: det.inventoryId,
                vendorId: det.vendorId,
                productName: det.productName,
                colorVariantName: det.colorVariantName,
                size: det.size,
                unitPrice: det.unitPrice,
                quantity: det.quantity,
                subtotal: det.subtotal,
                itemStatus: isCOD ? 'PENDING' : 'PENDING',
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
            status: orderStatus,
            title: 'Order Placed',
            description: isCOD
              ? 'Your order has been confirmed. Pay with cash on delivery.'
              : 'Order received. Complete the payment to begin processing.',
            source: 'SYSTEM',
          },
        });

        // 3. Clear User Cart
        await tx.cartItem.deleteMany({
          where: { cartId: cart.id },
        });

        // 4. Create placeholder idempotency key inside the transaction to guard against concurrent replay
        await tx.idempotencyKey.create({
          data: {
            key: idempotencyKey,
            userId,
            statusCode: 201,
            responseBody: JSON.stringify({ status: 'PROCESSING', retry_with_new_key: true }),
          },
        });

        return createdOrder;
      });
    } catch (err: unknown) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const recheck = await orderRepository.findIdempotencyKey(idempotencyKey, userId);
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

    // Initialize Payment Intent for online payments
    let paymentResult = null;
    if (paymentMethod !== 'COD') {
      const adapter = this.getPaymentGateway(paymentMethod);
      paymentResult = await adapter.createPaymentIntent(
        order.id,
        totalAmountDecimal.toNumber(),
        'NPR',
        {
          orderNumber: order.orderNumber,
          userId,
        },
      );

      await orderRepository.createPayment({
        orderId: order.id,
        userId,
        amount: totalAmountDecimal,
        currency: 'NPR',
        gateway: paymentMethod,
        transactionId: paymentResult.paymentId,
        status: 'PENDING',
        rawResponse: (paymentResult.rawResponse as Prisma.InputJsonValue) || {},
      });
    }

    const responseBody = {
      order,
      payment: paymentResult,
    };

    // Update Idempotency Key with finalized response
    await orderRepository.updateIdempotencyKeyResponse(
      idempotencyKey,
      JSON.stringify(responseBody),
    );

    return responseBody;
  }

  // --- CUSTOMER ORDER QUERIES ---

  async getMyOrders(userId: string, page = 1, limit = 10) {
    return orderRepository.findOrdersByUser(userId, page, limit);
  }

  async getOrderById(userId: string, orderId: string) {
    const order = await orderRepository.findOrderById(orderId, userId);

    if (!order) {
      throw new AppError('Order not found', HTTPSTATUS.NOT_FOUND, ErrorCode.RESOURCE_NOT_FOUND);
    }

    return order;
  }

  async cancelOrder(userId: string, orderId: string) {
    const order = await orderRepository.findOrderById(orderId, userId);

    if (!order) {
      throw new AppError('Order not found', HTTPSTATUS.NOT_FOUND, ErrorCode.RESOURCE_NOT_FOUND);
    }

    if (['SHIPPED', 'DELIVERED', 'CANCELLED'].includes(order.status)) {
      throw new AppError(
        `Cannot cancel order in status ${order.status}`,
        HTTPSTATUS.BAD_REQUEST,
        ErrorCode.INVALID_REQUEST,
      );
    }

    return orderRepository.runTransaction(async (tx: Prisma.TransactionClient) => {
      // Release reserved stock back to available
      for (const item of order.items) {
        await tx.productInventory.update({
          where: { id: item.inventoryId },
          data: {
            reservedQuantity: {
              decrement: item.quantity,
            },
          },
        });
      }

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
    });
  }

  // --- VENDOR FULFILLMENT ---

  async getVendorOrders(
    vendorId?: string,
    status?: string,
    page = 1,
    limit = 10,
    isPlatform = false,
  ) {
    if (!vendorId && !isPlatform) {
      throw new AppError(
        'Seller store context required',
        HTTPSTATUS.FORBIDDEN,
        ErrorCode.SELLER_CONTEXT_REQUIRED,
      );
    }

    const whereCondition: Prisma.OrderItemWhereInput = {};
    if (vendorId) {
      whereCondition.vendorId = vendorId;
    }
    if (status) {
      whereCondition.itemStatus = status as Prisma.EnumOrderItemStatusFilter['equals'];
    }

    return orderRepository.findVendorOrderItems(whereCondition, page, limit);
  }

  async getVendorOrderById(orderId: string, vendorId?: string, isPlatform = false) {
    if (!vendorId && !isPlatform) {
      throw new AppError(
        'Seller store context required',
        HTTPSTATUS.FORBIDDEN,
        ErrorCode.SELLER_CONTEXT_REQUIRED,
      );
    }

    const order = await orderRepository.findVendorOrderWithItems(
      orderId,
      isPlatform ? undefined : vendorId,
    );

    if (!order || (Array.isArray(order.items) && order.items.length === 0)) {
      throw new AppError('Order not found', HTTPSTATUS.NOT_FOUND, ErrorCode.RESOURCE_NOT_FOUND);
    }

    return order;
  }

  async updateOrderItemStatus(
    vendorId: string | undefined,
    orderItemId: string,
    itemStatus: 'PENDING' | 'PACKED' | 'HANDED_OVER' | 'DELIVERED' | 'CANCELLED',
    trackingNumber?: string,
    courierPartner?: string,
    isPlatform = false,
  ) {
    const item = isPlatform
      ? await orderRepository.findOrderItemById(orderItemId)
      : await orderRepository.findVendorOrderItemById(orderItemId, vendorId || '');

    if (!item) {
      throw new AppError(
        isPlatform ? 'Order item not found' : 'Order item not found for vendor',
        HTTPSTATUS.NOT_FOUND,
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    return orderRepository.runTransaction(async (tx: Prisma.TransactionClient) => {
      const updatedItem = await tx.orderItem.update({
        where: { id: orderItemId },
        data: {
          itemStatus,
          ...(trackingNumber ? { trackingNumber } : {}),
          ...(courierPartner ? { courierPartner } : {}),
        },
      });

      // If item is DELIVERED, finalize inventory deduction
      if (itemStatus === 'DELIVERED' && item.itemStatus !== 'DELIVERED') {
        await tx.productInventory.update({
          where: { id: item.inventoryId },
          data: {
            quantity: { decrement: item.quantity },
            reservedQuantity: { decrement: item.quantity },
          },
        });
      }

      // If item is CANCELLED and was not already CANCELLED or DELIVERED, release reserved stock
      if (
        itemStatus === 'CANCELLED' &&
        item.itemStatus !== 'CANCELLED' &&
        item.itemStatus !== 'DELIVERED'
      ) {
        await tx.productInventory.update({
          where: { id: item.inventoryId },
          data: {
            reservedQuantity: { decrement: item.quantity },
          },
        });
      }

      // Check if all items in the parent order have reached the new status
      const allItems = await tx.orderItem.findMany({
        where: { orderId: item.orderId },
      });

      const allPacked = allItems.every((i) =>
        ['PACKED', 'HANDED_OVER', 'DELIVERED'].includes(i.itemStatus),
      );
      const allHandedOver = allItems.every((i) =>
        ['HANDED_OVER', 'DELIVERED'].includes(i.itemStatus),
      );
      const allDelivered = allItems.every((i) => i.itemStatus === 'DELIVERED');

      let newOrderStatus = item.order.status;
      if (allDelivered) {
        newOrderStatus = 'DELIVERED';
      } else if (allHandedOver) {
        newOrderStatus = 'HANDED_OVER';
      } else if (allPacked) {
        newOrderStatus = 'PACKED';
      }

      const isPaid =
        item.order.paymentMethod === 'COD' ||
        Boolean(
          await tx.payment.findFirst({
            where: { orderId: item.orderId, status: 'COMPLETED' },
          }),
        );

      if (allDelivered && !isPaid) {
        logger.error(
          { orderId: item.orderId },
          'Order delivered without completed payment — paymentStatus left PENDING',
        );
      }

      if (newOrderStatus !== item.order.status) {
        await tx.order.update({
          where: { id: item.orderId },
          data: {
            status: newOrderStatus,
            ...(allDelivered && isPaid ? { paymentStatus: 'COMPLETED' } : {}),
          },
        });

        // Mirror the rollup onto the customer-facing tracking timeline
        const eventTitle =
          newOrderStatus === 'PACKED'
            ? 'Order Packed'
            : newOrderStatus === 'HANDED_OVER'
              ? 'Handed Over to Courier'
              : 'Delivered';
        const eventDescription =
          newOrderStatus === 'HANDED_OVER'
            ? `Your package ${trackingNumber ? `(${trackingNumber}) ` : ''}is on its way${
                courierPartner ? ` via ${courierPartner}` : ''
              }.`
            : undefined;

        await tx.orderTrackingEvent.create({
          data: {
            orderId: item.orderId,
            status: newOrderStatus,
            title: eventTitle,
            ...(eventDescription ? { description: eventDescription } : {}),
            ...(courierPartner ? { location: courierPartner } : {}),
            source: isPlatform ? 'PLATFORM' : 'VENDOR',
          },
        });
      }

      return updatedItem;
    });
  }

  // --- MAINTENANCE & REAPER ---

  async releaseStaleReservations(): Promise<{ cancelledOrders: number }> {
    const ttlHours = Number(process.env.ORDER_RESERVATION_TTL_HOURS ?? 2);
    const cutoff = new Date(Date.now() - ttlHours * 3600_000);

    const staleOrders = await prisma.order.findMany({
      where: {
        status: 'PENDING_PAYMENT',
        paymentStatus: 'PENDING',
        paymentMethod: { not: 'COD' },
        updatedAt: { lte: cutoff },
      },
      include: {
        items: true,
      },
    });

    let cancelledCount = 0;

    for (const order of staleOrders) {
      try {
        await orderRepository.runTransaction(async (tx: Prisma.TransactionClient) => {
          for (const item of order.items) {
            if (item.itemStatus !== 'CANCELLED' && item.itemStatus !== 'DELIVERED') {
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
            where: { orderId: order.id },
            data: { itemStatus: 'CANCELLED' },
          });

          await tx.order.update({
            where: { id: order.id },
            data: { status: 'CANCELLED' },
          });
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

  // --- ADMIN OVERVIEW ---

  async adminGetOrders(status?: string, page = 1, limit = 10) {
    return orderRepository.findAdminOrders(status, page, limit);
  }
}
