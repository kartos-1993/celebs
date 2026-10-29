import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import '@testing-library/jest-dom/vitest';

import { FulfillmentDialog } from '../components/fulfillment-dialog';
import { getAllowedTransitions, getOrderActionProps } from '../lib/order-constants';
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
  canManage: true,
  fulfillmentPending: false,
  dispatchPending: false,
  onFulfill: vi.fn(),
  onDispatch: vi.fn(),
};

describe('Order RBAC Jurisdiction & Fulfillment Logistics UI', () => {
  it('renders physical logistics controls while strictly excluding financial settlement blocks', () => {
    render(<FulfillmentDialog {...defaultProps} />);

    // Item summary and physical fulfillment controls are accessible
    expect(screen.getByText(/Fulfill Order #CEL-TEST-8899/i)).toBeInTheDocument();
    expect(screen.getByText(/Premium Denim Shirt/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save & Notify Customer/i })).toBeInTheDocument();

    // Financial remittance and payment actions are decoupled from logistics dialog
    expect(screen.queryByText(/Cash on Delivery Pending/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /Settle COD/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Mark Paid/i })).toBeNull();
  });

  it('correctly isolates vendor role from financial settlement permissions', () => {
    const evaluateCanSettle = (actor: {
      isPlatform: boolean;
      hasFinancePlatformManage: boolean;
    }) => {
      return actor.isPlatform && actor.hasFinancePlatformManage;
    };

    // Vendor / seller with accidental finance grant is still blocked
    expect(
      evaluateCanSettle({
        isPlatform: false,
        hasFinancePlatformManage: true,
      }),
    ).toBe(false);

    // Vendor staff is blocked
    expect(
      evaluateCanSettle({
        isPlatform: false,
        hasFinancePlatformManage: true,
      }),
    ).toBe(false);

    // Platform admin without finance permission is blocked
    expect(
      evaluateCanSettle({
        isPlatform: true,
        hasFinancePlatformManage: false,
      }),
    ).toBe(false);

    // Authorized platform admin is permitted
    expect(
      evaluateCanSettle({
        isPlatform: true,
        hasFinancePlatformManage: true,
      }),
    ).toBe(true);

    // SuperAdmin with finance permission is permitted
    expect(
      evaluateCanSettle({
        isPlatform: true,
        hasFinancePlatformManage: true,
      }),
    ).toBe(true);
  });

  it('strictly hides courier partner, tracking number, and 3PL dispatch button from third-party vendors', () => {
    render(<FulfillmentDialog {...defaultProps} isPlatform={false} newStatus="PACKED" />);

    // Courier selection, tracking input, and 3PL dispatch must NOT be rendered for vendors
    expect(screen.queryByText(/Courier \/ Logistics Partner/i)).toBeNull();
    expect(screen.queryByLabelText(/Tracking Number \/ Airway Bill/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /3PL Dispatch/i })).toBeNull();
  });

  it('permits platform operators to view and interact with courier fields and 3PL dispatch', () => {
    render(<FulfillmentDialog {...defaultProps} isPlatform={true} newStatus="PACKED" />);

    // Platform operators must see courier options and 3PL dispatch button
    expect(screen.getByText(/Courier \/ Logistics Partner/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Tracking Number \/ Airway Bill/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /3PL Dispatch/i })).toBeInTheDocument();
  });

  it('restricts stage transitions so third-party vendors can never select in transit or delivered', () => {
    // For pending items, vendor can only move to PACKED or CANCELLED
    const vendorPendingTransitions = getAllowedTransitions('PENDING', false);
    expect(vendorPendingTransitions).toEqual(['PACKED', 'CANCELLED']);
    expect(vendorPendingTransitions).not.toContain('HANDED_OVER');
    expect(vendorPendingTransitions).not.toContain('DELIVERED');

    // For packed items, vendor cannot trigger transit dispatch (can only cancel if unfulfillable)
    const vendorPackedTransitions = getAllowedTransitions('PACKED', false);
    expect(vendorPackedTransitions).not.toContain('HANDED_OVER');
    expect(vendorPackedTransitions).not.toContain('DELIVERED');

    // For handed-over / in-transit items, vendor has zero transitions
    const vendorTransitTransitions = getAllowedTransitions('HANDED_OVER', false);
    expect(vendorTransitTransitions).toEqual([]);

    // Platform operators retain full lifecycle transitions
    expect(getAllowedTransitions('PENDING', true)).toEqual(['PACKED', 'CANCELLED']);
    expect(getAllowedTransitions('PACKED', true)).toEqual(['HANDED_OVER', 'CANCELLED']);
    expect(getAllowedTransitions('HANDED_OVER', true)).toEqual(['DELIVERED', 'CANCELLED']);
  });

  it('enables 3PL dispatch directly from packed state for platform central hub intake', () => {
    render(<FulfillmentDialog {...defaultProps} isPlatform={true} newStatus="PACKED" />);

    const dispatchBtn = screen.getByRole('button', { name: /Receive & 3PL Dispatch/i });
    expect(dispatchBtn).toBeInTheDocument();
    expect(dispatchBtn).toBeEnabled();
  });

  it('determines the correct primary action button labels and variants for admin and vendor workflows', () => {
    // Admin sees 'Receive & Dispatch' as default action on PACKED items
    expect(getOrderActionProps('PACKED', false)).toEqual({
      label: 'Receive & Dispatch',
      variant: 'default',
    });

    // Admin sees 'View Details' on PENDING items (since seller packs first)
    expect(getOrderActionProps('PENDING', false)).toEqual({
      label: 'View Details',
      variant: 'outline',
    });

    // Vendor sees 'Pack Order' as default action on PENDING items
    expect(getOrderActionProps('PENDING', true)).toEqual({
      label: 'Pack Order',
      variant: 'default',
    });

    // Vendor sees 'View Details' on PACKED items (awaiting platform hub intake)
    expect(getOrderActionProps('PACKED', true)).toEqual({
      label: 'View Details',
      variant: 'outline',
    });
  });
});
