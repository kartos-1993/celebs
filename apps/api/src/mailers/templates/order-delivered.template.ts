import { renderBadge, renderButton, renderEmailLayout } from './email-layout';

import { buildWebUrl } from '@/common/utils/url';

export interface OrderDeliveredItem {
  productName: string;
  colorVariantName?: string;
  size?: string;
  quantity: number;
}

export interface OrderDeliveredEmailParams {
  orderNumber: string;
  customerName: string;
  deliveryDate?: string | Date;
  items: OrderDeliveredItem[];
  reviewUrl?: string;
}

export function orderDeliveredTemplate(params: OrderDeliveredEmailParams) {
  const { orderNumber, customerName, deliveryDate = new Date(), items } = params;

  const subject = `Your order #${orderNumber} has been delivered!`;
  const reviewLink = params.reviewUrl || buildWebUrl('/my-orders?tab=TO_REVIEW');

  const deliveryStr =
    deliveryDate instanceof Date
      ? deliveryDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : String(deliveryDate);

  const textItems = items
    .map(
      (item) =>
        `- ${item.productName} (${item.colorVariantName || 'Default'}, ${item.size || 'One Size'}) x ${item.quantity}`,
    )
    .join('\n');

  const text = `
Dear ${customerName},

Your order #${orderNumber} has been delivered on ${deliveryStr}! We hope you love your new purchase.

Items delivered:
${textItems}

Leave a Review:
Help other shoppers by rating and reviewing your items!
Review now: ${reviewLink}

If you have any questions or have not received your package, please contact our support team immediately at support@celebs.com.np.

Thank you for shopping with Celebs!
`.trim();

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
      ${renderBadge('Delivered', 'success')}
    </div>
    <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 700; color: #0F172A; line-height: 1.3;">
      Package Delivered!
    </h1>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155; line-height: 1.6;">
      Dear ${customerName},
    </p>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155; line-height: 1.6;">
      Your order <strong>#${orderNumber}</strong> was successfully delivered on <strong>${deliveryStr}</strong>. We hope you love everything in your package!
    </p>

    <div style="text-align: center; margin: 28px 0 20px 0;">
      <p style="font-size: 14px; color: #475569; margin-bottom: 8px; font-weight: 500;">
        How was your order? Rate your items to earn points!
      </p>
      ${renderButton('Review Your Purchase', reviewLink)}
    </div>

    <h2 style="margin: 24px 0 8px 0; font-size: 15px; font-weight: 600; color: #0F172A;">
      Delivered Items
    </h2>
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
      ${itemsHtml}
    </table>

    <p style="margin: 20px 0 0 0; font-size: 13px; color: #64748B; line-height: 1.5;">
      Did not receive this package or have an issue with your items? Reach out to <a href="mailto:support@celebs.com.np" style="color: #0F172A; font-weight: 600; text-decoration: underline;">support@celebs.com.np</a> within 7 days.
    </p>
  `;

  return {
    subject,
    text,
    html: renderEmailLayout({
      title: subject,
      previewText: `Your order #${orderNumber} was successfully delivered!`,
      contentHtml,
    }),
  };
}
