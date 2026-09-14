import { logger } from '@celebs/shared-utils';

import { enqueueMail } from '@/common/services/mail.queue';
import { orderConfirmationTemplate } from '@/mailers/templates';

export interface OrderEmailItem {
  productName: string;
  colorVariantName?: string | null;
  size?: string | null;
  quantity: number;
  unitPrice: { toString(): string } | string | number;
  subtotal: { toString(): string } | string | number;
}

export interface OrderEmailAddress {
  fullName: string;
  phone: string;
  streetAddress: string;
  cityArea: string;
  district: string;
  province: string;
  landmark?: string | null;
}

export interface OrderEmailUser {
  name?: string | null;
  email?: string | null;
}

export interface OrderEmailPayload {
  id: string;
  orderNumber: string;
  createdAt: Date | string;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  subtotal: { toString(): string } | string | number;
  shippingFee: { toString(): string } | string | number;
  discountAmount?: { toString(): string } | string | number | null;
  totalAmount: { toString(): string } | string | number;
  user?: OrderEmailUser | null;
  address?: OrderEmailAddress | null;
  items?: OrderEmailItem[];
}

export function toOrderEmailPayload(source: OrderEmailPayload): OrderEmailPayload {
  return {
    id: source.id,
    orderNumber: source.orderNumber,
    createdAt: source.createdAt,
    paymentMethod: String(source.paymentMethod),
    paymentStatus: String(source.paymentStatus),
    status: String(source.status),
    subtotal: source.subtotal,
    shippingFee: source.shippingFee,
    discountAmount: source.discountAmount ?? '0',
    totalAmount: source.totalAmount,
    user: source.user ? { name: source.user.name, email: source.user.email } : null,
    address: source.address
      ? {
          fullName: source.address.fullName,
          phone: source.address.phone,
          streetAddress: source.address.streetAddress,
          cityArea: source.address.cityArea,
          district: source.address.district,
          province: source.address.province,
          landmark: source.address.landmark,
        }
      : null,
    items: (source.items ?? []).map((item) => ({
      productName: item.productName,
      colorVariantName: item.colorVariantName || 'Default',
      size: item.size || 'One-size',
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.subtotal,
    })),
  };
}

/**
 * Safely enqueues an order confirmation / payment receipt email.
 * Decoupled from checkout business logic so service files remain lean and focused.
 */
export async function enqueueOrderConfirmationEmail(
  order: OrderEmailPayload,
  logContext: string = 'order-confirmation',
): Promise<void> {
  const recipientEmail = order.user?.email;
  if (!recipientEmail || !order.address || !order.items || order.items.length === 0) {
    return;
  }

  try {
    const mailContent = orderConfirmationTemplate({
      orderNumber: order.orderNumber,
      customerName: order.user?.name || order.address.fullName || 'Customer',
      orderDate: order.createdAt,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      orderStatus: order.status,
      items: order.items.map((i) => ({
        productName: i.productName,
        colorVariantName: i.colorVariantName || 'Default',
        size: i.size || 'One-size',
        quantity: i.quantity,
        unitPrice: i.unitPrice.toString(),
        subtotal: i.subtotal.toString(),
      })),
      subtotal: order.subtotal.toString(),
      shippingFee: order.shippingFee.toString(),
      discountAmount: order.discountAmount ? order.discountAmount.toString() : '0',
      totalAmount: order.totalAmount.toString(),
      shippingAddress: {
        fullName: order.address.fullName,
        phone: order.address.phone,
        streetAddress: order.address.streetAddress,
        cityArea: order.address.cityArea,
        district: order.address.district,
        province: order.address.province,
        landmark: order.address.landmark,
      },
    });

    await enqueueMail({
      to: recipientEmail,
      subject: mailContent.subject,
      text: mailContent.text,
      html: mailContent.html,
    });

    logger.info(
      {
        orderId: order.id,
        orderNumber: order.orderNumber,
        to: recipientEmail,
        context: logContext,
      },
      'Enqueued order confirmation email',
    );
  } catch (err) {
    logger.warn(
      { orderId: order.id, err, context: logContext },
      'Failed to enqueue order confirmation email — request flow unaffected',
    );
  }
}

/**
 * Safely enqueues an order shipped / dispatched notification email with courier info.
 */
