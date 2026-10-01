import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import prisma from '@/config/db.prisma';

import { seedLogisticsLocations } from '../seed-logistics-locations';
import { NEPAL_DISTRICT_COUNT, VALLEY_DISTRICTS } from '../nepal-locations';

/**
 * The seed is what makes the address form usable before a courier sync exists,
 * so its two guarantees are worth pinning against the real database: it produces
 * every district, and running it again changes nothing.
 */

const seededIds: string[] = [];

afterAll(async () => {
  await prisma.logisticsCity.deleteMany({
    where: { id: { in: seededIds }, source: 'BOOTSTRAP' },
  });
});

/**
 * Seeding happens in `beforeEach`, not `beforeAll`: the global test setup
 * truncates every table before each test, so anything seeded earlier is gone by
 * the time the first assertion runs.
 */
describe('seedLogisticsLocations', () => {
  beforeEach(async () => {
    await prisma.logisticsCity.deleteMany({ where: { source: 'BOOTSTRAP' } });
    await seedLogisticsLocations();
    const rows = await prisma.logisticsCity.findMany({
      where: { source: 'BOOTSTRAP' },
      select: { id: true },
    });
    seededIds.push(...rows.map((row) => row.id));
  });

  it('seeds every district', async () => {
    const count = await prisma.logisticsCity.count({ where: { source: 'BOOTSTRAP' } });
    expect(count).toBe(NEPAL_DISTRICT_COUNT);
  });

  // The address form picks a district and then an area within it. A district
  // with no zone offers an empty second step, so the customer is asked to
  // choose a delivery area from a list that has nothing in it.
  it('gives every district a zone the address form can select', async () => {
    const districts = await prisma.logisticsCity.findMany({
      where: { source: 'BOOTSTRAP' },
      select: { id: true, name: true, zones: { where: { isActive: true }, select: { id: true } } },
    });

    const withoutZone = districts.filter((district) => district.zones.length === 0);
    expect(withoutZone.map((district) => district.name)).toEqual([]);
  });

  it('does not give a district a second zone when re-run', async () => {
    await seedLogisticsLocations();

    const district = await prisma.logisticsCity.findFirst({
      where: { source: 'BOOTSTRAP' },
      select: { zones: { select: { id: true } } },
    });
    expect(district?.zones.length).toBe(1);
  });

  it('gives the valley a lower free-delivery threshold than the rest', async () => {
    const kathmandu = await prisma.logisticsCity.findFirst({
      where: { name: 'Kathmandu' },
      select: { isValley: true, freeDeliveryThreshold: true },
    });
    const outsideValley = await prisma.logisticsCity.findFirst({
      where: { name: 'Morang' },
      select: { isValley: true, freeDeliveryThreshold: true },
    });

    expect(kathmandu?.isValley).toBe(true);
    expect(Number(kathmandu?.freeDeliveryThreshold)).toBe(2500);
    expect(outsideValley?.isValley).toBe(false);
    expect(Number(outsideValley?.freeDeliveryThreshold)).toBe(5000);
  });

  it('classifies exactly the three valley districts', async () => {
    const valley = await prisma.logisticsCity.findMany({
      where: { source: 'BOOTSTRAP', isValley: true },
      select: { name: true },
    });
    expect(valley.map((row) => row.name).sort()).toEqual([...VALLEY_DISTRICTS].sort());
  });

  it('records every district as our own reference data, not a courier feed', async () => {
    const courierSourced = await prisma.logisticsCity.count({
      where: { source: 'BOOTSTRAP', externalId: { not: null } },
    });
    expect(courierSourced).toBe(0);
  });

  it('is idempotent and does not overwrite an admin correction', async () => {
    const kathmandu = await prisma.logisticsCity.findFirst({ where: { name: 'Kathmandu' } });
    if (!kathmandu) throw new Error('Kathmandu was not seeded');

    // Simulate an admin retuning the valley threshold, then re-running the seed.
    await prisma.logisticsCity.update({
      where: { id: kathmandu.id },
      data: { freeDeliveryThreshold: 9999 },
    });

    await seedLogisticsLocations();

    const after = await prisma.logisticsCity.findUnique({
      where: { id: kathmandu.id },
      select: { freeDeliveryThreshold: true },
    });
    expect(Number(after?.freeDeliveryThreshold)).toBe(9999);

    // Restore so the count assertions above stay meaningful.
    await prisma.logisticsCity.update({
      where: { id: kathmandu.id },
      data: { freeDeliveryThreshold: 2500 },
    });
  });
});
