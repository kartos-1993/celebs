import { describe, expect, it } from 'vitest';

import {
  orderConfirmationTemplate,
  productRejectionEmailTemplate,
  vendorApprovalTemplate,
  vendorRejectionTemplate,
  verifyEmailTemplate,
} from '../templates';

describe('Transactional Email Templates', () => {
  describe('orderConfirmationTemplate', () => {
    const mockOrderParams = {
      orderNumber: 'CEL-260909-A1B2C3',
      customerName: 'Aarav Sharma',
      orderDate: new Date('2026-09-09T12:00:00Z'),
      paymentMethod: 'COD',
      paymentStatus: 'PENDING',
      orderStatus: 'CONFIRMED',
      items: [
        {
          productName: 'Oversized Streetwear Tee',
          colorVariantName: 'Vintage Black',
          size: 'L',
          quantity: 2,
          unitPrice: '1500',
          subtotal: '3000',
        },
        {
          productName: 'Classic Cargo Pants',
          colorVariantName: 'Olive Green',
          size: '32',
          quantity: 1,
          unitPrice: '2500',
          subtotal: '2500',
        },
      ],
      subtotal: '5500',
      shippingFee: '0',
      discountAmount: '500',
      totalAmount: '5000',
      shippingAddress: {
        fullName: 'Aarav Sharma',
        phone: '9841000000',
        streetAddress: 'Jhamsikhel Rd, Ward 3',
        cityArea: 'Sanepa',
        district: 'Lalitpur',
        province: 'Bagmati Province',
        landmark: 'Opposite Big Mart',
      },
    };

    it('generates standard, professional subject and preview headers', () => {
      const result = orderConfirmationTemplate(mockOrderParams);

      expect(result.subject).toBe('Order Confirmed: CEL-260909-A1B2C3');
      expect(result.html).toContain('CEL-260909-A1B2C3');
      expect(result.html).toContain('Aarav Sharma');
    });

    it('formats Nepal currency (NPR) with standard precision in HTML and plaintext', () => {
      const result = orderConfirmationTemplate(mockOrderParams);

      expect(result.html).toContain('NPR');
      expect(result.text).toContain('NPR');
      expect(result.text).toContain('Grand Total: NPR 5,000.00');
      expect(result.text).toContain('Discount: -NPR 500.00');
    });

    it('renders all itemized products with color variant and size details', () => {
      const result = orderConfirmationTemplate(mockOrderParams);

      expect(result.html).toContain('Oversized Streetwear Tee');
      expect(result.html).toContain('Vintage Black');
      expect(result.html).toContain('Size: L');
      expect(result.html).toContain('Classic Cargo Pants');
      expect(result.html).toContain('Olive Green');

      expect(result.text).toContain('Oversized Streetwear Tee (Vintage Black, Size L) x 2');
      expect(result.text).toContain('Classic Cargo Pants (Olive Green, Size 32) x 1');
    });

    it('displays complete delivery address and landmark', () => {
      const result = orderConfirmationTemplate(mockOrderParams);

      expect(result.html).toContain('Jhamsikhel Rd, Ward 3');
      expect(result.html).toContain('Sanepa');
      expect(result.html).toContain('Lalitpur, Bagmati Province');
      expect(result.html).toContain('Landmark: Opposite Big Mart');
      expect(result.text).toContain('Jhamsikhel Rd, Ward 3, Sanepa');
    });

    it('correctly adapts payment badge for online payments (eSewa / Khalti)', () => {
      const onlinePaidParams = {
        ...mockOrderParams,
        paymentMethod: 'ESEWA',
        paymentStatus: 'COMPLETED',
      };

      const result = orderConfirmationTemplate(onlinePaidParams);

      expect(result.html).toContain('eSewa');
      expect(result.html).toContain('Paid');
      expect(result.text).toContain('Payment Method: eSewa (Paid)');
    });
  });

  describe('verifyEmailTemplate', () => {
    it('renders clean activation link and action button', () => {
      const result = verifyEmailTemplate('https://celebs.com.np/verify?token=xyz123', 'Celebs');

      expect(result.subject).toBe('Activate your Celebs account');
      expect(result.html).toContain('Activate Account');
      expect(result.html).toContain('https://celebs.com.np/verify?token=xyz123');
      expect(result.text).toContain('https://celebs.com.np/verify?token=xyz123');
    });
  });

  describe('vendorApprovalTemplate & vendorRejectionTemplate', () => {
    it('renders vendor approval email with seller portal link', () => {
      const result = vendorApprovalTemplate('Urban Styles');

      expect(result.subject).toContain('Your Vendor Application is Approved');
      expect(result.html).toContain('Urban Styles');
      expect(result.html).toContain('Go to Seller Portal');
      expect(result.text).toContain('Urban Styles');
    });

    it('renders vendor rejection email with moderation note', () => {
      const result = vendorRejectionTemplate('Urban Styles', 'PAN document illegible');

      expect(result.subject).toContain('Update on Your Vendor Application Status');
      expect(result.html).toContain('PAN document illegible');
      expect(result.html).toContain('Update Application & Resubmit');
      expect(result.text).toContain('PAN document illegible');
    });
  });

  describe('productRejectionEmailTemplate', () => {
    it('renders structured quality control feedback and flagged fields', () => {
      const result = productRejectionEmailTemplate({
        productName: 'Silk Party Dress',
        rejectionReason: 'Image resolution below minimum 1000x1000px requirement.',
        category: 'Women Fashion',
        flaggedFields: ['productImages', 'sizeChart'],
      });

      expect(result.subject).toContain('Silk Party Dress');
      expect(result.html).toContain('Image resolution below minimum 1000x1000px requirement');
      expect(result.html).toContain('productImages');
      expect(result.html).toContain('sizeChart');
      expect(result.text).toContain('Women Fashion');
    });
  });
});
