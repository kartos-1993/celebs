import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CourierDestinationRepository } from '../courier-destination.repository';
import { UnresolvableDestinationError } from '../courier-destination.repository';
import { DeliveryPreviewService } from '../delivery-preview.service';
import type { DeliveryQuoteService } from '../delivery-quote.service';

import { Prisma } from '@/config/db.prisma';

const dec = (v: string) => new Prisma.Decimal(v);

/**
 * The figure on the cart is the figure on the invoice.
 *
 * Checkout prices with the courier, so a cart that still estimated from our own
 * rate bands would show a shopper one number and charge them another - the most
 * trust-destroying thing a shop can do, and the reason the bands exist only as a
 * fallback now.
 *
 * The fallback exists because a cart must load. The courier being unreachable is
 * not a reason to show an empty basket, and it is emphatically not a reason to
 * show a number we know to be a guess without saying so.
 */

function courierSays(totalCourierFee: string) {
  return {
    quote: vi.fn(async () => ({
      totalCourierFee: dec(totalCourierFee),
      parcels: [],
      codPercentage: dec('0.01'),
      currency: 'NPR',
    })),
  } as unknown as DeliveryQuoteService;
}

const destinationRepo = {
  forZoneId: vi.fn(async () => ({
    cityExternalId: 79,
    zoneExternalId: 1326,
    cityName: 'Pokhara',
    zoneName: 'Pokhara',
  })),
} as unknown as CourierDestinationRepository;

const subtotal = dec('1200');

describe('delivery preview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('quotes the courier, so the cart shows what checkout will charge', async () => {
    const quotes = courierSays('150');
    const service = new DeliveryPreviewService(
      quotes,
      destinationRepo,
      { thresholdForAddress: vi.fn(async () => ({ freeDeliveryThreshold: dec('2500') })) } as never,
      dec('150'),
    );

    const preview = await service.preview({
      subtotal,
      parcels: [
        {
          vendorId: 'sellerA',
          declaredWeightKg: dec('0.5'),
          goodsAmount: dec('1200'),
          lineIds: ['l1'],
        },
      ],
      logisticsZoneId: 'zone-1',
      isCod: false,
    });

    expect(preview.charge.toFixed(2)).toBe('150.00');
    expect(preview.isEstimate).toBe(false);
    expect(preview.courierCost.toFixed(2)).toBe('150.00');
  });

  // The cart loads on every screen. A courier outage must not empty the basket.
  it('falls back to the old bands when the courier cannot be reached', async () => {
    const quotes = courierSays('150');
    quotes.quote = vi.fn(async () => {
      throw new Error('courier unavailable');
    });

    const service = new DeliveryPreviewService(
      quotes,
      destinationRepo,
      { thresholdForAddress: vi.fn(async () => ({ freeDeliveryThreshold: dec('2500') })) } as never,
      dec('150'),
    );

    const preview = await service.preview({
      subtotal,
      parcels: [
        {
          vendorId: 'sellerA',
          declaredWeightKg: dec('0.5'),
          goodsAmount: dec('1200'),
          lineIds: ['l1'],
        },
      ],
      logisticsZoneId: 'zone-1',
      isCod: false,
    });

    // The fallback is the policy's own flat fee, and it is labelled an estimate,
    // so the app can say the number may move rather than presenting it as the price.
    expect(preview.charge.toFixed(2)).toBe('150.00');
    expect(preview.isEstimate).toBe(true);
  });

  it('falls back when the address has no district to quote against', async () => {
    const quotes = courierSays('150');
    const service = new DeliveryPreviewService(
      quotes,
      {
        forZoneId: vi.fn(async () => {
          throw new UnresolvableDestinationError('no district');
        }),
      } as never,
      { thresholdForAddress: vi.fn(async () => ({ freeDeliveryThreshold: dec('2500') })) } as never,
      dec('150'),
    );

    const preview = await service.preview({
      subtotal,
      parcels: [
        {
          vendorId: 'sellerA',
          declaredWeightKg: dec('0.5'),
          goodsAmount: dec('1200'),
          lineIds: ['l1'],
        },
      ],
      logisticsZoneId: 'zone-1',
      isCod: false,
    });

    expect(preview.isEstimate).toBe(true);
    expect(quotes.quote).not.toHaveBeenCalled();
  });

  it('applies the free-delivery threshold to the courier cost', async () => {
    const service = new DeliveryPreviewService(
      courierSays('150'),
      destinationRepo,
      { thresholdForAddress: vi.fn(async () => ({ freeDeliveryThreshold: dec('1000') })) } as never,
      dec('150'),
    );

    const preview = await service.preview({
      subtotal,
      parcels: [
        {
          vendorId: 'sellerA',
          declaredWeightKg: dec('0.5'),
          goodsAmount: dec('1200'),
          lineIds: ['l1'],
        },
      ],
      logisticsZoneId: 'zone-1',
      isCod: false,
    });

    expect(preview.charge.toFixed(2)).toBe('0.00');
    // Waiving the charge does not make the courier's fee go away.
    expect(preview.courierCost.toFixed(2)).toBe('150.00');
    expect(preview.absorbedCost.toFixed(2)).toBe('150.00');
  });

  it('never quotes a negative charge on an empty cart', async () => {
    const service = new DeliveryPreviewService(
      courierSays('150'),
      destinationRepo,
      { thresholdForAddress: vi.fn(async () => ({ freeDeliveryThreshold: dec('0') })) } as never,
      dec('150'),
    );

    const preview = await service.preview({
      subtotal: dec('0'),
      parcels: [],
      logisticsZoneId: 'zone-1',
      isCod: false,
    });

    expect(preview.charge.toFixed(2)).toBe('0.00');
    expect(preview.courierCost.toFixed(2)).toBe('0.00');
  });
});

