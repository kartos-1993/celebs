import { describe, expect, it } from 'vitest';

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

function fakeClient(priceFor: (weightKg: Prisma.Decimal) => Prisma.Decimal) {
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
      isCod: false,
      parcels: [
        { vendorId: 'sellerA', weightKg: dec('0.9'), goodsAmount: dec('1800'), lineIds: ['l1'] },
        { vendorId: 'sellerB', weightKg: dec('2.5'), goodsAmount: dec('600'), lineIds: ['l2'] },
      ],
    });

    // The case the whole exercise exists for: one fee for a shared basket would be
    // 150 here, while the courier bills for two pickups.
    expect(quote.parcels).toHaveLength(2);
    expect(quote.totalDeliveryFee.toFixed(2)).toBe('300.00');
    expect(calls).toHaveLength(2);
  });

  it('shows the customer the same figure it will charge them', async () => {
    const { client } = fakeClient(() => dec('185'));

    const quote = await new DeliveryQuoteService(client, undefined, async () => 'token').quote({
      ...baseInput,
      isCod: false,
      parcels: [
        { vendorId: 'sellerA', weightKg: dec('2.5'), goodsAmount: dec('600'), lineIds: ['l1'] },
      ],
    });

    expect(quote.totalDeliveryFee.toFixed(2)).toBe('185.00');
    expect(quote.collectibleAmount.toFixed(2)).toBe('785.00');
  });

  it('adds the courier cash-handling charge only on cash on delivery', async () => {
    const { client } = fakeClient(() => dec('150'));

    const service = new DeliveryQuoteService(client, undefined, async () => 'token');

    const prepaid = await service.quote({
      ...baseInput,
      isCod: false,
      parcels: [
        { vendorId: 'sellerA', weightKg: dec('0.9'), goodsAmount: dec('1000'), lineIds: ['l1'] },
      ],
    });

    const cod = await service.quote({
      ...baseInput,
      isCod: true,
      parcels: [
        { vendorId: 'sellerA', weightKg: dec('0.9'), goodsAmount: dec('1000'), lineIds: ['l1'] },
      ],
    });

    expect(prepaid.codHandlingFee.toFixed(2)).toBe('0.00');
    expect(cod.codHandlingFee.toFixed(2)).toBe('11.50');
    // 1000 goods + 150 delivery = 1150, and 1% of that is the handling charge.
    expect(cod.collectibleAmount.toFixed(2)).toBe('1161.50');
  });

  it('refuses a parcel the courier will not carry rather than quoting a fee', async () => {
    const { client } = fakeClient(() => dec('150'));

    await expect(
      new DeliveryQuoteService(client, undefined, async () => 'token').quote({
        ...baseInput,
        isCod: false,
        parcels: [
          { vendorId: 'sellerA', weightKg: dec('250'), goodsAmount: dec('100'), lineIds: ['l1'] },
        ],
      }),
    ).rejects.toThrow(/200/);
  });

  it('refuses an order with nothing to ship', async () => {
    const { client } = fakeClient(() => dec('150'));

    await expect(
      new DeliveryQuoteService(client, undefined, async () => 'token').quote({
        ...baseInput,
        isCod: false,
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
      isCod: false,
      parcels: [
        { vendorId: 'sellerA', weightKg: dec('0.9'), goodsAmount: dec('100'), lineIds: ['l1'] },
        { vendorId: 'sellerB', weightKg: dec('0.9'), goodsAmount: dec('200'), lineIds: ['l2'] },
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
      isCod: false,
      parcels: [
        { vendorId: 'sellerA', weightKg: dec('0.9'), goodsAmount: dec('100'), lineIds: ['l1'] },
      ],
    };

    const first = await service.quote(input);
    const second = await service.quote(input);

    expect(calls).toHaveLength(1);
    expect(first.parcels[0]?.cached).toBe(false);
    expect(second.parcels[0]?.cached).toBe(true);
    expect(second.totalDeliveryFee.toFixed(2)).toBe(first.totalDeliveryFee.toFixed(2));
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
      isCod: false,
      parcels: [
        { vendorId: 'sellerA', weightKg: dec('0.5'), goodsAmount: dec('1'), lineIds: ['l1'] },
      ],
    });
    await service.quote({
      ...baseInput,
      isCod: false,
      parcels: [
        { vendorId: 'sellerA', weightKg: dec('50'), goodsAmount: dec('1'), lineIds: ['l2'] },
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
      weightKg: dec('0.9'),
      goodsAmount: dec('100'),
      lineIds: ['l1'],
    };

    await service.quote({ ...baseInput, isCod: false, parcels: [parcel] });
    const elsewhere = await service.quote({
      ...baseInput,
      recipientZoneExternalId: 1338,
      isCod: false,
      parcels: [parcel],
    });

    // A cache that ignored the destination would hand Bardikas the Pokhara price.
    expect(elsewhere.parcels[0]?.cached).toBe(false);
  });
});
