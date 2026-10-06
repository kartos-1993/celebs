import type { EarningsEntry } from '../api';

/**
 * How a ledger entry reads to a seller.
 *
 * Kept out of the table component so the .tsx file exports only components, and
 * so the same wording is used wherever an entry is described.
 */

const TYPE_LABEL: Record<string, string> = {
  ORDER_REVENUE: 'Sale revenue',
  COMMISSION: 'Platform commission',
  COURIER_DELIVERY_FEE: 'Delivery charge',
  FREE_DELIVERY_ABSORBED: 'Free delivery absorbed',
  REFUND: 'Refund',
  DELIVERY_CHARGED: 'Delivery charged to customer',
  COD_RECEIVED: 'Cash collected',
  COURIER_PAYMENT: 'Courier settlement',
};

export function entryLabel(entry: EarningsEntry): string {
  return TYPE_LABEL[entry.type] ?? entry.type;
}

export function entryDirectionLabel(entry: EarningsEntry): string {
  return entry.direction === 'IN' ? 'Received' : 'Taken';
}

export function formatEntryDate(occurredAt: string): string {
  return new Date(occurredAt).toLocaleDateString('en-NP', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
