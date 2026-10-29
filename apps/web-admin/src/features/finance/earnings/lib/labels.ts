import type { EarningsEntry } from '../api';

/**
 * How a ledger entry reads to a seller.
 *
 * Kept out of the table component so the .tsx file exports only components, and
 * so the same wording is used wherever an entry is described.
 */

const TYPE_LABEL: Record<string, string> = {
  ORDER_REVENUE: 'Item Sales Revenue',
  COMMISSION: 'Marketplace Commission Fee',
  COURIER_DELIVERY_FEE: 'Courier Delivery Fee',
  FREE_DELIVERY_ABSORBED: 'Subsidized Delivery',
  REFUND: 'Refund Deduction',
  DELIVERY_CHARGED: 'Shipping Paid by Customer',
  COD_RECEIVED: 'COD Remittance Received',
  COURIER_PAYMENT: 'Courier Remittance Settlement',
};

export function entryLabel(entry: EarningsEntry): string {
  return TYPE_LABEL[entry.type] ?? entry.type;
}

export function entryDirectionLabel(entry: EarningsEntry): string {
  return entry.direction === 'IN' ? 'Credit (+)' : 'Debit (-)';
}

export function formatEntryDate(occurredAt: string): string {
  return new Date(occurredAt).toLocaleDateString('en-NP', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
