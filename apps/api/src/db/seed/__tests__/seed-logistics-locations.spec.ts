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
    expect(kathmandu?.freeDeliveryThreshold).toBe(2500);
    expect(outsideValley?.isValley).toBe(false);
    expect(outsideValley?.freeDeliveryThreshold).toBe(5000);
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
    expect(after?.freeDeliveryThreshold).toBe(9999);

    // Restore so the count assertions above stay meaningful.
    await prisma.logisticsCity.update({
      where: { id: kathmandu.id },
      data: { freeDeliveryThreshold: 2500 },
    });
  });
});
