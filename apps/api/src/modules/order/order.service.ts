import { AppError, HTTPSTATUS, ErrorCode } from '@celebs/shared-utils';
import { AddressInput, CheckoutInput, COD_MAX_LIMIT, UpdateAddressInput } from '@celebs/shared-types';
import prisma from '@/db';
import { Prisma } from '@/generated/prisma';
import { ProductModel } from '@/db/models/product.model';
import { IPaymentGateway } from './adapters/payment-gateway.interface';
import { MockPaymentAdapter } from './adapters/mock-payment.adapter';
import { StripePaymentAdapter } from './adapters/stripe-payment.adapter';

export class OrderService {
  private getPaymentGateway(method: 'COD' | 'STRIPE' | 'KHALTI' | 'ESEWA'): IPaymentGateway {
    switch (method) {
      case 'STRIPE':
        return new StripePaymentAdapter();
      default:
        return new MockPaymentAdapter();
    }
  }

  // --- ADDRESS MANAGEMENT ---

  async getUserAddresses(userId: string) {
    return prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async createAddress(userId: string, input: AddressInput) {
    if (input.isDefault) {
      await prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    return prisma.address.create({
      data: {
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
      },
    });
  }

  async updateAddress(userId: string, addressId: string, input: UpdateAddressInput) {
    const existing = await prisma.address.findFirst({
      where: { id: addressId, userId },
    });

    if (!existing) {
      throw new AppError('Address not found', HTTPSTATUS.NOT_FOUND, ErrorCode.RESOURCE_NOT_FOUND);
    }

    if (input.isDefault) {
      await prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    return prisma.address.update({
      where: { id: addressId },
      data: input,
    });
  }

  async deleteAddress(userId: string, addressId: string) {
    const existing = await prisma.address.findFirst({
      where: { id: addressId, userId },
    });

    if (!existing) {
      throw new AppError('Address not found', HTTPSTATUS.NOT_FOUND, ErrorCode.RESOURCE_NOT_FOUND);
    }

    return prisma.address.delete({
      where: { id: addressId },
    });
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
      throw new AppError('Shipping address or addressId is required', HTTPSTATUS.BAD_REQUEST, ErrorCode.INVALID_REQUEST);
    }

    // Check Idempotency Key
    const existingIdempotency = await prisma.idempotencyKey.findUnique({
      where: { key: idempotencyKey },
    });

    if (existingIdempotency) {
      return JSON.parse(existingIdempotency.responseBody);
    }

    // Verify Address
    const address = await prisma.address.findFirst({
      where: { id: targetAddressId, userId },
    });

    if (!address) {
      throw new AppError('Selected shipping address not found', HTTPSTATUS.BAD_REQUEST, ErrorCode.INVALID_REQUEST);
    }

    // Fetch Cart
    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            inventory: true,
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new AppError('Your cart is empty', HTTPSTATUS.BAD_REQUEST, ErrorCode.INVALID_REQUEST);
    }

    // Resolve Product MongoDB Info and Calculate Totals
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

    for (const item of cart.items) {
      const inv = item.inventory;
      const availableQty = inv.quantity - inv.reservedQuantity;

      if (availableQty < item.quantity) {
        throw new AppError(
          `Insufficient stock for item (${inv.colorVariantName} - ${inv.size}). Available: ${availableQty}, Requested: ${item.quantity}`,
          HTTPSTATUS.BAD_REQUEST,
          ErrorCode.INVALID_REQUEST
        );
      }

      const product = await ProductModel.findById(inv.productId).lean();
      if (!product) {
        throw new AppError(`Product details not found for inventory item`, HTTPSTATUS.NOT_FOUND, ErrorCode.RESOURCE_NOT_FOUND);
      }

      const rawPrice = product.discountedPrice && product.discountedPrice > 0 ? product.discountedPrice : product.price;
      const unitPriceDecimal = new Prisma.Decimal(rawPrice);
      const lineSubtotalDecimal = unitPriceDecimal.mul(item.quantity);
      subtotalDecimal = subtotalDecimal.add(lineSubtotalDecimal);

      const vendorId = product.vendorId ? String(product.vendorId) : '';
      if (!vendorId) {
        throw new AppError(`Vendor not assigned for product: ${product.name}`, HTTPSTATUS.BAD_REQUEST, ErrorCode.INVALID_REQUEST);
      }

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
    const shippingFeeDecimal = subtotalDecimal.gt(3000) ? new Prisma.Decimal(0) : new Prisma.Decimal(150); // Free shipping over Rs. 3000
    const totalAmountDecimal = subtotalDecimal.add(shippingFeeDecimal);

    if (paymentMethod === 'COD' && totalAmountDecimal.gt(COD_MAX_LIMIT)) {
      throw new AppError(
        `Cash on Delivery (COD) is limited to maximum NPR ${COD_MAX_LIMIT}. Please select Stripe or local online payment for total NPR ${totalAmountDecimal.toFixed(2)}.`,
        HTTPSTATUS.BAD_REQUEST,
        ErrorCode.INVALID_REQUEST
      );
    }

    const orderNumber = `CEL-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;
    const isCOD = paymentMethod === 'COD';
    const orderStatus = isCOD ? 'CONFIRMED' : 'PENDING_PAYMENT';
    const paymentStatus = isCOD ? 'PENDING' : 'PENDING';

    // Atomic Transaction: Reserve Stock + Create Order + Clear Cart
    const order = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Reserve inventory quantity
      for (const item of itemDetails) {
        await tx.productInventory.update({
          where: { id: item.inventoryId },
          data: {
            reservedQuantity: {
              increment: item.quantity,
            },
          },
        });
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

      // 3. Clear User Cart
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      return createdOrder;
    });

    // Initialize Payment Intent for online payments
    let paymentResult = null;
    if (!isCOD) {
      const adapter = this.getPaymentGateway(paymentMethod);
      paymentResult = await adapter.createPaymentIntent(order.id, totalAmountDecimal.toNumber(), 'NPR', {
        orderNumber: order.orderNumber,
        userId,
      });

      await prisma.payment.create({
        data: {
          orderId: order.id,
          userId,
          amount: totalAmountDecimal,
          currency: 'NPR',
          gateway: paymentMethod,
          transactionId: paymentResult.paymentId,
          status: 'PENDING',
          rawResponse: paymentResult.rawResponse || {},
        },
      });
    }

    const responseBody = {
      order,
      payment: paymentResult,
    };

    // Record Idempotency Key
    await prisma.idempotencyKey.create({
      data: {
        key: idempotencyKey,
        userId,
        statusCode: 201,
        responseBody: JSON.stringify(responseBody),
      },
    });

    return responseBody;
  }

  // --- CUSTOMER ORDER QUERIES ---

  async getMyOrders(userId: string, page = 1, limit = 10) {
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

  async getOrderById(userId: string, orderId: string) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, userId },
      include: {
        items: true,
        address: true,
        payments: true,
      },
    });

    if (!order) {
      throw new AppError('Order not found', HTTPSTATUS.NOT_FOUND, ErrorCode.RESOURCE_NOT_FOUND);
    }

    return order;
  }

  async cancelOrder(userId: string, orderId: string) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { items: true },
    });

    if (!order) {
      throw new AppError('Order not found', HTTPSTATUS.NOT_FOUND, ErrorCode.RESOURCE_NOT_FOUND);
    }

    if (['SHIPPED', 'DELIVERED', 'CANCELLED'].includes(order.status)) {
      throw new AppError(`Cannot cancel order in status ${order.status}`, HTTPSTATUS.BAD_REQUEST, ErrorCode.INVALID_REQUEST);
    }

    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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

      return tx.order.update({
        where: { id: order.id },
        data: { status: 'CANCELLED' },
      });
    });
  }

  // --- VENDOR FULFILLMENT ---

  async getVendorOrders(vendorId: string, status?: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const whereCondition: any = { vendorId };
    if (status) {
      whereCondition.itemStatus = status;
    }

    const [items, total] = await Promise.all([
      prisma.orderItem.findMany({
        where: whereCondition,
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
      prisma.orderItem.count({ where: whereCondition }),
    ]);

    return { items, total, page, limit };
  }

  async updateOrderItemStatus(
    vendorId: string,
    orderItemId: string,
    itemStatus: 'PENDING' | 'PACKED' | 'HANDED_OVER' | 'DELIVERED' | 'CANCELLED',
    trackingNumber?: string,
    courierPartner?: string
  ) {
    const item = await prisma.orderItem.findFirst({
      where: { id: orderItemId, vendorId },
      include: { order: { include: { items: true } } },
    });

    if (!item) {
      throw new AppError('Order item not found for vendor', HTTPSTATUS.NOT_FOUND, ErrorCode.RESOURCE_NOT_FOUND);
    }

    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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

      // Check if all items in the parent order have reached the new status
      const allItems = await tx.orderItem.findMany({
        where: { orderId: item.orderId },
      });

      const allPacked = allItems.every((i) => ['PACKED', 'HANDED_OVER', 'DELIVERED'].includes(i.itemStatus));
      const allHandedOver = allItems.every((i) => ['HANDED_OVER', 'DELIVERED'].includes(i.itemStatus));
      const allDelivered = allItems.every((i) => i.itemStatus === 'DELIVERED');

      let newOrderStatus = item.order.status;
      if (allDelivered) {
        newOrderStatus = 'DELIVERED';
      } else if (allHandedOver) {
        newOrderStatus = 'HANDED_OVER';
      } else if (allPacked) {
        newOrderStatus = 'PACKED';
      }

      if (newOrderStatus !== item.order.status) {
        await tx.order.update({
          where: { id: item.orderId },
          data: {
            status: newOrderStatus,
            ...(allDelivered ? { paymentStatus: 'COMPLETED' } : {}),
          },
        });
      }

      return updatedItem;
    });
  }

  // --- ADMIN OVERVIEW ---

  async adminGetOrders(status?: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const whereCondition: any = status ? { status: status as any } : {};

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
}
