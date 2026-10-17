import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  CreateShippingRateType,
  UpdateDeliveryCityType,
  UpdateShippingRateType,
} from '@celebs/shared-types';

import type { ShippingRateRepository } from '../shipping-rate.repository';
import { ShippingRateService } from '../shipping-rate.service';

import { Prisma } from '@/config/db.prisma';

/**
 * The rate card decides what a customer pays and what a courier costs us, so the
 * admin editing it needs two guarantees: a change takes effect without a deploy,
 * and a band can never be filed in a way that leaves a gap.
 */
describe('ShippingRateService', () => {
  let repo: {
    listCities: ReturnType<typeof vi.fn>;
    updateCity: ReturnType<typeof vi.fn>;
    findCity: ReturnType<typeof vi.fn>;
    listRates: ReturnType<typeof vi.fn>;
    createRate: ReturnType<typeof vi.fn>;
    updateRate: ReturnType<typeof vi.fn>;
    deleteRate: ReturnType<typeof vi.fn>;
    findRate: ReturnType<typeof vi.fn>;
    findOverlappingBands: ReturnType<typeof vi.fn>;
  };
  let service: ShippingRateService;

  beforeEach(() => {
    repo = {
      listCities: vi.fn().mockResolvedValue([]),
      updateCity: vi.fn().mockResolvedValue({ id: 'city-1' }),
      findCity: vi.fn().mockResolvedValue({ id: 'city-1' }),
      listRates: vi.fn().mockResolvedValue([]),
      createRate: vi.fn().mockResolvedValue({ id: 'rate-1' }),
      updateRate: vi.fn().mockResolvedValue({ id: 'rate-1' }),
      deleteRate: vi.fn().mockResolvedValue({ id: 'rate-1' }),
      findRate: vi.fn().mockResolvedValue({ id: 'rate-1' }),
      findOverlappingBands: vi.fn().mockResolvedValue([]),
    };
    service = new ShippingRateService(repo as unknown as ShippingRateRepository);
  });

  const band = (over: Partial<CreateShippingRateType> = {}): CreateShippingRateType => ({
    cityId: null,
    minWeightKg: 0,
    maxWeightKg: 1,
    fee: 80,
    codFee: 0,
    isActive: true,
    ...over,
  });

  describe('createRate', () => {
    it('creates a band that does not overlap an existing one', async () => {
      const result = await service.createRate(band());

      expect(repo.createRate).toHaveBeenCalled();
      expect(result.id).toBe('rate-1');
    });

    it('refuses a band that overlaps one already on the card', async () => {
      // Two bands covering the same weight make the cheaper one win, silently
      // undercharging or overcharging depending on insert order. This is a
      // mistake an admin makes by accident, not a pricing decision.
      repo.findOverlappingBands.mockResolvedValue([{ id: 'existing', minWeightKg: 0 }]);

      await expect(service.createRate(band())).rejects.toThrow(/overlap/i);
      expect(repo.createRate).not.toHaveBeenCalled();
    });

    it('allows a band that only touches another band boundary', async () => {
      // [0,1) and [1,5) share an endpoint but cover no weight twice.
      repo.findOverlappingBands.mockResolvedValue([]);

      await expect(
        service.createRate(band({ minWeightKg: 1, maxWeightKg: 5 })),
      ).resolves.toBeDefined();
    });

    it('rejects a band for a delivery city that does not exist', async () => {
      repo.findCity.mockResolvedValue(null);

      await expect(service.createRate(band({ cityId: 'missing-city' }))).rejects.toThrow(/city/i);
      expect(repo.createRate).not.toHaveBeenCalled();
    });
  });

  describe('updateRate', () => {
    it('updates a fee without touching the band', async () => {
      repo.findOverlappingBands.mockResolvedValue([]);

      await service.updateRate('rate-1', { fee: 120 } satisfies UpdateShippingRateType);

      // The fee crosses into the repository as Decimal, not as the number the
      // admin typed, so it cannot drift on the way to the column.
      expect(repo.updateRate).toHaveBeenCalledWith('rate-1', {
        fee: new Prisma.Decimal(120),
      });
    });

    it('refuses an edit that would overlap another band', async () => {
      repo.findOverlappingBands.mockResolvedValue([{ id: 'other', minWeightKg: 0 }]);

      await expect(
        service.updateRate('rate-1', { minWeightKg: 0, maxWeightKg: 2 } as UpdateShippingRateType),
      ).rejects.toThrow(/overlap/i);
      expect(repo.updateRate).not.toHaveBeenCalled();
    });

    it('reports a missing band rather than silently succeeding', async () => {
      repo.findRate.mockResolvedValue(null);

      await expect(service.updateRate('rate-404', { fee: 120 })).rejects.toThrow(/not found/i);
    });
  });

  describe('deleteRate', () => {
    it('removes a band', async () => {
      await service.deleteRate('rate-1');

      expect(repo.deleteRate).toHaveBeenCalledWith('rate-1');
    });

    it('reports a missing band rather than silently succeeding', async () => {
      repo.findRate.mockResolvedValue(null);

      await expect(service.deleteRate('rate-404')).rejects.toThrow(/not found/i);
      expect(repo.deleteRate).not.toHaveBeenCalled();
    });
  });

  describe('updateCity', () => {
    it('saves a new free delivery threshold', async () => {
      await service.updateCity('city-1', {
        freeDeliveryThreshold: 5000,
      } satisfies UpdateDeliveryCityType);

      expect(repo.updateCity).toHaveBeenCalledWith('city-1', {
        // Decimal across the repository boundary, like every other price: the
        // threshold is compared against money, so it cannot pass through a float.
        freeDeliveryThreshold: new Prisma.Decimal(5000),
      });
    });

    it('keeps a threshold that carries paisa exactly', async () => {
      await service.updateCity('city-1', { freeDeliveryThreshold: 2499.5 });

      expect(repo.updateCity).toHaveBeenCalledWith('city-1', {
        freeDeliveryThreshold: new Prisma.Decimal(2499.5),
      });
    });

    it('passes an activation change through untouched', async () => {
      await service.updateCity('city-1', { isActive: false });

      expect(repo.updateCity).toHaveBeenCalledWith('city-1', { isActive: false });
    });

    it('reports a missing city rather than silently succeeding', async () => {
      repo.findCity.mockResolvedValue(null);

      await expect(service.updateCity('city-404', { isActive: false })).rejects.toThrow(
        /not found/i,
      );
    });
  });
});
