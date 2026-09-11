import { renderBadge, renderButton, renderEmailLayout, renderInfoCard } from './email-layout';

import { buildWebUrl } from '@/common/utils/url';

export interface OrderCancelledItem {
  productName: string;
  colorVariantName?: string;
  size?: string;
  quantity: number;
}

export interface OrderCancelledEmailParams {
  orderNumber: string;
  customerName: string;
  paymentMethod: string;
  totalAmount: number | string;
  items: OrderCancelledItem[];
  reason?: string;
}

export function orderCancelledTemplate(params: OrderCancelledEmailParams) {
  const { orderNumber, customerName, paymentMethod, totalAmount, items, reason } = params;

  const subject = `Order #${orderNumber} Cancellation Confirmation`;
  const catalogUrl = buildWebUrl('/');

  const isOnlinePayment = paymentMethod === 'ESEWA' || paymentMethod === 'KHALTI';

  const refundNotice = isOnlinePayment
    ? `Since you paid via ${paymentMethod}, your refund of NPR ${Number(totalAmount).toLocaleString()} has been initiated and will reflect in your wallet within 1-3 business days.`
    : `As this order was placed with Cash on Delivery (COD), no payment was charged.`;

  const textItems = items
    .map(
      (item) =>
        `- ${item.productName} (${item.colorVariantName || 'Default'}, ${item.size || 'One Size'}) x ${item.quantity}`,
    )
    .join('\n');

  const text = `
Dear ${customerName},

Your order #${orderNumber} has been successfully cancelled.

${refundNotice}
${reason ? `Reason: ${reason}\n` : ''}

Cancelled Items:
${textItems}

Browse new arrivals: ${catalogUrl}

If you did not request this cancellation or have any questions, please contact our support team at support@celebs.com.np.

Thank you for choosing Celebs.
`.trim();

  const infoContentHtml = `
    <div style="font-weight: 700; color: #991B1B; font-size: 14px; margin-bottom: 6px;">
      Cancellation & Payment Details
    </div>
    <div style="font-size: 13px; color: #7F1D1D; line-height: 1.5;">
      ${refundNotice}
    </div>
    ${reason ? `<div style="font-size: 13px; color: #7F1D1D; margin-top: 6px;"><strong>Note:</strong> ${reason}</div>` : ''}
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
      ${renderBadge('Cancelled', 'danger')}
    </div>
    <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 700; color: #0F172A; line-height: 1.3;">
      Order Cancelled
    </h1>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155; line-height: 1.6;">
      Dear ${customerName},
    </p>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155; line-height: 1.6;">
      This email confirms that order <strong>#${orderNumber}</strong> has been cancelled.
    </p>

    ${renderInfoCard(infoContentHtml, 'danger')}

    <h2 style="margin: 24px 0 8px 0; font-size: 15px; font-weight: 600; color: #0F172A;">
      Cancelled Items
    </h2>
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
      ${itemsHtml}
    </table>

    <div style="text-align: center; margin: 28px 0 20px 0;">
      ${renderButton('Explore New Arrivals', catalogUrl)}
    </div>

    <p style="margin: 20px 0 0 0; font-size: 13px; color: #64748B; line-height: 1.5;">
      Have questions about your cancellation or refund? Contact us at <a href="mailto:support@celebs.com.np" style="color: #0F172A; font-weight: 600; text-decoration: underline;">support@celebs.com.np</a>.
    </p>
  `;

  return {
    subject,
    text,
    html: renderEmailLayout({
      title: subject,
      previewText: `Order #${orderNumber} has been cancelled.`,
      contentHtml,
    }),
  };
}
