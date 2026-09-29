import prisma from '@/config/db.prisma';

/**
 * A delivery city + zone for tests to attach to an address.
 *
 * Checkout and dispatch both refuse an address whose delivery coverage they
 * cannot confirm, so a fixture address that carries no zone is not a valid
 * starting point any more - it describes an order the system is right to
 * reject. Tests that build an address need a real zone on it.
 *
 * Created inline rather than seeded: the shared test setup truncates every table
 * before each test, so anything seeded earlier is gone by the first assertion.
 */
export async function createDeliverableZone(
  overrides: { cityName?: string; zoneName?: string; isValley?: boolean } = {},
): Promise<{ cityId: string; zoneId: string }> {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const city = await prisma.logisticsCity.create({
    data: {
      name: overrides.cityName ?? `Test City ${stamp}`,
      province: 'Bagmati',
      isValley: overrides.isValley ?? true,
      freeDeliveryThreshold: 2500,
      source: 'BOOTSTRAP',
    },
    select: { id: true },
  });

  const zone = await prisma.logisticsZone.create({
    data: {
      cityId: city.id,
      externalId: Math.floor(Math.random() * 900000) + 100000,
      name: overrides.zoneName ?? `Test Zone ${stamp}`,
    },
    select: { id: true },
  });

  return { cityId: city.id, zoneId: zone.id };
}
