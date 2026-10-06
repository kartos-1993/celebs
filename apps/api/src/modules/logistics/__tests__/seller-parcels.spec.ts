import { describe, expect, it } from 'vitest';

import { mergeSellerParcels, sellerParcelsFromLines } from '../seller-parcels';

import { Prisma } from '@/config/db.prisma';

const dec = (value: string | number) => new Prisma.Decimal(value);

/**
 * One order, several sellers.
 *
 * Pathao prices per consignment and a consignment comes from one pickup point, so
 * a shared basket becomes several parcels - and several fees. Getting this wrong
 * in the direction of "one fee for the basket" is the loss that started all of
 * this: the parcel still gets collected from every seller, and every pickup is
 * charged.
 */
describe('sellerParcelsFromLines', () => {
  const line = (
    lineId: string,
    vendorId: string,
    quantity: number,
    billableWeightKg: string,
    unitPrice = '1000.00',
  ) => ({
    lineId,
    vendorId,
    quantity,
    // Already computed by the caller as the line's total, not per unit.
    billableWeightKg: dec(billableWeightKg),
    unitPrice: dec(unitPrice),
  });

  it('gives each seller their own parcel', () => {
    const parcels = sellerParcelsFromLines([
      line('l1', 'sellerA', 2, '0.9'),
      line('l2', 'sellerB', 1, '2.5'),
    ]);

    expect(parcels).toHaveLength(2);
    expect(parcels.map((p) => p.vendorId).sort()).toEqual(['sellerA', 'sellerB']);
  });

  it('merges several lines from one seller into a single parcel', () => {
    // One pickup, one parcel, one fee - regardless of how many lines went into it.
    const parcels = sellerParcelsFromLines([
      line('l1', 'sellerA', 1, '0.5'),
      line('l2', 'sellerA', 1, '0.7'),
      line('l3', 'sellerA', 1, '1.1'),
    ]);

    expect(parcels).toHaveLength(1);
    expect(parcels[0]?.weightKg.toFixed(3)).toBe('2.300');
    expect(parcels[0]?.lineIds).toEqual(['l1', 'l2', 'l3']);
  });

  it('keeps the total weight of a merged parcel, not the heaviest line', () => {
    const parcels = sellerParcelsFromLines([
      line('l1', 'sellerA', 1, '0.4'),
      line('l2', 'sellerA', 1, '0.6'),
    ]);

    expect(parcels[0]?.weightKg.toFixed(2)).toBe('1.00');
  });

  it("adds up a seller's goods for the COD split", () => {
    const parcels = sellerParcelsFromLines([
      line('l1', 'sellerA', 2, '0.9', '1800.50'),
      line('l2', 'sellerA', 1, '1.0', '600.25'),
    ]);

    expect(parcels[0]?.goodsAmount.toFixed(2)).toBe('4201.25');
  });

  it('returns nothing for an order with no lines', () => {
    expect(sellerParcelsFromLines([])).toEqual([]);
  });

  it('keeps sellers in a stable order, so a quote does not shuffle between loads', () => {
    const first = sellerParcelsFromLines([line('l1', 'zeta', 1, '1'), line('l2', 'alpha', 1, '1')]);
    const second = sellerParcelsFromLines([
      line('l2', 'alpha', 1, '1'),
      line('l1', 'zeta', 1, '1'),
    ]);

    expect(first.map((p) => p.vendorId)).toEqual(second.map((p) => p.vendorId));
  });
});

describe('mergeSellerParcels', () => {
  it('refuses to quote a parcel heavier than the courier accepts', () => {
    // The courier priced 250 kg rather than refusing; only create-order rejected it.
    // Quoting a fee for a parcel that will never ship is worse than refusing.
    expect(() =>
      mergeSellerParcels([{ vendorId: 'sellerA', weightKg: dec('250'), goodsAmount: dec('100') }]),
    ).toThrow(/200/);
  });

  it('accepts a parcel at the limit', () => {
    const parcels = mergeSellerParcels([
      { vendorId: 'sellerA', weightKg: dec('200'), goodsAmount: dec('100') },
    ]);

    expect(parcels[0]?.weightKg.toNumber()).toBe(200);
  });
});
