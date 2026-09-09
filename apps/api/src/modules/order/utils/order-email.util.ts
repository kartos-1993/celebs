import { logger } from '@celebs/shared-utils';

import { enqueueMail } from '@/common/services/mail.queue';
import { orderConfirmationTemplate } from '@/mailers/templates';

export interface OrderEmailPayload {
  id: string;
  orderNumber: string;
  createdAt: Date | string;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  subtotal: { toString(): string } | string | number;
  shippingFee: { toString(): string } | string | number;
  discountAmount?: { toString(): string } | string | number;
  totalAmount: { toString(): string } | string | number;
  user?: {
    name?: string | null;
    email?: string | null;
  } | null;
  address?: {
    fullName: string;
    phone: string;
    streetAddress: string;
    cityArea: string;
    district: string;
    province: string;
    landmark?: string | null;
  } | null;
  items?: Array<{
    productName: string;
    colorVariantName: string;
    size: string;
    quantity: number;
    unitPrice: { toString(): string } | string | number;
    subtotal: { toString(): string } | string | number;
  }>;
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
        colorVariantName: i.colorVariantName,
        size: i.size,
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
