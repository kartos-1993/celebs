import { faker } from '@faker-js/faker';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { backfillAddressZones } from '../backfill-address-zones';

import prisma from '@/config/db.prisma';
import { seedLogisticsLocations } from '@/db/seed/seed-logistics-locations';

/**
 * The mocked unit tests above prove the matching rule. This one proves the rule
 * survives contact with the real schema and the real district names we ship,
 * which is the part a mock cannot check: a renamed column or a district spelled
 * differently in the seed than in the reference data would quietly leave every
 * address unmatched.
 */
describe('backfillAddressZones against the seeded reference data', () => {
  let userId: string;

  const createAddress = async (province: string, district: string) => {
    const address = await prisma.address.create({
      data: {
        userId,
        label: 'Home',
        fullName: faker.person.fullName(),
        phone: '9800000000',
        province,
        district,
        cityArea: 'Somewhere',
        streetAddress: faker.location.streetAddress(),
        isDefault: false,
      },
    });
    return address;
  };

  beforeEach(async () => {
    // The global setup truncates every table before each test, so the bootstrap
    // seed has to run here rather than in beforeAll.
    await seedLogisticsLocations();
    const user = await prisma.user.create({
      data: {
        email: faker.internet.email().toLowerCase(),
        password: 'hashed',
        name: faker.person.fullName(),
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await prisma.address.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  });

  it('fills the zone for a real district and leaves an unknown one for re-pick', async () => {
    const exact = await createAddress('Bagmati', 'Kathmandu');
    const whitespace = await createAddress(' Bagmati ', 'Lalitpur ');
    const unknown = await createAddress('Bagmati', 'Not A District');

    const result = await backfillAddressZones({ apply: true });

    expect(result.applied).toBe(2);
    expect(result.unmatched).toEqual([unknown.id]);

    const expectedZone = await prisma.logisticsZone.findFirst({
      where: { city: { name: 'Kathmandu', province: 'Bagmati' } },
      select: { id: true },
    });

    const reloadedExact = await prisma.address.findUniqueOrThrow({ where: { id: exact.id } });
    const reloadedWhitespace = await prisma.address.findUniqueOrThrow({
      where: { id: whitespace.id },
    });
    const reloadedUnknown = await prisma.address.findUniqueOrThrow({ where: { id: unknown.id } });

    expect(reloadedExact.logisticsZoneId).toBe(expectedZone?.id);
    expect(reloadedWhitespace.logisticsZoneId).not.toBeNull();
    expect(reloadedUnknown.logisticsZoneId).toBeNull();
  });

  it('is safe to run twice', async () => {
    await createAddress('Bagmati', 'Kathmandu');

    await backfillAddressZones({ apply: true });
    const second = await backfillAddressZones({ apply: true });

    // The second run has nothing left to do, so it changes nothing rather than
    // re-reporting the same addresses as matched.
    expect(second.applied).toBe(0);
    expect(second.matched).toEqual([]);
  });
});
