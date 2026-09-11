import { describe, expect, it } from 'vitest';

import { orderCancelledTemplate, orderDeliveredTemplate, orderShippedTemplate } from '../templates';

describe('Order Lifecycle Email Templates', () => {
  const baseItems = [
    {
      productName: 'Oversized Streetwear Tee',
      colorVariantName: 'Vintage Black',
      size: 'L',
      quantity: 2,
    },
  ];

  describe('orderShippedTemplate', () => {
    it('renders courier name, waybill number, items, and tracking link', () => {
      const email = orderShippedTemplate({
        orderNumber: 'CEL-2026-999',
        customerName: 'Aarav Sharma',
        courierName: 'Nepal Can Move',
        trackingNumber: 'NCM-882341',
        items: baseItems,
        shippingAddress: {
          fullName: 'Aarav Sharma',
          streetAddress: 'Jhamsikhel Rd',
          cityArea: 'Lalitpur',
          district: 'Lalitpur',
        },
      });

      expect(email.subject).toContain('CEL-2026-999');
      expect(email.html).toContain('Nepal Can Move');
      expect(email.html).toContain('NCM-882341');
      expect(email.html).toContain('Oversized Streetwear Tee');
      expect(email.text).toContain('Nepal Can Move');
      expect(email.text).toContain('NCM-882341');
    });
  });

  describe('orderDeliveredTemplate', () => {
    it('renders delivery confirmation and review your purchase CTA', () => {
      const email = orderDeliveredTemplate({
        orderNumber: 'CEL-2026-999',
        customerName: 'Aarav Sharma',
        deliveryDate: new Date('2026-09-11T12:00:00Z'),
        items: baseItems,
      });

      expect(email.subject).toContain('delivered');
      expect(email.html).toContain('Review Your Purchase');
      expect(email.html).toContain('CEL-2026-999');
      expect(email.text).toContain('Leave a Review');
    });
  });

  describe('orderCancelledTemplate', () => {
    it('renders cancellation details with refund note for online payments', () => {
      const onlineEmail = orderCancelledTemplate({
        orderNumber: 'CEL-2026-999',
        customerName: 'Aarav Sharma',
        paymentMethod: 'KHALTI',
        totalAmount: 3500,
        items: baseItems,
        reason: 'Customer requested cancellation',
      });

      expect(onlineEmail.subject).toContain('Cancellation');
      expect(onlineEmail.html).toContain('refund');
      expect(onlineEmail.html).toContain('KHALTI');
      expect(onlineEmail.html).toContain('Customer requested cancellation');

      const codEmail = orderCancelledTemplate({
        orderNumber: 'CEL-2026-999',
        customerName: 'Aarav Sharma',
        paymentMethod: 'COD',
        totalAmount: 3500,
        items: baseItems,
      });

      expect(codEmail.html).toContain('Cash on Delivery');
      expect(codEmail.html).toContain('no payment was charged');
    });
  });
});
