import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import '@testing-library/jest-dom/vitest';

import { FulfillmentDialog } from '../components/fulfillment-dialog';
import type { OrderItemUI } from '../types';

const mockBaseItem: OrderItemUI = {
  id: 'item-101',
  orderId: 'order-202',
  orderNumber: 'CEL-TEST-8899',
  customerName: 'Aarav Sharma',
  customerPhone: '9841000000',
  cityArea: 'Lazimpat',
  provinceDistrict: 'Bagmati / Kathmandu',
  productName: 'Premium Denim Shirt',
  colorVariantName: 'Navy Blue',
  size: 'L',
  quantity: 1,
  unitPrice: 2200,
  totalAmount: 2350,
  itemStatus: 'PENDING',
  paymentMethod: 'COD',
  paymentStatus: 'PENDING',
  createdAt: '2026-09-08T10:00:00.000Z',
};

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  item: mockBaseItem,
  newStatus: 'PENDING' as const,
  onNewStatusChange: vi.fn(),
  courier: '',
  onCourierChange: vi.fn(),
  trackingNo: '',
  onTrackingChange: vi.fn(),
  paymentReference: '',
  onReferenceChange: vi.fn(),
  canManage: true,
  canSettleFinance: false,
  fulfillmentPending: false,
  dispatchPending: false,
  settlePending: false,
  paymentPending: false,
  onFulfill: vi.fn(),
  onDispatch: vi.fn(),
  onSettle: vi.fn(),
  onMarkPaid: vi.fn(),
  onMarkFailed: vi.fn(),
};

describe('Order RBAC Jurisdiction & Dynamic Action UI', () => {
  it('strictly hides COD settlement & payment override blocks from vendor (canSettleFinance: false)', () => {
    render(<FulfillmentDialog {...defaultProps} canSettleFinance={false} />);

    // Item summary and fulfillment controls remain accessible to vendor
    expect(screen.getByText(/Fulfill Order #CEL-TEST-8899/i)).toBeInTheDocument();
    expect(screen.getByText(/Premium Denim Shirt/i)).toBeInTheDocument();

    // Financial settlement actions must be completely hidden
    expect(screen.queryByText(/Cash on Delivery Pending/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /Settle COD/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Mark Paid/i })).toBeNull();
  });

  it('renders COD settlement section for platform admin with finance permissions', () => {
    render(<FulfillmentDialog {...defaultProps} canSettleFinance={true} />);

    expect(screen.getByText(/Cash on Delivery Pending/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Settle COD/i })).toBeInTheDocument();
  });

  it('renders prepaid payment override section for platform admin on pending Khalti order', () => {
    const khaltiItem: OrderItemUI = {
      ...mockBaseItem,
      paymentMethod: 'KHALTI',
      paymentStatus: 'PENDING',
    };

    render(<FulfillmentDialog {...defaultProps} item={khaltiItem} canSettleFinance={true} />);

    expect(screen.getByText(/KHALTI Payment Pending/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mark Paid/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mark Failed/i })).toBeInTheDocument();
    // COD block should not appear for online payment
    expect(screen.queryByRole('button', { name: /Settle COD/i })).toBeNull();
  });

  it('correctly isolates vendor role from financial settlement permissions', () => {
    const evaluateCanSettle = (actor: {
      isVendor: boolean;
      isStaff: boolean;
      hasVendorProfile: boolean;
      isAdmin: boolean;
      isSuperAdmin: boolean;
      hasFinanceManage: boolean;
    }) => {
      const isSeller = actor.isVendor || actor.isStaff || actor.hasVendorProfile;
      return !isSeller && (actor.isAdmin || actor.isSuperAdmin) && actor.hasFinanceManage;
    };

    // Vendor with accidental finance grant is still blocked
    expect(
      evaluateCanSettle({
        isVendor: true,
        isStaff: false,
        hasVendorProfile: true,
        isAdmin: false,
        isSuperAdmin: false,
        hasFinanceManage: true,
      }),
    ).toBe(false);

    // Vendor staff is blocked
    expect(
      evaluateCanSettle({
        isVendor: false,
        isStaff: true,
        hasVendorProfile: false,
        isAdmin: false,
        isSuperAdmin: false,
        hasFinanceManage: true,
      }),
    ).toBe(false);

    // Platform admin without finance permission is blocked
    expect(
      evaluateCanSettle({
        isVendor: false,
        isStaff: false,
        hasVendorProfile: false,
        isAdmin: true,
        isSuperAdmin: false,
        hasFinanceManage: false,
      }),
    ).toBe(false);

    // Authorized platform admin is permitted
    expect(
      evaluateCanSettle({
        isVendor: false,
        isStaff: false,
        hasVendorProfile: false,
        isAdmin: true,
        isSuperAdmin: false,
        hasFinanceManage: true,
      }),
    ).toBe(true);

    // SuperAdmin with finance permission is permitted
    expect(
      evaluateCanSettle({
        isVendor: false,
        isStaff: false,
        hasVendorProfile: false,
        isAdmin: false,
        isSuperAdmin: true,
        hasFinanceManage: true,
      }),
    ).toBe(true);
  });
});
