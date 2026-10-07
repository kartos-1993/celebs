import { describe, expect, it, vi } from 'vitest';

// The suite-wide setup stubs this module to prevent live courier quotes during
// general tests. This file is the dedicated unit test suite for the client, so
// it takes the real implementation back.
vi.unmock('@/modules/logistics/adapters/pathao-price.client');

import {
  COURIER_MAX_PARCEL_KG,
  NORMAL_DELIVERY_TYPE,
  PARCEL_ITEM_TYPE,
  parsePathaoPricePlan,
  PathaoPriceClient,
  pricePlanRequest,
  weightBandFor,
} from '../pathao-price.client';

import { Prisma } from '@/config/db.prisma';

/**
 * The courier's price oracle.
 *
 * Every case here came from the live sandbox rather than the documentation, and
 * the documentation was wrong on the one that matters most: it says parcels are
 * 0.5-10 kg, the API enforces 0.001-200.
 */
describe('pricePlanRequest', () => {
  it('asks for the exact six inputs the courier prices on', () => {
    // Measured: price-plan takes no quantity and no dimensions. Quantity is
    // descriptive only - an order of 25 items at 0.5 kg was charged the 0.5 kg
    // rate - and dimensions are not sent at all.
    const body = pricePlanRequest({
      storeId: 130903,
      itemWeightKg: new Prisma.Decimal('0.9'),
      recipientCityId: 79,
      recipientZoneId: 1326,
    });

    expect(body).toEqual({
      store_id: 130903,
      item_type: PARCEL_ITEM_TYPE,
      delivery_type: NORMAL_DELIVERY_TYPE,
      item_weight: 0.9,
      recipient_city: 79,
      recipient_zone: 1326,
    });
  });

  it('sends weight as a number, because that is what the courier accepts', () => {
    // The payload is the one place a JS number is correct: Pathao's schema takes a
    // float and rejects a string weight only where it cannot parse one.
    const body = pricePlanRequest({
      storeId: 130903,
      itemWeightKg: new Prisma.Decimal('2.675'),
      recipientCityId: 79,
      recipientZoneId: 1326,
    });

    expect(body.item_weight).toBe(2.675);
  });

  it('refuses a parcel over the courier maximum instead of quoting it', () => {
    // price-plan does not enforce its own limit: it priced 250 kg rather than
    // refusing, and only create-order rejected it. Clamping to the maximum would
    // quote a fee for a parcel the courier will not carry.
    expect(() =>
      pricePlanRequest({
        storeId: 130903,
        itemWeightKg: new Prisma.Decimal('250'),
        recipientCityId: 79,
        recipientZoneId: 1326,
      }),
    ).toThrow(/200/);
  });

  it('refuses a zero or negative weight', () => {
    expect(() =>
      pricePlanRequest({
        storeId: 130903,
        itemWeightKg: new Prisma.Decimal('0'),
        recipientCityId: 79,
        recipientZoneId: 1326,
      }),
    ).toThrow();
  });
});

describe('parsePathaoPricePlan', () => {
  // A real sandbox response, trimmed to the fields we read.
  const RESPONSE = {
    message: 'price',
    type: 'success',
    code: 200,
    data: {
      price: 160,
      discount: 0,
      discount_type: null,
      promo_discount: 0,
      plan_id: 78819,
      cod_enabled: 1,
      cod_percentage: 0.01,
      cod_discount: null,
      additional_charge: 0,
      final_price: 160,
    },
  };

  it('reads the charge and the rate plan', () => {
    const quote = parsePathaoPricePlan(RESPONSE);

    expect(quote.finalPrice.toFixed(2)).toBe('160.00');
    expect(quote.planId).toBe(78819);
    expect(quote.codPercentage.toFixed(4)).toBe('0.0100');
  });

  // price and final_price differ at low weights: 115 against a listed 120. Quoting
  // `price` would overcharge the customer by the discount on every cheap parcel.
  it('prefers final_price over price, which differs at low weight', () => {
    const discounted = {
      ...RESPONSE,
      data: { ...RESPONSE.data, price: 120, final_price: 115 },
    };

    expect(parsePathaoPricePlan(discounted).finalPrice.toFixed(2)).toBe('115.00');
  });

  it('refuses a payload it does not recognise, rather than quoting zero', () => {
    // Reading a shape we do not understand as a free delivery would be the worst
    // possible outcome: we would sell shipping at no cost and find out at
    // settlement.
    expect(() => parsePathaoPricePlan({ data: {} })).toThrow();
    expect(() => parsePathaoPricePlan({})).toThrow();
    expect(() => parsePathaoPricePlan(null)).toThrow();
  });

  it('refuses an additional charge it cannot carry into the quote', () => {
    // additional_charge is money the courier adds that we have nowhere to put yet.
    // Silently dropping it would under-quote; failing stops the sale instead.
    expect(() =>
      parsePathaoPricePlan({
        ...RESPONSE,
        data: { ...RESPONSE.data, additional_charge: 25 },
      }),
    ).toThrow(/cannot yet record/i);
  });
});

describe('weightBandFor', () => {
  // The cache key. Measured curve: 0.5 and 0.3 both cost 120; 0.6-1.0 cost 150;
  // 1.2-2.0 cost 160; above 2 kg it is linear per kg.
  it('collapses weights the courier prices identically', () => {
    expect(weightBandFor(new Prisma.Decimal('0.3'))).toBe(weightBandFor(new Prisma.Decimal('0.5')));
    expect(weightBandFor(new Prisma.Decimal('0.6'))).toBe(weightBandFor(new Prisma.Decimal('1.0')));
    expect(weightBandFor(new Prisma.Decimal('1.2'))).toBe(weightBandFor(new Prisma.Decimal('2.0')));
  });

  it('does not collapse the 0.5 and 1.0 bands, which price differently', () => {
    expect(weightBandFor(new Prisma.Decimal('0.5'))).not.toBe(
      weightBandFor(new Prisma.Decimal('1.0')),
    );
  });

  it('keeps heavy weights apart, because they are priced per kilogram', () => {
    // 20kg is 610 and 50kg is 1360 on the Pokhara route, so a single heavy bucket
    // would quote one of them at the other's price.
    expect(weightBandFor(new Prisma.Decimal('20'))).not.toBe(
      weightBandFor(new Prisma.Decimal('50')),
    );
  });
});

describe('COURIER_MAX_PARCEL_KG', () => {
  it('is the courier limit, not the documented one', () => {
    // The documentation says 10. The API validated 0.001-200 and priced 150 kg
    // without complaint, so the real ceiling is the larger one.
    expect(COURIER_MAX_PARCEL_KG.toNumber()).toBe(200);
  });
});

describe('PathaoPriceClient.quote', () => {
  it('names the missing base url instead of posting to a relative URL', async () => {
    vi.stubEnv('PATHAO_BASE_URL', '');
    const mockFetch = vi.fn();

    // Construction must not throw: the module singleton is built at import.
    const client = new PathaoPriceClient(mockFetch as unknown as typeof fetch);

    await expect(
      client.quote({
        storeId: 130903,
        itemWeightKg: new Prisma.Decimal('0.9'),
        recipientCityId: 79,
        recipientZoneId: 1326,
        accessToken: 'token',
      }),
    ).rejects.toThrow(/PATHAO_BASE_URL/);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
