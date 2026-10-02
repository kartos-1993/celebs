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
  /**
   * What actually happened to the money.
   *
   * The template used to assert a refund was on its way for any online payment,
   * which was true of neither wallet: one has no refund API at all, and before
   * this existed nothing was sent to either. The customer is told what happened.
   */
  refundOutcome?: RefundOutcome;
}

export type RefundOutcome =
  | 'SUCCEEDED'
  | 'REQUIRES_MANUAL_ACTION'
  | 'FAILED'
  | 'NOT_REQUIRED'
  | 'NOT_ATTEMPTED';

/**
 * What we can honestly promise a customer about their money.
 *
 * A wallet that confirmed the refund: it is on its way, and the wallet is what
 * sets the timescale. A wallet with no refund API: the money is safe with us and
 * our team returns it by hand, which is slower and worth saying plainly. A failed
 * attempt: the cancellation still stands and someone will be in touch, because
 * silence here would leave a customer believing they had been paid back.
 */
function buildRefundNotice(
  paymentMethod: string,
  totalAmount: number | string,
  refundOutcome: RefundOutcome | undefined,
): string {
  const amount = `NPR ${Number(totalAmount).toLocaleString()}`;

  if (paymentMethod === 'COD') {
    return 'As this order was placed with Cash on Delivery (COD), no payment was charged.';
  }

  switch (refundOutcome) {
    case 'SUCCEEDED':
      return `Your refund of ${amount} has been sent to ${paymentMethod} and should reach your ${paymentMethod} wallet within 1-3 business days.`;
    case 'REQUIRES_MANUAL_ACTION':
      return `Your ${paymentMethod} payment of ${amount} is being returned to you manually, because ${paymentMethod} does not process refunds automatically. Our team will complete this for you, usually within 3 business days, and will contact you if there is any delay.`;
    case 'FAILED':
      return `We could not start the return of your ${amount} automatically. Your ${paymentMethod} payment is safe with us and our team will complete the refund. Please allow 3 business days, and contact support if you have not been credited.`;
    case 'NOT_ATTEMPTED':
    case 'NOT_REQUIRED':
    case undefined:
      return `Since you paid via ${paymentMethod}, a refund of ${amount} will be arranged. Please allow 3 business days. Contact our support team if the amount does not return to your account.`;
    default:
      return `Since you paid via ${paymentMethod}, a refund of ${amount} will be arranged. Please allow 3 business days.`;
  }
}

export function orderCancelledTemplate(params: OrderCancelledEmailParams) {
  const { orderNumber, customerName, paymentMethod, totalAmount, items, reason } = params;

  const subject = `Order #${orderNumber} Cancellation Confirmation`;
  const catalogUrl = buildWebUrl('/');

  const refundNotice = buildRefundNotice(paymentMethod, totalAmount, params.refundOutcome);

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
