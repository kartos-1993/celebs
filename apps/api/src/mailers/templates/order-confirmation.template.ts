import { renderBadge, renderButton, renderEmailLayout } from './email-layout';

import { buildWebUrl } from '@/common/utils/url';

export interface OrderConfirmationItem {
  productName: string;
  colorVariantName: string;
  size: string;
  quantity: number;
  unitPrice: number | string;
  subtotal: number | string;
}

export interface OrderConfirmationAddress {
  fullName: string;
  phone: string;
  streetAddress: string;
  cityArea: string;
  district: string;
  province: string;
  landmark?: string | null;
}

export interface OrderConfirmationEmailParams {
  orderNumber: string;
  customerName: string;
  orderDate?: string | Date;
  paymentMethod: 'COD' | 'ESEWA' | 'KHALTI' | string;
  paymentStatus: 'COMPLETED' | 'PENDING' | 'FAILED' | string;
  orderStatus?: string;
  items: OrderConfirmationItem[];
  subtotal: number | string;
  shippingFee: number | string;
  discountAmount?: number | string;
  totalAmount: number | string;
  shippingAddress: OrderConfirmationAddress;
  orderUrl?: string;
}

function formatNpr(val: number | string): string {
  const num = typeof val === 'number' ? val : parseFloat(val) || 0;
  return `NPR ${num.toLocaleString('en-NP', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function orderConfirmationTemplate(params: OrderConfirmationEmailParams) {
  const {
    orderNumber,
    customerName,
    orderDate = new Date(),
    paymentMethod,
    paymentStatus,
    items,
    subtotal,
    shippingFee,
    discountAmount = 0,
    totalAmount,
    shippingAddress,
  } = params;

  const dateStr =
    orderDate instanceof Date
      ? orderDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : String(orderDate);

  const isPaid = paymentStatus === 'COMPLETED';
  const isCOD = paymentMethod === 'COD';

  const paymentLabel =
    paymentMethod === 'COD'
      ? 'Cash on Delivery'
      : paymentMethod === 'ESEWA'
        ? 'eSewa'
        : paymentMethod === 'KHALTI'
          ? 'Khalti'
          : paymentMethod;

  const statusTone = isPaid || isCOD ? 'success' : 'warning';
  const statusBadgeText = isPaid ? 'Paid' : isCOD ? 'Confirmed (COD)' : 'Payment Pending';

  const orderUrl = params.orderUrl || buildWebUrl('/my-orders');

  // Generate plain text counterpart
  const textItems = items
    .map(
      (item) =>
        `- ${item.productName} (${item.colorVariantName}, Size ${item.size}) x ${item.quantity} = ${formatNpr(item.subtotal)}`,
    )
    .join('\n');

  const text = `
Dear ${customerName},

Thank you for your order! Your order ${orderNumber} has been received.

Order Details:
- Order Number: ${orderNumber}
- Date: ${dateStr}
- Payment Method: ${paymentLabel} (${statusBadgeText})

Items:
${textItems}

Summary:
- Subtotal: ${formatNpr(subtotal)}
- Shipping Fee: ${formatNpr(shippingFee)}${
    Number(discountAmount) > 0 ? `\n- Discount: -${formatNpr(discountAmount)}` : ''
  }
- Grand Total: ${formatNpr(totalAmount)}

Shipping To:
${shippingAddress.fullName}
${shippingAddress.phone}
${shippingAddress.streetAddress}, ${shippingAddress.cityArea}
${shippingAddress.district}, ${shippingAddress.province}${
    shippingAddress.landmark ? `\nLandmark: ${shippingAddress.landmark}` : ''
  }

Track your order at: ${orderUrl}

Thank you for shopping with Celebs!
`.trim();

  // Item rows HTML
  const itemsHtml = items
    .map(
      (item) => `
    <tr style="border-bottom: 1px solid #F1F5F9;">
      <td style="padding: 12px 8px; vertical-align: top;">
        <div style="font-weight: 600; color: #0F172A; font-size: 14px;">${item.productName}</div>
        <div style="font-size: 12px; color: #64748B; margin-top: 2px;">
          ${item.colorVariantName} &bull; Size: ${item.size}
        </div>
      </td>
      <td style="padding: 12px 8px; vertical-align: top; text-align: center; color: #334155; font-size: 13px;">
        ${item.quantity}
      </td>
      <td style="padding: 12px 8px; vertical-align: top; text-align: right; font-weight: 500; color: #0F172A; font-size: 13px;">
        ${formatNpr(item.subtotal)}
      </td>
    </tr>
  `,
    )
    .join('');

  const discountRowHtml =
    Number(discountAmount) > 0
      ? `
    <tr>
      <td colspan="2" style="padding: 6px 8px; text-align: right; color: #16A34A; font-size: 13px;">Discount:</td>
      <td style="padding: 6px 8px; text-align: right; color: #16A34A; font-weight: 500; font-size: 13px;">-${formatNpr(discountAmount)}</td>
    </tr>
  `
      : '';

  const contentHtml = `
    <h1 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 700; color: #0F172A;">
      Order Confirmed
    </h1>
    <p style="margin: 0 0 20px 0; font-size: 14px; color: #64748B;">
      Hi <strong>${customerName}</strong>, thank you for your order. We are preparing it for delivery.
    </p>

    <!-- Order Metadata Card -->
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; margin-bottom: 24px;">
      <tr>
        <td style="padding: 16px;">
          <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding-bottom: 8px; font-size: 13px; color: #64748B;">Order Number:</td>
              <td style="padding-bottom: 8px; text-align: right; font-weight: 700; color: #0F172A; font-family: monospace; font-size: 14px;">
                ${orderNumber}
              </td>
            </tr>
            <tr>
              <td style="padding-bottom: 8px; font-size: 13px; color: #64748B;">Order Date:</td>
              <td style="padding-bottom: 8px; text-align: right; color: #0F172A; font-size: 13px;">
                ${dateStr}
              </td>
            </tr>
            <tr>
              <td style="font-size: 13px; color: #64748B;">Payment:</td>
              <td style="text-align: right; font-size: 13px;">
                <span style="color: #0F172A; font-weight: 500; margin-right: 6px;">${paymentLabel}</span>
                ${renderBadge(statusBadgeText, statusTone)}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Items Table -->
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
      <thead>
        <tr style="border-bottom: 2px solid #E2E8F0;">
          <th style="padding: 8px; text-align: left; font-size: 12px; font-weight: 600; color: #64748B; text-transform: uppercase;">Item</th>
          <th style="padding: 8px; text-align: center; font-size: 12px; font-weight: 600; color: #64748B; text-transform: uppercase;">Qty</th>
          <th style="padding: 8px; text-align: right; font-size: 12px; font-weight: 600; color: #64748B; text-transform: uppercase;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="2" style="padding: 12px 8px 6px 8px; text-align: right; color: #64748B; font-size: 13px;">Subtotal:</td>
          <td style="padding: 12px 8px 6px 8px; text-align: right; color: #0F172A; font-weight: 500; font-size: 13px;">${formatNpr(subtotal)}</td>
        </tr>
        <tr>
          <td colspan="2" style="padding: 6px 8px; text-align: right; color: #64748B; font-size: 13px;">Shipping:</td>
          <td style="padding: 6px 8px; text-align: right; color: #0F172A; font-weight: 500; font-size: 13px;">${Number(shippingFee) === 0 ? 'FREE' : formatNpr(shippingFee)}</td>
        </tr>
        ${discountRowHtml}
        <tr style="border-top: 1px solid #E2E8F0;">
          <td colspan="2" style="padding: 12px 8px; text-align: right; font-weight: 700; color: #0F172A; font-size: 15px;">Total:</td>
          <td style="padding: 12px 8px; text-align: right; font-weight: 700; color: #0F172A; font-size: 16px;">${formatNpr(totalAmount)}</td>
        </tr>
      </tfoot>
    </table>

    <!-- Shipping Address Summary -->
    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: #64748B; margin-bottom: 8px;">Delivery Address</div>
      <div style="font-weight: 600; color: #0F172A; font-size: 14px;">${shippingAddress.fullName} &bull; ${shippingAddress.phone}</div>
      <div style="font-size: 13px; color: #475569; margin-top: 4px;">
        ${shippingAddress.streetAddress}, ${shippingAddress.cityArea}<br />
        ${shippingAddress.district}, ${shippingAddress.province}${
          shippingAddress.landmark ? `<br />Landmark: ${shippingAddress.landmark}` : ''
        }
      </div>
    </div>

    <!-- CTA Button -->
    <div style="text-align: center;">
      ${renderButton('View Order Details', orderUrl)}
    </div>
  `;

  const subject = `Order Confirmed: ${orderNumber}`;
  const html = renderEmailLayout({
    title: subject,
    previewText: `Your order ${orderNumber} has been received. Total: ${formatNpr(totalAmount)}`,
    contentHtml,
  });

  return { subject, text, html };
}
