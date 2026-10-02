import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PathaoLocationClient } from '../pathao-location.client';
import { PathaoTokenProvider } from '../pathao-token.provider';

/**
 * The three location reads a courier sync is built from. They feed a
 * reconciliation that retires districts, so the difference between "this city has
 * no zones" and "this response was not shaped the way we expect" matters more
 * than any other behaviour here: the first is a fact, the second would silently
 * retire every zone the courier actually serves.
 */

const BASE = 'https://courier-api-sandbox.pathao.com';

const cityListPayload = {
  message: 'City successfully fetched.',
  type: 'success',
  code: 200,
  data: {
    data: [
      { city_id: 138, city_name: 'Aadarshnagar (Birgunj)' },
      { city_id: 181, city_name: 'Adarshanagar (Chitwan)' },
    ],
  },
};

const zoneListPayload = (zones: Array<{ zone_id: number; zone_name: string }>) => ({
  message: 'Zone list fetched.',
  type: 'success',
  code: 200,
  data: { data: zones },
});

const areaListPayload = (
  areas: Array<{ area_id: number; area_name: string; home_delivery_available: boolean }>,
) => ({
  message: 'Area list fetched.',
  type: 'success',
  code: 200,
  data: { data: areas },
});

/** Answers by URL so one fetch mock can serve all three endpoints. */
const routingFetch = (
  routes: Record<string, unknown>,
  options: { status?: number; raw?: string } = {},
) => {
  const calls: Array<{ url: string; headers: Record<string, string> }> = [];

  const impl = vi.fn(async (input: string, init: RequestInit = {}) => {
    const url = String(input);
    calls.push({
      url,
      headers: Object.fromEntries(
        Object.entries((init.headers ?? {}) as Record<string, string>).map(([k, v]) => [
          k.toLowerCase(),
          v,
        ]),
      ),
    });
    const key = Object.keys(routes).find((pattern) => url.includes(pattern));

    if (!key) {
      return new Response(JSON.stringify({ message: 'not found' }), { status: 404 });
    }

    return new Response(options.raw ?? JSON.stringify(routes[key]), {
      status: options.status ?? 200,
    });
  });

  return { impl: impl as unknown as typeof fetch, calls };
};

const tokenProvider = () =>
  ({ getToken: async () => 'ACCESS-TOKEN-1' }) as unknown as PathaoTokenProvider;

describe('PathaoLocationClient', () => {
  let calls: Array<{ url: string; headers: Record<string, string> }>;

  const clientFor = (
    routes: Record<string, unknown>,
    options?: { status?: number; raw?: string },
  ) => {
    const routed = routingFetch(routes, options);
    calls = routed.calls;
    return new PathaoLocationClient(tokenProvider(), routed.impl, BASE);
  };

  beforeEach(() => {
    calls = [];
  });

  describe('listCities', () => {
    it('reads the cities Pathao serves', async () => {
      const client = clientFor({ 'city-list': cityListPayload });

      const cities = await client.listCities();

      expect(cities).toEqual([
        { id: 138, name: 'Aadarshnagar (Birgunj)', province: '' },
        { id: 181, name: 'Adarshanagar (Chitwan)', province: '' },
      ]);
    });

    it('asks Pathao for its city list', async () => {
      const client = clientFor({ 'city-list': cityListPayload });

      await client.listCities();

      expect(calls[0]?.url).toBe(`${BASE}/aladdin/api/v1/city-list`);
    });

    it('authenticates the request with the access token', async () => {
      const client = clientFor({ 'city-list': cityListPayload });

      await client.listCities();

      expect(calls[0]?.headers.authorization).toBe('Bearer ACCESS-TOKEN-1');
    });

    it('reports an empty country rather than failing when Pathao lists no cities', async () => {
      const client = clientFor({ 'city-list': { type: 'success', code: 200, data: { data: [] } } });

      await expect(client.listCities()).resolves.toEqual([]);
    });
  });

  describe('listZones', () => {
    it('reads the zones inside a city', async () => {
      const client = clientFor({
        'zone-list': zoneListPayload([
          { zone_id: 1647, zone_name: 'Aarubari' },
          { zone_id: 1389, zone_name: 'Airport Area' },
        ]),
      });

      const zones = await client.listZones(138);

      expect(zones).toEqual([
        { id: 1647, cityId: 138, name: 'Aarubari' },
        { id: 1389, cityId: 138, name: 'Airport Area' },
      ]);
    });

    it('asks for the zones of the city it was given', async () => {
      const client = clientFor({ 'zone-list': zoneListPayload([]) });

      await client.listZones(181);

      expect(calls[0]?.url).toBe(`${BASE}/aladdin/api/v1/cities/181/zone-list`);
    });
  });

  describe('listAreas', () => {
    it('reads the areas inside a zone', async () => {
      const client = clientFor({
        'area-list': areaListPayload([
          { area_id: 23983, area_name: 'Bhrikutimandap', home_delivery_available: false },
        ]),
      });

      const areas = await client.listAreas(1647);

      expect(areas).toEqual([{ id: 23983, zoneId: 1647, name: 'Bhrikutimandap' }]);
    });

    it('asks for the areas of the zone it was given', async () => {
      const client = clientFor({ 'area-list': areaListPayload([]) });

      await client.listAreas(1647);

      expect(calls[0]?.url).toBe(`${BASE}/aladdin/api/v1/zones/1647/area-list`);
    });
  });

  describe('when Pathao answers with something unexpected', () => {
    // The reconciliation retires zones the courier no longer lists. Treating a
    // broken payload as an empty list would therefore retire real coverage.
    it('refuses to read a missing list as an empty one', async () => {
      const client = clientFor({ 'zone-list': { type: 'success', code: 200 } });

      await expect(client.listZones(138)).rejects.toThrow(/zone-list/);
    });

    it('refuses a payload whose entries are not shaped like a zone', async () => {
      const client = clientFor({ 'zone-list': { data: { data: [{ nope: true }] } } });

      await expect(client.listZones(138)).rejects.toThrow(/zone-list/);
    });

    it('refuses a list that is not an array at all', async () => {
      const client = clientFor({ 'city-list': { data: { data: { city_id: 1 } } } });

      await expect(client.listCities()).rejects.toThrow(/city-list/);
    });

    it('surfaces the error the courier actually returned', async () => {
      const client = clientFor(
        { 'city-list': { message: 'Invalid token', type: 'error', code: 401 } },
        { status: 401 },
      );

      await expect(client.listCities()).rejects.toThrow(/Invalid token/);
    });

    it('refuses a body that is not JSON at all', async () => {
      const client = clientFor({}, { raw: '<html>gateway timeout</html>' });

      await expect(client.listCities()).rejects.toThrow(/city-list/);
    });
  });
});
