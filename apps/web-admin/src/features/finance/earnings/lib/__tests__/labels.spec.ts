import { describe, expect, it } from 'vitest';

import type { EarningsEntry } from '../../api';
import { entryDirectionLabel, entryLabel, formatEntryDate } from '../labels';

describe('Financial Accounting Entry Labels', () => {
  it('formats credit and debit direction into standardized accounting text', () => {
    const creditEntry: EarningsEntry = {
      id: 'e1',
      occurredAt: '2026-10-27T10:00:00Z',
      type: 'ORDER_REVENUE',
      amount: '1200.00',
      currency: 'NPR',
      courier: null,
      orderId: 'o1',
      vendorId: 'v1',
      direction: 'IN',
      memo: 'Sale',
    };
    const debitEntry: EarningsEntry = {
      id: 'e2',
      occurredAt: '2026-10-27T10:00:00Z',
      type: 'COMMISSION',
      amount: '120.00',
      currency: 'NPR',
      courier: null,
      orderId: 'o1',
      vendorId: 'v1',
      direction: 'OUT',
      memo: 'Commission fee',
    };

    expect(entryDirectionLabel(creditEntry)).toBe('Credit (+)');
    expect(entryDirectionLabel(debitEntry)).toBe('Debit (-)');
  });

  it('translates ledger entry types into standard e-commerce statements', () => {
    const makeEntry = (type: string): EarningsEntry => ({
      id: 'e',
      occurredAt: '2026-10-27T10:00:00Z',
      type,
      amount: '100.00',
      currency: 'NPR',
      courier: null,
      orderId: 'o',
      vendorId: 'v',
      direction: 'IN',
      memo: null,
    });

    expect(entryLabel(makeEntry('ORDER_REVENUE'))).toBe('Item Sales Revenue');
    expect(entryLabel(makeEntry('COMMISSION'))).toBe('Marketplace Commission Fee');
    expect(entryLabel(makeEntry('COURIER_DELIVERY_FEE'))).toBe('Courier Delivery Fee');
    expect(entryLabel(makeEntry('FREE_DELIVERY_ABSORBED'))).toBe('Subsidized Delivery');
    expect(entryLabel(makeEntry('REFUND'))).toBe('Refund Deduction');
    expect(entryLabel(makeEntry('DELIVERY_CHARGED'))).toBe('Shipping Paid by Customer');
    expect(entryLabel(makeEntry('COD_RECEIVED'))).toBe('COD Remittance Received');
    expect(entryLabel(makeEntry('COURIER_PAYMENT'))).toBe('Courier Remittance Settlement');
  });

  it('formats entry dates accurately', () => {
    const formatted = formatEntryDate('2026-10-27T10:00:00Z');
    expect(formatted).toMatch(/27/);
    expect(formatted).toMatch(/2026/);
  });
});
