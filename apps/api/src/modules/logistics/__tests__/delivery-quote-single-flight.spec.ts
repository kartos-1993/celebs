import { describe, expect, it, vi } from 'vitest';

import { DeliveryQuoteService } from '../delivery-quote.service';

import { Prisma } from '@/config/db.prisma';

/**
 * The cache alone does not survive a burst.
 *
 * Fifty shoppers refreshing the same cart in the same second all read a cold cache
 * and all call the courier, which is exactly the load the cache was added to
 * avoid. Single-flight collapses those into one call and hands everyone the same
 * answer - so this is a test about concurrency, and it has to be concurrent to
 * mean anything.
 */

const dec = (v: string) => new Prisma.Decimal(v);

type FakeClient = { quote: ReturnType<typeof vi.fn> };

function fakeClient(price: string): FakeClient {
  const quote = vi.fn(async () => ({
    finalPrice: dec(price),
    codPercentage: dec('0.01'),
    planId: 1,
    serviceId: 48,
    deliveryType: '48',
  }));

  return { quote };
}

const parcel = {
  vendorId: 'sellerA',
  declaredWeightKg: dec('0.9'),
  goodsAmount: dec('1000'),
  lineIds: ['l1'],
};

const input = {
  parcels: [parcel],
  recipientCityExternalId: 79,
  recipientZoneExternalId: 1326,
  storeId: 130903,
};

describe('delivery quote single flight', () => {
  it('calls the courier once for concurrent identical questions', async () => {
    const client = fakeClient('150');
    const service = new DeliveryQuoteService(client as never, undefined, async () => 'token');

    // Twenty simultaneous requests for the same weight band and district.
    const results = await Promise.all(Array.from({ length: 20 }, () => service.quote(input)));

    expect(client.quote).toHaveBeenCalledTimes(1);
    for (const result of results) {
      expect(result.totalCourierFee.toFixed(2)).toBe('150.00');
    }
  });

  it('stops deduplicating once the call has finished', async () => {
    const client = fakeClient('150');
    const service = new DeliveryQuoteService(client as never, undefined, async () => 'token');

    await service.quote(input);
    await service.quote(input);

    // Without a cache these are two calls, and they should stay two: a promise
    // remembered forever would serve a stale price for the life of the process.
    expect(client.quote).toHaveBeenCalledTimes(2);
  });

  it('lets a later call retry after a failure, rather than caching the error', async () => {
    const quote = vi
      .fn()
      .mockRejectedValueOnce(new Error('courier unavailable'))
      .mockResolvedValue({
        finalPrice: dec('150'),
        codPercentage: dec('0.01'),
        planId: 1,
        serviceId: 48,
        deliveryType: '48',
      });
    const service = new DeliveryQuoteService({ quote } as never, undefined, async () => 'token');

    await expect(service.quote(input)).rejects.toThrow('courier unavailable');
    // The failure must not be remembered as the answer, or one courier blip would
    // poison every basket for the rest of the process's life.
    await expect(service.quote(input)).resolves.toMatchObject({ totalCourierFee: dec('150') });
  });

  it('does not deduplicate two different destinations together', async () => {
    const client = fakeClient('150');
    const service = new DeliveryQuoteService(client as never, undefined, async () => 'token');

    await Promise.all([
      service.quote(input),
      // Same weight, different district. Measured: 0.9 kg is 150 to Pokhara and 210
      // to Bardibas, so sharing a result here would hand one city the other's
      // price.
      service.quote({ ...input, recipientZoneExternalId: 1327 }),
    ]);

    expect(client.quote).toHaveBeenCalledTimes(2);
  });

  it('does not deduplicate two different weight bands together', async () => {
    const client = fakeClient('150');
    const service = new DeliveryQuoteService(client as never, undefined, async () => 'token');

    await Promise.all([
      service.quote(input),
      service.quote({
        ...input,
        parcels: [{ ...parcel, declaredWeightKg: dec('2.5') }],
      }),
    ]);

    expect(client.quote).toHaveBeenCalledTimes(2);
  });
});
