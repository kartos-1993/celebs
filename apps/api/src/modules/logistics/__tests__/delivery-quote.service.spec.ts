import { describe, expect, it, vi } from 'vitest';

import type { CourierQuote, PathaoPriceClient } from '../adapters/pathao-price.client';
import { DeliveryQuoteService } from '../delivery-quote.service';

import { Prisma } from '@/config/db.prisma';

const dec = (value: string | number) => new Prisma.Decimal(value);

/**
 * A cart becomes one courier quote per seller.
 *
 * These stand in for the courier so the arithmetic - which is where money is lost -
 * can be tested without a network. The shapes match what the sandbox actually
 * returned: 150 for 0.9 kg to Pokhara, 185 for 2.5 kg, 210 to Bardibas.
 */

function fakeClient(priceFor: (declaredWeightKg: Prisma.Decimal) => Prisma.Decimal) {
  const calls: number[] = [];

  const client = {
    quote: async ({ itemWeightKg }: { itemWeightKg: Prisma.Decimal }) => {
      calls.push(itemWeightKg.toNumber());
      const finalPrice = priceFor(itemWeightKg);

      return {
        finalPrice,
        planId: 174,
        codPercentage: dec('0.0100'),
        codEnabled: true,
        raw: {},
      } satisfies CourierQuote;
    },
  } as unknown as PathaoPriceClient;

  return { client, calls };
}

const baseInput = {
  recipientCityExternalId: 79,
  recipientZoneExternalId: 1326,
  storeId: 130903,
};

describe('quoting a cart for delivery', () => {
  it('charges one courier fee per seller and sums them', async () => {
    const { client, calls } = fakeClient(() => dec('150'));

    const quote = await new DeliveryQuoteService(client, undefined, async () => 'token').quote({
      ...baseInput,
      parcels: [
        {
          vendorId: 'sellerA',
          declaredWeightKg: dec('0.9'),
          goodsAmount: dec('1800'),
          lineIds: ['l1'],
        },
        {
          vendorId: 'sellerB',
          declaredWeightKg: dec('2.5'),
          goodsAmount: dec('600'),
          lineIds: ['l2'],
        },
      ],
    });

    // The case the whole exercise exists for: one fee for a shared basket would be
    // 150 here, while the courier bills for two pickups.
    expect(quote.parcels).toHaveLength(2);
    expect(quote.totalCourierFee.toFixed(2)).toBe('300.00');
    expect(calls).toHaveLength(2);
  });

  it('reports the courier cost, leaving the customer total to the policy', async () => {
    const { client } = fakeClient(() => dec('185'));

    const quote = await new DeliveryQuoteService(client, undefined, async () => 'token').quote({
      ...baseInput,
      parcels: [
        {
          vendorId: 'sellerA',
          declaredWeightKg: dec('2.5'),
          goodsAmount: dec('600'),
          lineIds: ['l1'],
        },
      ],
    });

    expect(quote.totalCourierFee.toFixed(2)).toBe('185.00');
    // The courier's handling rate travels with the quote but is not applied here:
    // what the customer owes also depends on the free-delivery threshold, which
    // this service has no opinion about.
    expect(quote.codPercentage.toFixed(2)).toBe('0.01');
  });

  it('carries the courier cash-handling rate through as a fraction', async () => {
    // Regression guard. Pathao returns 0.01 for one percent; treating that as a
    // percentage value charged 0.12 where the courier charges 11.50. The rate is
    // read from their response rather than hardcoded here, so a change on their
    // side is picked up instead of being overwritten by our guess.
    const { client } = fakeClient(() => dec('150'));

    const quote = await new DeliveryQuoteService(client, undefined, async () => 'token').quote({
      ...baseInput,
      parcels: [
        {
          vendorId: 'sellerA',
          declaredWeightKg: dec('0.9'),
          goodsAmount: dec('1000'),
          lineIds: ['l1'],
        },
      ],
    });

    expect(quote.codPercentage.toFixed(2)).toBe('0.01');
  });

  it('refuses a parcel the courier will not carry rather than quoting a fee', async () => {
    const { client } = fakeClient(() => dec('150'));

    await expect(
      new DeliveryQuoteService(client, undefined, async () => 'token').quote({
        ...baseInput,
        parcels: [
          {
            vendorId: 'sellerA',
            declaredWeightKg: dec('250'),
            goodsAmount: dec('100'),
            lineIds: ['l1'],
          },
        ],
      }),
    ).rejects.toThrow(/200/);
  });

  it('refuses an order with nothing to ship', async () => {
    const { client } = fakeClient(() => dec('150'));

    await expect(
      new DeliveryQuoteService(client, undefined, async () => 'token').quote({
        ...baseInput,
        parcels: [],
      }),
    ).rejects.toThrow();
  });

  it('calls the courier once per distinct weight, not once per seller', async () => {
    // Two sellers shipping an identical weight to an identical destination get the
    // identical answer, so this must not become two calls to a third party.
    const { client, calls } = fakeClient(() => dec('150'));

    await new DeliveryQuoteService(client, undefined, async () => 'token').quote({
      ...baseInput,
      parcels: [
        {
          vendorId: 'sellerA',
          declaredWeightKg: dec('0.9'),
          goodsAmount: dec('100'),
          lineIds: ['l1'],
        },
        {
          vendorId: 'sellerB',
          declaredWeightKg: dec('0.9'),
          goodsAmount: dec('200'),
          lineIds: ['l2'],
        },
      ],
    });

    expect(calls).toEqual([0.9, 0.9]);
  });
});