export async function enqueueOrderShippedEmail(
  order: OrderEmailPayload,
  courierInfo?: {
    courierName?: string;
    trackingNumber?: string;
    trackingUrl?: string;
    estimatedDelivery?: Date | string;
  },
  logContext: string = 'order-shipped',
): Promise<void> {
  const recipientEmail = order.user?.email;
  if (!recipientEmail || !order.items || order.items.length === 0) {
    return;
  }

  try {
    const { orderShippedTemplate } = await import('@/mailers/templates');
    const mailContent = orderShippedTemplate({
      orderNumber: order.orderNumber,
      customerName: order.user?.name || order.address?.fullName || 'Customer',
      courierName: courierInfo?.courierName,
      trackingNumber: courierInfo?.trackingNumber,
      trackingUrl: courierInfo?.trackingUrl,
      estimatedDelivery: courierInfo?.estimatedDelivery,
      items: order.items.map((i) => ({
        productName: i.productName,
        colorVariantName: i.colorVariantName || undefined,
        size: i.size || undefined,
        quantity: i.quantity,
      })),
      shippingAddress: order.address
        ? {
            fullName: order.address.fullName,
            streetAddress: order.address.streetAddress,
            cityArea: order.address.cityArea,
            district: order.address.district,
          }
        : undefined,
    });

    await enqueueMail({
      to: recipientEmail,
      subject: mailContent.subject,
      text: mailContent.text,
      html: mailContent.html,
    });

    logger.info(
      {
        orderId: order.id,
        orderNumber: order.orderNumber,
        to: recipientEmail,
        context: logContext,
      },
      'Enqueued order shipped email',
    );
  } catch (err) {
    logger.warn(
      { orderId: order.id, err, context: logContext },
      'Failed to enqueue order shipped email — request flow unaffected',
    );
  }
}

/**
 * Safely enqueues an order delivered email with review call-to-action.
 */
export async function enqueueOrderDeliveredEmail(
  order: OrderEmailPayload,
  logContext: string = 'order-delivered',
): Promise<void> {
  const recipientEmail = order.user?.email;
  if (!recipientEmail || !order.items || order.items.length === 0) {
    return;
  }

  try {
    const { orderDeliveredTemplate } = await import('@/mailers/templates');
    const mailContent = orderDeliveredTemplate({
      orderNumber: order.orderNumber,
      customerName: order.user?.name || order.address?.fullName || 'Customer',
      items: order.items.map((i) => ({
        productName: i.productName,
        colorVariantName: i.colorVariantName || undefined,
        size: i.size || undefined,
        quantity: i.quantity,
      })),
    });

    await enqueueMail({
      to: recipientEmail,
      subject: mailContent.subject,
      text: mailContent.text,
      html: mailContent.html,
    });

    logger.info(
      {
        orderId: order.id,
        orderNumber: order.orderNumber,
        to: recipientEmail,
        context: logContext,
      },
      'Enqueued order delivered email',
    );
  } catch (err) {
    logger.warn(
      { orderId: order.id, err, context: logContext },
      'Failed to enqueue order delivered email — request flow unaffected',
    );
  }
}

/**
 * Safely enqueues an order cancellation confirmation email.
 */
export async function enqueueOrderCancelledEmail(
  order: OrderEmailPayload,
  reason?: string,
  logContext: string = 'order-cancelled',
): Promise<void> {
  const recipientEmail = order.user?.email;
  if (!recipientEmail || !order.items || order.items.length === 0) {
    return;
  }

  try {
    const { orderCancelledTemplate } = await import('@/mailers/templates');
    const mailContent = orderCancelledTemplate({
      orderNumber: order.orderNumber,
      customerName: order.user?.name || order.address?.fullName || 'Customer',
      paymentMethod: order.paymentMethod,
      totalAmount: order.totalAmount.toString(),
      items: order.items.map((i) => ({
        productName: i.productName,
        colorVariantName: i.colorVariantName || undefined,
        size: i.size || undefined,
        quantity: i.quantity,
      })),
      reason,
    });

    await enqueueMail({
      to: recipientEmail,
      subject: mailContent.subject,
      text: mailContent.text,
      html: mailContent.html,
    });

    logger.info(
      {
        orderId: order.id,
        orderNumber: order.orderNumber,
        to: recipientEmail,
        context: logContext,
      },
      'Enqueued order cancelled email',
    );
  } catch (err) {
    logger.warn(
      { orderId: order.id, err, context: logContext },
      'Failed to enqueue order cancelled email — request flow unaffected',
    );
  }
}
