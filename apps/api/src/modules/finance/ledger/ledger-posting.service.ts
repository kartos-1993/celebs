import { LedgerDirection, LedgerEntryType } from '@prisma/client';

import { isAboveZero } from './decimal';
import { LedgerService, ledgerService } from './ledger.service';

import { Prisma } from '@/config/db.prisma';
import prisma from '@/config/db.prisma';

/**
 * Turns the things that happen to an order into ledger entries.
 *
 * Kept separate from the services that cause those things: checkout, dispatch and
 * settlement each know about their own domain, and none of them should have to
 * know what a ledger entry looks like. They call in here, this reads the order,
 * and the money is recorded.
 *
 * Every function here is safe to call more than once. They are called from paths
 * that are retried - a checkout replayed by a customer, a settlement submitted
 * twice, a courier resending a webhook - and a ledger that double-counts under a
 * retry is worse than no ledger at all.
 */

export interface PostingOrder {
  id: string;
  subtotal: Prisma.Decimal;
  shippingFee: Prisma.Decimal;
  absorbedShippingCost: Prisma.Decimal | null;
}

/**
 * Records what an order was worth the moment it was placed.
 *
 * Only three things are decided here and nowhere else: what the goods sold for,
 * what the customer was charged for delivery, and what delivery cost us anyway
 * when a threshold was met. Each is recorded only when it is a real movement -
 * a free order, or free delivery that cost nothing, produces nothing rather than
 * a zero-valued line that looks like a transaction.
 *
 * Cash on delivery is deliberately absent. The courier is holding that money on
 * our behalf, not holding it for us, so it is recorded when it is remitted.
 * Counting it here as well would count the same rupees twice and make every
 * margin figure wrong.
 */
export async function postOrderPlacementEntries(
  input: { orderId: string },
  ledger: LedgerService = ledgerService,
): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    select: { id: true, subtotal: true, shippingFee: true, absorbedShippingCost: true },
  });

  if (!order) return;

  const subtotal = order.subtotal;
  const shippingFee = order.shippingFee;
  const absorbed = order.absorbedShippingCost ?? new Prisma.Decimal(0);

  if (isAboveZero(subtotal)) {
    await ledger.post({
      type: LedgerEntryType.ORDER_REVENUE,
      direction: LedgerDirection.IN,
      amount: subtotal,
      sourceType: 'ORDER',
      sourceId: order.id,
      orderId: order.id,
      memo: 'Goods sold',
    });
  }

  if (isAboveZero(shippingFee)) {
    await ledger.post({
      type: LedgerEntryType.DELIVERY_CHARGED,
      direction: LedgerDirection.IN,
      amount: shippingFee,
      sourceType: 'ORDER',
      sourceId: order.id,
      orderId: order.id,
      memo: 'Delivery charged to customer',
    });
  }

  if (isAboveZero(absorbed)) {
    await ledger.post({
      type: LedgerEntryType.FREE_DELIVERY_ABSORBED,
      direction: LedgerDirection.OUT,
      amount: absorbed,
      sourceType: 'ORDER',
      sourceId: order.id,
      orderId: order.id,
      memo: 'Free-delivery threshold absorbed',
    });
  }
}

/**
 * Records what a courier charged to carry one parcel.
 *
 * Keyed on the consignment rather than the order, because a parcel can be
 * dispatched, returned and dispatched again, and each of those is a separate fee
 * against the same order.
 */
export async function postCourierFeeEntries(
  input: { orderId: string; courier: string; consignmentId: string; amount: Prisma.Decimal },
  ledger: LedgerService = ledgerService,
): Promise<void> {
  if (!isAboveZero(input.amount)) return;

  await ledger.post({
    type: LedgerEntryType.COURIER_DELIVERY_FEE,
    direction: LedgerDirection.OUT,
    amount: input.amount,
    courier: input.courier,
    sourceType: 'CONSIGNMENT',
    sourceId: input.consignmentId,
    orderId: input.orderId,
    memo: `Delivery charge from ${input.courier}`,
  });
}

/**
 * Records cash a courier actually handed over.
 *
 * Distinct from the sale: this is the money arriving, and it is the event a
 * settlement is reconciled against. Keyed on the settlement reference so the same
 * deposit cannot be counted twice under two batch entries.
 */
export async function postCodReceiptEntries(
  input: { orderId: string; courier?: string; amount: Prisma.Decimal; settlementReference: string },
  ledger: LedgerService = ledgerService,
): Promise<void> {
  if (!isAboveZero(input.amount)) return;

  await ledger.post({
    type: LedgerEntryType.COD_RECEIVED,
    direction: LedgerDirection.IN,
    amount: input.amount,
    courier: input.courier,
    sourceType: 'COD_SETTLEMENT',
    sourceId: input.settlementReference,
    orderId: input.orderId,
    memo: `Cash collected and remitted by courier (ref ${input.settlementReference})`,
  });
}

/**
 * Records money returned to a customer.
 *
 * Keyed on the refund rather than the order, because one order can legitimately
 * be refunded more than once - a partial refund that fails and is retried, or two
 * separate refunds. Keying on the order would silently drop the second one.
 */
export async function postRefundEntries(
  input: { refundId: string; orderId: string; amount: Prisma.Decimal; gateway: string },
  ledger: LedgerService = ledgerService,
): Promise<void> {
  if (!isAboveZero(input.amount)) return;

  await ledger.post({
    type: LedgerEntryType.REFUND,
    direction: LedgerDirection.OUT,
    amount: input.amount,
    sourceType: 'REFUND',
    sourceId: input.refundId,
    orderId: input.orderId,
    memo: `Refunded to customer via ${input.gateway}`,
  });
}
