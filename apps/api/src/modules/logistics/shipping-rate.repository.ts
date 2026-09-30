import { Prisma } from '@/config/db.prisma';
import { prisma } from '@/config/db.prisma';

/**
 * Admin read/write for the delivery rate card and the per-city thresholds.
 *
 * Money and weight are returned as `Prisma.Decimal`. An admin types a price into
 * a text box, and that string has to reach the pricing resolver unchanged — a
 * number in between would quietly round the value they entered.
 */

export interface RateCityRow {
  id: string;
  name: string;
  province: string;
  isValley: boolean;
  freeDeliveryThreshold: number;
  isActive: boolean;
  source: string;
}

export interface RateRow {
  id: string;
  cityId: string | null;
  cityName: string | null;
  cityProvince: string | null;
  minWeightKg: Prisma.Decimal;
  maxWeightKg: Prisma.Decimal;
  fee: Prisma.Decimal;
  codFee: Prisma.Decimal;
  isActive: boolean;
}

export class ShippingRateRepository {
  /** Cities an admin can set a threshold on, valley cities first. */
  async listCities(): Promise<RateCityRow[]> {
    const rows = await prisma.logisticsCity.findMany({
      orderBy: [{ isValley: 'desc' }, { province: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        province: true,
        isValley: true,
        freeDeliveryThreshold: true,
        isActive: true,
        source: true,
      },
    });

    return rows;
  }

  async findCity(id: string) {
    return prisma.logisticsCity.findUnique({
      where: { id },
      select: { id: true, name: true, isActive: true, freeDeliveryThreshold: true },
    });
  }

  async updateCity(id: string, data: { freeDeliveryThreshold?: number; isActive?: boolean }) {
    return prisma.logisticsCity.update({
      where: { id },
      data,
      select: { id: true, name: true, freeDeliveryThreshold: true, isActive: true },
    });
  }

  /** Every band, including inactive ones so an admin can bring one back. */
  async listRates(): Promise<RateRow[]> {
    const rows = await prisma.shippingRate.findMany({
      orderBy: [{ cityId: 'asc' }, { minWeightKg: 'asc' }],
      select: {
        id: true,
        cityId: true,
        minWeightKg: true,
        maxWeightKg: true,
        fee: true,
        codFee: true,
        isActive: true,
        city: { select: { name: true, province: true } },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      cityId: row.cityId,
      cityName: row.city?.name ?? null,
      cityProvince: row.city?.province ?? null,
      minWeightKg: row.minWeightKg,
      maxWeightKg: row.maxWeightKg,
      fee: row.fee,
      codFee: row.codFee,
      isActive: row.isActive,
    }));
  }

  async findRate(id: string) {
    return prisma.shippingRate.findUnique({
      where: { id },
      select: { id: true, cityId: true, minWeightKg: true, maxWeightKg: true },
    });
  }

  /**
   * Active bands that would claim the same weight as the one being saved.
   *
   * Half-open bands only overlap when they genuinely cover a weight twice:
   * [0,1) and [1,5) meet at 1 but cover nothing twice, so those are not reported.
   */
  async findOverlappingBands(input: {
    cityId: string | null;
    minWeightKg: Prisma.Decimal;
    maxWeightKg: Prisma.Decimal;
    /** The band being edited, so it does not conflict with itself. */
    excludeRateId?: string;
  }) {
    return prisma.shippingRate.findMany({
      where: {
        isActive: true,
        cityId: input.cityId,
        ...(input.excludeRateId ? { id: { not: input.excludeRateId } } : {}),
        // Both must start before the other ends.
        minWeightKg: { lt: input.maxWeightKg },
        maxWeightKg: { gt: input.minWeightKg },
      },
      select: { id: true, minWeightKg: true, maxWeightKg: true },
    });
  }

  async createRate(data: {
    cityId: string | null;
    minWeightKg: Prisma.Decimal;
    maxWeightKg: Prisma.Decimal;
    fee: Prisma.Decimal;
    codFee: Prisma.Decimal;
    isActive: boolean;
  }) {
    return prisma.shippingRate.create({
      data,
      select: { id: true },
    });
  }

  async updateRate(
    id: string,
    data: {
      cityId?: string | null;
      minWeightKg?: Prisma.Decimal;
      maxWeightKg?: Prisma.Decimal;
      fee?: Prisma.Decimal;
      codFee?: Prisma.Decimal;
      isActive?: boolean;
    },
  ) {
    return prisma.shippingRate.update({ where: { id }, data, select: { id: true } });
  }

  async deleteRate(id: string) {
    return prisma.shippingRate.delete({ where: { id }, select: { id: true } });
  }
}

export const shippingRateRepository = new ShippingRateRepository();