describe('the fallback still honours the free-delivery promise', () => {
  it('shows free delivery over the threshold even when the courier is unreachable', async () => {
    // Caught by an integration test, not by inspection. The fallback used to return
    // the flat fee unconditionally, so a cart past the threshold was shown a
    // delivery charge - and then told it was free. That is the exact bug this work
    // set out to remove, reintroduced by the safety net.
    const quotes = courierSays('150');
    quotes.quote = vi.fn(async () => {
      throw new Error('courier unavailable');
    });

    const service = new DeliveryPreviewService(
      quotes,
      destinationRepo,
      { thresholdForAddress: vi.fn(async () => ({ freeDeliveryThreshold: dec('1000') })) } as never,
      dec('150'),
    );

    const preview = await service.preview({
      subtotal,
      parcels: [
        {
          vendorId: 'sellerA',
          declaredWeightKg: dec('0.5'),
          goodsAmount: dec('1200'),
          lineIds: ['l1'],
        },
      ],
      logisticsZoneId: 'zone-1',
      isCod: false,
    });

    expect(preview.charge.toFixed(2)).toBe('0.00');
    expect(preview.isEstimate).toBe(true);
  });

  it('still charges below the threshold when the courier is unreachable', async () => {
    const quotes = courierSays('150');
    quotes.quote = vi.fn(async () => {
      throw new Error('courier unavailable');
    });

    const service = new DeliveryPreviewService(
      quotes,
      destinationRepo,
      { thresholdForAddress: vi.fn(async () => ({ freeDeliveryThreshold: dec('5000') })) } as never,
      dec('150'),
    );

    const preview = await service.preview({
      subtotal,
      parcels: [
        {
          vendorId: 'sellerA',
          declaredWeightKg: dec('0.5'),
          goodsAmount: dec('1200'),
          lineIds: ['l1'],
        },
      ],
      logisticsZoneId: 'zone-1',
      isCod: false,
    });

    expect(preview.charge.toFixed(2)).toBe('150.00');
  });
});
