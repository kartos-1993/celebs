import { LedgerDirection, LedgerEntryType } from '@prisma/client';

import { commissionReversals } from '../commission/commission-calculator';

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
/**
 * Records the platform's cut, one entry per seller.
 *
 * Per order line rather than per order, because a basket can hold items from
 * several sellers. ORDER_REVENUE is posted once for the whole subtotal, so if
 * commission were posted that way too, a seller who earned 600 on a 1,800/600
 * basket would be charged commission on all 2,400 - and a seller reading their
 * ledger would be shown another seller's goods.
 *
 * Its own entry type, not a reduction of revenue. A seller needs to see what was
 * taken as a separate line; folding it into revenue leaves a net they cannot
 * account for, which is exactly the distrust this is meant to remove.
 *
 * Read from the order lines rather than recomputed from the rate. The rate is
 * frozen on the line, so an order placed before a rate change keeps the rate it
 * was charged even if this runs weeks later during a retry.
 *
 * A line with no commission produces nothing: a zero-valued entry would read like
 * a movement that happened.
 */
export async function postOrderCommissionEntries(
  input: { orderId: string },
  ledger: LedgerService = ledgerService,
): Promise<void> {
  const lines = await prisma.orderItem.findMany({
    where: { orderId: input.orderId },
    select: { id: true, vendorId: true, commissionAmount: true },
  });

  for (const line of lines) {
    if (!isAboveZero(line.commissionAmount)) continue;

    await ledger.post({
      type: LedgerEntryType.COMMISSION,
      direction: LedgerDirection.OUT,
      amount: line.commissionAmount,
      vendorId: line.vendorId,
      sourceType: 'ORDER_ITEM',
      sourceId: line.id,
      orderId: input.orderId,
      memo: 'Platform commission',
    });
  }
}

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
  input: {
    orderId: string;
    courier?: string;
    amount: Prisma.Decimal;
    settlementReference: string;
    /** The seller this money belongs to in split dispatch. Null on legacy order-level entries. */
    vendorId?: string;
  },
  ledger: LedgerService = ledgerService,
  tx?: Prisma.TransactionClient,
): Promise<void> {
  if (!isAboveZero(input.amount)) return;

  await ledger.post(
    {
      type: LedgerEntryType.COD_RECEIVED,
      direction: LedgerDirection.IN,
      amount: input.amount,
      courier: input.courier,
      vendorId: input.vendorId,
      sourceType: 'COD_SETTLEMENT',
      sourceId: input.settlementReference,
      orderId: input.orderId,
      memo: `Cash collected and remitted by courier (ref ${input.settlementReference})`,
    },
    tx,
  );
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

  await postCommissionReversalEntries({
    refundId: input.refundId,
    orderId: input.orderId,
    amount: input.amount,
  });
}

/**
 * Hands back the commission on a refunded order.
 *
 * A refunded order gives the seller neither money nor product, so keeping the
 * commission would mean banking a cut of a sale that never completed. A seller
 * reading their earnings would see commission taken against an order they were
 * never paid for, which is the distrust this whole feature exists to remove.
 *
 * Posted as an IN entry so the seller's net returns to zero by arithmetic rather
 * than by editing history. Keyed on the refund and the line, so a retried refund
 * cannot hand the same commission back twice.
 *
 * Proportional for a partial refund and capped at what was taken - see
 * commissionReversals.
 */
export async function postCommissionReversalEntries(
  input: { refundId: string; orderId: string; amount: Prisma.Decimal },
  ledger: LedgerService = ledgerService,
): Promise<void> {
  if (!isAboveZero(input.amount)) return;

  const lines = await prisma.orderItem.findMany({
    where: { orderId: input.orderId },
    select: { id: true, vendorId: true, subtotal: true, commissionAmount: true },
  });

  const reversals = commissionReversals(
    lines.map((l) => ({
      lineId: l.id,
      vendorId: l.vendorId,
      subtotal: l.subtotal,
      commissionAmount: l.commissionAmount,
    })),
    input.amount,
  );

  for (const reversal of reversals) {
    if (!isAboveZero(reversal.amount)) continue;

    await ledger.post({
      type: LedgerEntryType.COMMISSION,
      direction: LedgerDirection.IN,
      amount: reversal.amount,
      vendorId: reversal.vendorId,
      sourceType: 'REFUND',
      sourceId: `${input.refundId}:${reversal.lineId}`,
      orderId: input.orderId,
      memo: 'Commission returned on refund',
    });
  }
}