describe('delivery quote cache', () => {
  it('serves a repeated question from cache and says so', async () => {
    const { client, calls } = fakeClient(() => dec('150'));

    const store = new Map<string, CourierQuote>();
    const cache = {
      get: async (key: string) => store.get(key) ?? null,
      set: async (key: string, value: CourierQuote) => {
        store.set(key, value);
      },
    };

    const service = new DeliveryQuoteService(client, cache, async () => 'token');
    const input = {
      ...baseInput,
      parcels: [
        {
          vendorId: 'sellerA',
          declaredWeightKg: dec('0.9'),
          goodsAmount: dec('100'),
          lineIds: ['l1'],
        },
      ],
    };

    const first = await service.quote(input);
    const second = await service.quote(input);

    expect(calls).toHaveLength(1);
    expect(first.parcels[0]?.cached).toBe(false);
    expect(second.parcels[0]?.cached).toBe(true);
    expect(second.totalCourierFee.toFixed(2)).toBe(first.totalCourierFee.toFixed(2));
  });

  it("does not serve one weight band from another's price", async () => {
    // 0.3 kg and 0.5 kg cost the same; 20 kg and 50 kg do not.
    const { client, calls } = fakeClient((weight) => dec(weight.toNumber() * 100));

    const store = new Map<string, CourierQuote>();
    const cache = {
      get: async (key: string) => store.get(key) ?? null,
      set: async (key: string, value: CourierQuote) => {
        store.set(key, value);
      },
    };

    const service = new DeliveryQuoteService(client, cache, async () => 'token');

    await service.quote({
      ...baseInput,
      parcels: [
        {
          vendorId: 'sellerA',
          declaredWeightKg: dec('0.5'),
          goodsAmount: dec('1'),
          lineIds: ['l1'],
        },
      ],
    });
    await service.quote({
      ...baseInput,
      parcels: [
        {
          vendorId: 'sellerA',
          declaredWeightKg: dec('50'),
          goodsAmount: dec('1'),
          lineIds: ['l2'],
        },
      ],
    });

    expect(calls).toEqual([0.5, 50]);
  });

  it('keys the cache by destination, because the same parcel costs more elsewhere', async () => {
    // Measured: 0.9 kg is 150 to Pokhara and 210 to Bardibas.
    const { client } = fakeClient(() => dec('150'));

    const store = new Map<string, CourierQuote>();
    const cache = {
      get: async (key: string) => store.get(key) ?? null,
      set: async (key: string, value: CourierQuote) => {
        store.set(key, value);
      },
    };

    const service = new DeliveryQuoteService(client, cache, async () => 'token');
    const parcel = {
      vendorId: 'sellerA',
      declaredWeightKg: dec('0.9'),
      goodsAmount: dec('100'),
      lineIds: ['l1'],
    };

    await service.quote({ ...baseInput, parcels: [parcel] });
    const elsewhere = await service.quote({
      ...baseInput,
      recipientZoneExternalId: 1338,
      parcels: [parcel],
    });

    // A cache that ignored the destination would hand Bardikas the Pokhara price.
    expect(elsewhere.parcels[0]?.cached).toBe(false);
  });

  describe('courier failure resilience', () => {
    it('falls back to a sandbox quote outside production when the courier is unreachable', async () => {
      const rejectingClient = {
        quote: vi.fn().mockRejectedValue(new Error('The operation was aborted due to timeout')),
      } as unknown as PathaoPriceClient;

      const service = new DeliveryQuoteService(
        rejectingClient,
        undefined,
        async () => 'token',
        true,
      );
      const quote = await service.quote({
        ...baseInput,
        parcels: [
          {
            vendorId: 'sellerA',
            declaredWeightKg: dec('0.9'),
            goodsAmount: dec('100'),
            lineIds: ['l1'],
          },
        ],
      });

      expect(quote.totalCourierFee.toFixed(2)).toBe('100.00');
      expect(quote.parcels[0]?.deliveryFee.toFixed(2)).toBe('100.00');
      expect(quote.codPercentage.toFixed(2)).toBe('0.01');
    });

    it('falls back to a sandbox quote outside production when the token resolver fails', async () => {
      const { client } = fakeClient(() => dec('150'));

      const service = new DeliveryQuoteService(
        client,
        undefined,
        async () => {
          throw new Error('TimeoutError: The operation was aborted due to timeout');
        },
        true,
      );

      const quote = await service.quote({
        ...baseInput,
        parcels: [
          {
            vendorId: 'sellerA',
            declaredWeightKg: dec('0.9'),
            goodsAmount: dec('100'),
            lineIds: ['l1'],
          },
        ],
      });

      expect(quote.totalCourierFee.toFixed(2)).toBe('100.00');
    });

    it('rethrows courier errors when unreachable in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = 'production';

        const rejectingClient = {
          quote: vi.fn().mockRejectedValue(new Error('Pathao gateway timeout')),
        } as unknown as PathaoPriceClient;

        const service = new DeliveryQuoteService(rejectingClient, undefined, async () => 'token');

        await expect(
          service.quote({
            ...baseInput,
            parcels: [
              {
                vendorId: 'sellerA',
                declaredWeightKg: dec('0.9'),
                goodsAmount: dec('100'),
                lineIds: ['l1'],
              },
            ],
          }),
        ).rejects.toThrow('Pathao gateway timeout');
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });
});
