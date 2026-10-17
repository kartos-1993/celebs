import { allocateCollection, type CollectionPart } from './cod-allocation';
import { courierWholeRupees } from './courier-amount';
import { money, zeroMoney } from './money';

import { Prisma } from '@/config/db.prisma';

const ZERO = new Prisma.Decimal(0);

/**
 * Order details required to plan split consignments.
 *
 * All monetary amounts are strict Prisma.Decimals.
 */
export interface OrderForSplitDispatch {
  orderId: string;
  subtotal: Prisma.Decimal;
  shippingFee: Prisma.Decimal;
  courierFee: Prisma.Decimal;
  codHandlingFee: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
  isCOD: boolean;
}

/**
 * A seller's parcel within the order, already grouped and quoted.
 */
export interface SellerParcelForSplitDispatch {
  vendorId: string;
  goodsAmount: Prisma.Decimal;
  courierFee: Prisma.Decimal;
  declaredWeightKg: Prisma.Decimal;
  lineIds: string[];
}

/**
 * A planned consignment ready for booking with the courier.
 *
 * Each consignment represents one pickup from our central fulfillment point
 * containing goods for one seller, with its own courier fee and collectible
 * share.
 */
export interface PlannedConsignment {
  vendorId: string;
  goodsAmount: Prisma.Decimal;
  courierFee: Prisma.Decimal;
  customerDeliveryChargeShare: Prisma.Decimal;
  amountToCollect: Prisma.Decimal;
  codAmount: number;
  declaredWeightKg: Prisma.Decimal;
  lineIds: string[];
}

/**
 * Splits an order into discrete, reconcilable seller consignments.
 *
 * In multi-vendor commerce, an order may contain items from several sellers.
 * While checkout presents a single unified basket to the customer, delivery is
 * quoted and collected per seller parcel.
 *
 * Economic rules:
 * 1. Delivery Charge Allocation:
 *    - If the customer received free delivery (order.shippingFee is 0), then every
 *      parcel's customerDeliveryChargeShare is zero. The courier's fee still exists
 *      and is recorded on the consignment as courierFee (absorbed by the platform).
 *    - If delivery was charged, the customer's delivery charge is distributed
 *      proportionally to each parcel's quoted courier fee. Since checkout computes
 *      the total charge as the sum of quoted fees, each parcel's delivery share
 *      normally equals its own quoted courier fee.
 *
 * 2. Cash on Delivery (COD) Collectible Allocation:
 *    - For prepaid orders (credit card, wallet, online banking), the customer has
 *      already paid. Therefore, amountToCollect is 0.00 and codAmount is 0 for
 *      every consignment.
 *    - For COD orders, each parcel's weight is its economic base:
 *      weight = goodsAmount + customerDeliveryChargeShare.
 *    - The total amount to collect (order.totalAmount) is distributed across parcels
 *      using allocateCollection(). This algorithm floors each share to whole paisas
 *      and distributes remainder paisas by largest remainder, with deterministic
 *      tie-breaking by vendorId.
 *    - This guarantees that sum(consignment.amountToCollect) === order.totalAmount
 *      to the exact paisa, eliminating any shortfall against the customer.
 *
 * 3. Courier Wire Format:
 *    - Pathao and other couriers reject decimal collectible amounts on their API
 *      (e.g., Pathao accepts only integer rupees).
 *    - codAmount is converted to whole rupees using courierWholeRupees(), which
 *      floors the value so the customer is never asked for more than they owe.
 *
 * 4. Deterministic Ordering:
 *    - Parcels are sorted alphabetically by vendorId to ensure consistent
 *      consignment booking order regardless of line retrieval order.
 */
export function splitOrderIntoConsignments(input: {
  order: OrderForSplitDispatch;
  parcels: readonly SellerParcelForSplitDispatch[];
}): PlannedConsignment[] {
  const { order, parcels } = input;

  if (parcels.length === 0) {
    return [];
  }

  // Sort deterministically by vendorId
  const sortedParcels = [...parcels].sort((a, b) => a.vendorId.localeCompare(b.vendorId));

  // 1. Calculate the delivery charge share for each parcel.
  // When delivery is free, the customer pays 0 delivery fee, so customerDeliveryChargeShare is 0.
  // Otherwise, the customer's delivery fee is divided proportionally to courier fees.
  const totalCourierFee = sortedParcels.reduce((acc, p) => acc.add(p.courierFee), ZERO);

  const deliveryShares: Prisma.Decimal[] = sortedParcels.map((parcel) => {
    if (order.shippingFee.isZero() || totalCourierFee.isZero()) {
      return zeroMoney();
    }
    // Proportional to quoted courier fee: shippingFee * (parcel.courierFee / totalCourierFee)
    const exactShare = order.shippingFee.mul(parcel.courierFee).div(totalCourierFee);
    return money(exactShare);
  });

  // 2. Compute collectible amounts across parcels.
  let allocatedAmounts: Map<string, Prisma.Decimal>;

  if (!order.isCOD || order.totalAmount.isZero() || order.totalAmount.isNegative()) {
    // Prepaid orders: no cash to collect on delivery
    allocatedAmounts = new Map();
    for (const parcel of sortedParcels) {
      allocatedAmounts.set(parcel.vendorId, zeroMoney());
    }
  } else {
    // COD orders: divide order.totalAmount proportionally by (goods + delivery share)
    const collectionParts: CollectionPart[] = sortedParcels.map((parcel, index) => {
      const deliveryShare = deliveryShares[index] ?? ZERO;
      const parcelWeight = parcel.goodsAmount.add(deliveryShare);
      return {
        key: parcel.vendorId,
        weight: parcelWeight,
      };
    });

    allocatedAmounts = allocateCollection({
      total: order.totalAmount,
      parts: collectionParts,
    });
  }

  // 3. Assemble the planned consignments
  return sortedParcels.map((parcel, index) => {
    const deliveryShare = deliveryShares[index] ?? zeroMoney();
    const amountToCollect = allocatedAmounts.get(parcel.vendorId) ?? zeroMoney();
    const codRupees = order.isCOD ? courierWholeRupees(amountToCollect) : 0;

    return {
      vendorId: parcel.vendorId,
      goodsAmount: parcel.goodsAmount,
      courierFee: parcel.courierFee,
      customerDeliveryChargeShare: deliveryShare,
      amountToCollect,
      codAmount: codRupees,
      declaredWeightKg: parcel.declaredWeightKg,
      lineIds: parcel.lineIds,
    };
  });
}
