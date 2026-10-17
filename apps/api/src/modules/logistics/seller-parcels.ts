import { COURIER_MAX_PARCEL_KG } from './adapters/pathao-price.client';

import { Prisma } from '@/config/db.prisma';

/**
 * Turns an order into the parcels a courier will actually collect.
 *
 * Pathao prices per consignment, and a consignment comes from one pickup point.
 * So a basket holding three sellers' goods is three parcels and three fees - and
 * charging one fee for it is the loss this whole exercise exists to stop: the
 * parcel still gets collected from every seller and every pickup is billed.
 *
 * Lines from the *same* seller merge into one parcel, because that is one pickup.
 * A customer buying three of a seller's shirts pays one delivery, not three, and
 * the weight that matters is the sum - which is also what moves the price up a
 * band.
 *
 * Sorted by seller rather than left in first-appearance order, so the same basket
 * produces the same parcel list whatever order its lines arrive in. A quote that
 * reshuffles between two identical cart loads cannot be compared, and a customer
 * who sees the delivery charge move on a refresh stops trusting it.
 */

export interface OrderLineForParcel {
  lineId: string;
  vendorId: string;
  quantity: number;
  /**
   * The line's total *declared* weight, not per unit.
   *
   * Declared, not billable: the courier prices on the weight the seller states
   * and has no volumetric input at all, so feeding it a volumetric maximum would
   * charge the seller more for packing than the courier ever asked.
   */
  declaredWeightKg: Prisma.Decimal;
  unitPrice: Prisma.Decimal;
}

export interface SellerParcel {
  vendorId: string;
  declaredWeightKg: Prisma.Decimal;
  /** Everything this seller is being paid for, before commission. */
  goodsAmount: Prisma.Decimal;
  lineIds: string[];
  lineCount: number;
  totalQuantity: number;
}

const ZERO = new Prisma.Decimal(0);

export function sellerParcelsFromLines(lines: readonly OrderLineForParcel[]): SellerParcel[] {
  const byVendor = new Map<string, SellerParcel>();

  for (const line of lines) {
    const existing = byVendor.get(line.vendorId);

    if (!existing) {
      byVendor.set(line.vendorId, {
        vendorId: line.vendorId,
        declaredWeightKg: line.declaredWeightKg,
        goodsAmount: line.unitPrice.mul(line.quantity),
        lineIds: [line.lineId],
        lineCount: 1,
        totalQuantity: line.quantity,
      });
      continue;
    }

    existing.declaredWeightKg = existing.declaredWeightKg.plus(line.declaredWeightKg);
    existing.goodsAmount = existing.goodsAmount.plus(line.unitPrice.mul(line.quantity));
    existing.lineIds.push(line.lineId);
    existing.lineCount += 1;
    existing.totalQuantity += line.quantity;
  }

  return [...byVendor.values()].sort((a, b) => a.vendorId.localeCompare(b.vendorId));
}

/**
 * Applies the courier's physical limits to each parcel.
 *
 * A weight beyond the ceiling is refused here rather than at dispatch, where the
 * customer has already paid. Splitting the parcel instead would mean two fees
 * and a second tracking number the customer did not agree to, so it is an explicit
 * decision rather than an automatic one.
 */
export function mergeSellerParcels(
  parcels: ReadonlyArray<{
    vendorId: string;
    declaredWeightKg: Prisma.Decimal;
    goodsAmount: Prisma.Decimal;
  }>,
): SellerParcel[] {
  return parcels.map((parcel) => {
    if (parcel.declaredWeightKg.lte(ZERO)) {
      throw new RangeError(
        `Parcel for seller ${parcel.vendorId} weighs ${parcel.declaredWeightKg.toString()} kg, which cannot be shipped`,
      );
    }

    if (parcel.declaredWeightKg.gt(COURIER_MAX_PARCEL_KG)) {
      throw new RangeError(
        `Parcel for seller ${parcel.vendorId} weighs ${parcel.declaredWeightKg.toFixed(2)} kg; the courier accepts up to ${COURIER_MAX_PARCEL_KG.toString()} kg. Split it into more than one parcel.`,
      );
    }

    return { ...parcel, lineIds: [], lineCount: 0, totalQuantity: 0 };
  });
}
