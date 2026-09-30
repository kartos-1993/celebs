import type {
  CreateShippingRateType,
  UpdateDeliveryCityType,
  UpdateShippingRateType,
} from '@celebs/shared-types';
import { AppError, ErrorCode, HTTPSTATUS } from '@celebs/shared-utils';

import {
  type RateCityRow,
  type RateRow,
  ShippingRateRepository,
  shippingRateRepository,
} from './shipping-rate.repository';

import { Prisma } from '@/config/db.prisma';

/**
 * Admin management of the delivery rate card.
 *
 * The guard rails here are not ceremony. An overlapping band is the failure mode
 * that hides itself: two bands claim the same weight, the cheaper one wins, and
 * nobody notices until a courier invoice does not balance. Refusing the save turns
 * that into a message the admin sees immediately.
 */
export class ShippingRateService {
  constructor(private readonly repo: ShippingRateRepository = shippingRateRepository) {}

  listCities(): Promise<RateCityRow[]> {
    return this.repo.listCities();
  }

  listRates(): Promise<RateRow[]> {
    return this.repo.listRates();
  }

  async createRate(input: CreateShippingRateType) {
    if (input.cityId) {
      await this.assertCityExists(input.cityId);
    }

    await this.assertNoOverlap({
      cityId: input.cityId,
      minWeightKg: new Prisma.Decimal(input.minWeightKg),
      maxWeightKg: new Prisma.Decimal(input.maxWeightKg),
    });

    return this.repo.createRate({
      cityId: input.cityId,
      minWeightKg: new Prisma.Decimal(input.minWeightKg),
      maxWeightKg: new Prisma.Decimal(input.maxWeightKg),
      fee: new Prisma.Decimal(input.fee),
      codFee: new Prisma.Decimal(input.codFee),
      isActive: input.isActive,
    });
  }

  async updateRate(id: string, input: UpdateShippingRateType) {
    const existing = await this.repo.findRate(id);
    if (!existing) {
      throw new AppError('Rate band not found', HTTPSTATUS.NOT_FOUND, ErrorCode.RESOURCE_NOT_FOUND);
    }

    // Only re-check overlap when the save actually moves the band or changes which
    // city it covers. Editing a fee cannot create a conflict.
    const bandChanged =
      input.minWeightKg !== undefined ||
      input.maxWeightKg !== undefined ||
      input.cityId !== undefined;

    if (bandChanged) {
      if (input.cityId) {
        await this.assertCityExists(input.cityId);
      }

      await this.assertNoOverlap({
        cityId: input.cityId !== undefined ? input.cityId : existing.cityId,
        minWeightKg:
          input.minWeightKg !== undefined
            ? new Prisma.Decimal(input.minWeightKg)
            : existing.minWeightKg,
        maxWeightKg:
          input.maxWeightKg !== undefined
            ? new Prisma.Decimal(input.maxWeightKg)
            : existing.maxWeightKg,
        excludeRateId: id,
      });
    }

    return this.repo.updateRate(id, {
      // Built field by field rather than spreading the parsed input, so the
      // repository only ever sees Decimal money and weight.
      ...(input.cityId !== undefined ? { cityId: input.cityId } : {}),
      ...(input.minWeightKg !== undefined
        ? { minWeightKg: new Prisma.Decimal(input.minWeightKg) }
        : {}),
      ...(input.maxWeightKg !== undefined
        ? { maxWeightKg: new Prisma.Decimal(input.maxWeightKg) }
        : {}),
      ...(input.fee !== undefined ? { fee: new Prisma.Decimal(input.fee) } : {}),
      ...(input.codFee !== undefined ? { codFee: new Prisma.Decimal(input.codFee) } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    });
  }

  async deleteRate(id: string) {
    const existing = await this.repo.findRate(id);
    if (!existing) {
      throw new AppError('Rate band not found', HTTPSTATUS.NOT_FOUND, ErrorCode.RESOURCE_NOT_FOUND);
    }

    return this.repo.deleteRate(id);
  }

  async updateCity(id: string, input: UpdateDeliveryCityType) {
    await this.assertCityExists(id);

    return this.repo.updateCity(id, input);
  }

  private async assertCityExists(id: string): Promise<void> {
    const city = await this.repo.findCity(id);
    if (!city) {
      throw new AppError(
        'Delivery city not found',
        HTTPSTATUS.NOT_FOUND,
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }
  }

  private async assertNoOverlap(input: {
    cityId: string | null;
    minWeightKg: Prisma.Decimal;
    maxWeightKg: Prisma.Decimal;
    excludeRateId?: string;
  }): Promise<void> {
    const overlaps = await this.repo.findOverlappingBands(input);
    if (overlaps.length > 0) {
      throw new AppError(
        'This weight range overlaps a rate band already on the card. Remove or resize that band first.',
        HTTPSTATUS.BAD_REQUEST,
        ErrorCode.INVALID_REQUEST,
      );
    }
  }
}

export const shippingRateService = new ShippingRateService();
