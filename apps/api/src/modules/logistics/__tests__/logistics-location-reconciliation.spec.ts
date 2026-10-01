import { describe, expect, it } from 'vitest';

import {
  type CourierLocationClient,
  LogisticsLocationSyncService,
} from '../logistics-location-sync.service';

import prisma from '@/config/db.prisma';

/**
 * A district seeded from our own reference data and the same district arriving
 * from the courier are two rows for one place. Before reconciliation both stayed
 * active, so the address form offered Kathmandu twice and the seeded copy kept
 * asserting coverage for a district the courier had since described properly.
 */

const fakeCourier = (
  cities: Array<{ id: number; name: string; province?: string }>,
  zonesByCity: Record<number, Array<{ id: number; name: string }>> = {},
): CourierLocationClient => ({
  listCities: async () => cities,
  listZones: async (cityId: number) =>
    (zonesByCity[cityId] ?? []).map((zone) => ({ ...zone, cityId })),
  listAreas: async () => [],
});

const seedBootstrapDistrict = async (name: string, province = 'Bagmati') => {
  const city = await prisma.logisticsCity.create({
    data: { name, province, source: 'BOOTSTRAP', isValley: false },
    select: { id: true },
  });
  const zone = await prisma.logisticsZone.create({
    data: {
      cityId: city.id,
      externalId: -(Math.floor(Math.random() * 1_000_000) + 1),
      name,
    },
    select: { id: true },
  });
  return { cityId: city.id, zoneId: zone.id };
};

const cityActive = (id: string) =>
  prisma.logisticsCity.findUnique({ where: { id }, select: { isActive: true } });

describe('reconciling seeded districts against a courier sync', () => {
  it('retires a seeded district once the courier describes it', async () => {
    const seeded = await seedBootstrapDistrict('Kathmandu');

    await new LogisticsLocationSyncService(
      fakeCourier([{ id: 901, name: 'Kathmandu' }], {
        901: [{ id: 5001, name: 'Kathmandu Valley' }],
      }),
    ).sync();

    expect((await cityActive(seeded.cityId))?.isActive).toBe(false);
  });

  it('matches a seeded district on name regardless of casing or padding', async () => {
    const seeded = await seedBootstrapDistrict('Lalitpur');

    await new LogisticsLocationSyncService(
      fakeCourier([{ id: 902, name: '  lalitpur ' }], { 902: [{ id: 5002, name: 'Lalitpur' }] }),
    ).sync();

    expect((await cityActive(seeded.cityId))?.isActive).toBe(false);
  });

  it('leaves a seeded district active when the courier does not serve it', async () => {
    const seeded = await seedBootstrapDistrict('Ilam');

    await new LogisticsLocationSyncService(
      fakeCourier([{ id: 903, name: 'Kathmandu' }], { 903: [{ id: 5003, name: 'Kathmandu' }] }),
    ).sync();

    expect((await cityActive(seeded.cityId))?.isActive).toBe(true);
  });

  // Retiring a district a live order is addressed to would make that order
  // undeliverable, so it is left alone and reported instead.
  it('keeps a seeded district active while an address still points into it', async () => {
    const seeded = await seedBootstrapDistrict('Bhaktapur');
    const user = await prisma.user.create({
      data: { name: 'Cover', email: `cover-${Date.now()}@example.com`, password: 'Password123!' },
    });
    await prisma.address.create({
      data: {
        userId: user.id,
        fullName: 'Ram Bahadur',
        phone: '9841000000',
        province: 'Bagmati',
        district: 'Bhaktapur',
        cityArea: 'Sallaghari',
        streetAddress: 'Mahendranagar',
        logisticsZoneId: seeded.zoneId,
      },
    });

    const summary = await new LogisticsLocationSyncService(
      fakeCourier([{ id: 904, name: 'Bhaktapur' }], { 904: [{ id: 5004, name: 'Bhaktapur' }] }),
    ).sync();

    expect((await cityActive(seeded.cityId))?.isActive).toBe(true);
    expect(summary.retainedForLiveAddresses).toContain('Bhaktapur');
  });

  it('retires a courier city the courier has dropped from its list', async () => {
    const service = new LogisticsLocationSyncService(
      fakeCourier([{ id: 905, name: 'Pokhara' }], { 905: [{ id: 5005, name: 'Pokhara' }] }),
    );
    await service.sync();

    await new LogisticsLocationSyncService(
      fakeCourier([{ id: 906, name: 'Kathmandu' }], { 906: [{ id: 5006, name: 'Kathmandu' }] }),
    ).sync();

    const dropped = await prisma.logisticsCity.findUnique({
      where: { externalId: 905 },
      select: { isActive: true },
    });
    expect(dropped?.isActive).toBe(false);
  });

  it('retires the zones of a city it retires', async () => {
    await new LogisticsLocationSyncService(
      fakeCourier([{ id: 907, name: 'Butwal' }], { 907: [{ id: 5007, name: 'Butwal' }] }),
    ).sync();

    await new LogisticsLocationSyncService(fakeCourier([])).sync();

    const zone = await prisma.logisticsZone.findUnique({
      where: { externalId: 5007 },
      select: { isActive: true },
    });
    expect(zone?.isActive).toBe(false);
  });

  it('reports what it retired', async () => {
    await seedBootstrapDistrict('Kirtipur');

    const summary = await new LogisticsLocationSyncService(
      fakeCourier([{ id: 908, name: 'Kirtipur' }], { 908: [{ id: 5008, name: 'Kirtipur' }] }),
    ).sync();

    expect(summary.deactivatedCities).toBeGreaterThanOrEqual(1);
  });

  it('reaches the same state when run twice', async () => {
    const client = fakeCourier([{ id: 909, name: 'Kathmandu' }], {
      909: [{ id: 5009, name: 'Kathmandu' }],
    });
    await new LogisticsLocationSyncService(client).sync();
    const second = await new LogisticsLocationSyncService(client).sync();

    expect(second.deactivatedCities).toBe(0);

    const activeCities = await prisma.logisticsCity.count({ where: { isActive: true } });
    expect(activeCities).toBe(1);
  });

  it('reactivates a district the courier starts serving again', async () => {
    const service = new LogisticsLocationSyncService(
      fakeCourier([{ id: 910, name: 'Dharan' }], { 910: [{ id: 5010, name: 'Dharan' }] }),
    );
    await service.sync();
    await new LogisticsLocationSyncService(fakeCourier([])).sync();

    await service.sync();

    const revived = await prisma.logisticsCity.findUnique({
      where: { externalId: 910 },
      select: { isActive: true },
    });
    expect(revived?.isActive).toBe(true);
  });
});
