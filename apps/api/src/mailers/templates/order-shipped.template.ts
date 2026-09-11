import { renderBadge, renderButton, renderEmailLayout, renderInfoCard } from './email-layout';

import { buildWebUrl } from '@/common/utils/url';

export interface OrderShippedItem {
  productName: string;
  colorVariantName?: string;
  size?: string;
  quantity: number;
}

export interface OrderShippedEmailParams {
  orderNumber: string;
  customerName: string;
  courierName?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  estimatedDelivery?: string | Date;
  items: OrderShippedItem[];
  shippingAddress?: {
    fullName: string;
    streetAddress: string;
    cityArea: string;
    district: string;
  };
  orderUrl?: string;
}

export function orderShippedTemplate(params: OrderShippedEmailParams) {
  const {
    orderNumber,
    customerName,
    courierName = 'Courier Partner',
    trackingNumber,
    trackingUrl,
    estimatedDelivery,
    items,
    shippingAddress,
  } = params;

  const subject = `Your order #${orderNumber} has been shipped!`;
  const trackingLink = trackingUrl || buildWebUrl(`/my-orders`);

  const deliveryStr = estimatedDelivery
    ? estimatedDelivery instanceof Date
      ? estimatedDelivery.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : String(estimatedDelivery)
    : undefined;

  const textItems = items
    .map(
      (item) =>
        `- ${item.productName} (${item.colorVariantName || 'Default'}, ${item.size || 'One Size'}) x ${item.quantity}`,
    )
    .join('\n');

  const text = `
Dear ${customerName},

Great news! Your order #${orderNumber} has been handed over to ${courierName} and is on its way.
${trackingNumber ? `Waybill / Tracking Number: ${trackingNumber}\n` : ''}
${deliveryStr ? `Estimated Delivery: ${deliveryStr}\n` : ''}
Track your delivery: ${trackingLink}

Items in this shipment:
${textItems}

${shippingAddress ? `Shipping to: ${shippingAddress.fullName}, ${shippingAddress.streetAddress}, ${shippingAddress.cityArea}` : ''}

Thank you for shopping with Celebs!
`.trim();

  const courierCardHtml = `
    <div style="font-weight: 700; color: #065F46; font-size: 14px; margin-bottom: 6px;">
      Shipped via ${courierName}
    </div>
    ${trackingNumber ? `<div style="font-size: 13px; color: #064E3B; margin-bottom: 4px;"><strong>Waybill / Tracking #:</strong> ${trackingNumber}</div>` : ''}
    ${deliveryStr ? `<div style="font-size: 13px; color: #064E3B;"><strong>Estimated Delivery:</strong> ${deliveryStr}</div>` : ''}
  `;

  const itemsHtml = items
    .map(
      (item) => `
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #F1F5F9; font-size: 14px; color: #1E293B;">
          <strong>${item.productName}</strong>
          <div style="font-size: 12px; color: #64748B;">${item.colorVariantName || ''} · Size ${item.size || 'One-size'}</div>
        </td>
        <td style="padding: 10px 0; border-bottom: 1px solid #F1F5F9; font-size: 14px; color: #64748B; text-align: right;">
          Qty: ${item.quantity}
        </td>
      </tr>
    `,
    )
    .join('');

  const contentHtml = `
    <div style="margin-bottom: 20px;">
      ${renderBadge('Dispatched', 'success')}
    </div>
    <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 700; color: #0F172A; line-height: 1.3;">
      Your package is on its way!
    </h1>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155; line-height: 1.6;">
      Dear ${customerName},
    </p>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155; line-height: 1.6;">
      Exciting news! Your order <strong>#${orderNumber}</strong> has been carefully packed and handed over to <strong>${courierName}</strong>.
    </p>

    ${renderInfoCard(courierCardHtml, 'success')}

    <div style="text-align: center; margin: 24px 0;">
      ${renderButton('Track Your Package', trackingLink)}
    </div>

    <h2 style="margin: 24px 0 8px 0; font-size: 15px; font-weight: 600; color: #0F172A;">
      Items in this package
    </h2>
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
      ${itemsHtml}
    </table>

    ${
      shippingAddress
        ? `
      <div style="padding: 12px 16px; background-color: #F8FAFC; border-radius: 8px; border: 1px solid #E2E8F0; font-size: 13px; color: #475569;">
        <strong>Delivering to:</strong> ${shippingAddress.fullName}, ${shippingAddress.streetAddress}, ${shippingAddress.cityArea}, ${shippingAddress.district}
      </div>
    `
        : ''
    }
  `;

  return {
    subject,
    text,
    html: renderEmailLayout({
      title: subject,
      previewText: `Order #${orderNumber} is on its way with ${courierName}!`,
      contentHtml,
    }),
  };
}
