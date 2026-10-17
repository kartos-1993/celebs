import { beforeEach, describe, expect, it, vi } from 'vitest';

import { cachedDeliveryQuoteCache } from '../delivery-quote.cache';

import { Prisma } from '@/config/db.prisma';

/**
 * The courier is asked far more often than it should be.
 *
 * A cart is loaded on every screen, by every shopper, and the answer for a given
 * weight band and district is the same for hours. Without a cache each of those
 * loads becomes a live HTTP call to a third party, which turns their latency and
 * their uptime into our checkout's latency and uptime.
 *
 * The second problem is subtler and costs more. Caching without single-flight does
 * not help a burst: fifty shoppers refreshing at once each see a cold cache and
 * all fifty call out. The in-flight map collapses those into one call.
 */

const { mockRedisGet, mockRedisSet } = vi.hoisted(() => ({
  mockRedisGet: vi.fn(),
  mockRedisSet: vi.fn(),
}));

vi.mock('@/config/upstash.redis', () => ({
  cacheRedis: {
    get: mockRedisGet,
    set: mockRedisSet,
    del: vi.fn(),
    expire: vi.fn(),
  },
}));

const quote = (finalPrice: string) => ({
  finalPrice: new Prisma.Decimal(finalPrice),
  codPercentage: new Prisma.Decimal('0.01'),
  planId: 7,
  codEnabled: true,
  raw: {},
});

const KEY = 'celebs:pathao:quote:202';

describe('delivery quote cache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    mockRedisSet.mockResolvedValue(undefined);
  });

  it('returns what the courier said last time', async () => {
    mockRedisGet.mockResolvedValue(quote('150'));

    const found = await cachedDeliveryQuoteCache.get(KEY);

    expect(found?.finalPrice.toFixed(2)).toBe('150.00');
  });

  it('reports a miss rather than throwing when nothing is cached', async () => {
    mockRedisGet.mockResolvedValue(null);

    await expect(cachedDeliveryQuoteCache.get(KEY)).resolves.toBeNull();
  });

  // A cache that takes the whole cart down when Redis is unreachable is worse than
  // no cache: it converts a degraded dependency into an outage.
  it('treats an unreachable cache as a miss instead of failing the checkout', async () => {
    mockRedisGet.mockRejectedValue(new Error('redis down'));

    await expect(cachedDeliveryQuoteCache.get(KEY)).resolves.toBeNull();
  });

  it('treats a failed write as a miss next time, not as a wrong price', async () => {
    mockRedisSet.mockRejectedValue(new Error('redis down'));

    await expect(cachedDeliveryQuoteCache.set(KEY, quote('150'))).resolves.toBeUndefined();
  });

  it('expires entries, so a price change is picked up rather than pinned forever', async () => {
    await cachedDeliveryQuoteCache.set(KEY, quote('150'));

    // A courier price is not permanent. Caching it indefinitely would silently
    // ignore their next rate change and keep charging the old one.
    expect(mockRedisSet).toHaveBeenCalledWith(KEY, expect.objectContaining({ planId: 7 }), {
      ex: expect.any(Number),
    });
  });

  it('does not fail the caller when the value in the cache is unreadable', async () => {
    // A key written by an older shape, or truncated by something else. Reading it
    // must not throw into a checkout that could have quoted the courier directly.
    mockRedisGet.mockResolvedValue({ nope: true });

    await expect(cachedDeliveryQuoteCache.get(KEY)).resolves.toBeNull();
  });

  it('revives Decimals after a real JSON round trip, so cached quotes match fresh ones', async () => {
    // Redis stores JSON. A quote written as Decimals comes back as plain data,
    // and callers (plus the API response) assume Decimal instances. This is the
    // shape a real Redis returns, not the live objects the other tests feed.
    mockRedisGet.mockResolvedValue(JSON.parse(JSON.stringify(quote('150'))) as unknown);

    const found = await cachedDeliveryQuoteCache.get(KEY);

    expect(found?.finalPrice).toBeInstanceOf(Prisma.Decimal);
    expect(found?.codPercentage).toBeInstanceOf(Prisma.Decimal);
    expect(found?.finalPrice.toFixed(2)).toBe('150.00');
    expect(found?.codPercentage.toFixed(4)).toBe('0.0100');
    expect(found?.planId).toBe(7);
  });

  it('refuses a cached quote whose amounts do not survive the round trip', async () => {
    mockRedisGet.mockResolvedValue({
      finalPrice: 'not-a-number',
      codPercentage: '0.01',
      planId: 7,
      codEnabled: true,
      raw: {},
    });

    await expect(cachedDeliveryQuoteCache.get(KEY)).resolves.toBeNull();
  });
});
