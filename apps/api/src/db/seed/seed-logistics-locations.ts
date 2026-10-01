import prisma from '../../config/db.prisma';
import { logger } from '@celebs/shared-utils';

import {
  isValleyDistrict,
  NEPAL_PROVINCES,
  outsideValleyFreeDeliveryThreshold,
  valleyFreeDeliveryThreshold,
} from './nepal-locations';

/**
 * The external id given to a zone that exists only because our own reference data
 * says so.
 *
 * LogisticsZone.externalId is a single global unique column that also holds the
 * ids the courier issues, and the courier sync upserts on exactly that column. A
 * bootstrap zone has no courier id to store, so it needs a number that:
 *
 *   - is the same in every environment. It is derived from the province and
 *     district names, which are reference data, so a developer, staging and
 *     production all agree on it. Deriving it from the city's generated uuid
 *     instead meant the same district had a different id everywhere.
 *   - cannot be issued by a courier. Couriers number their locations with
 *     non-negative integers, so negative ids are disjoint from theirs by
 *     construction. That also means a sync can never match one of our rows by
 *     external id and quietly adopt or re-parent it.
 *
 * Negative values still fit the column's 32-bit signed integer.
 */
export function syntheticZoneExternalId(province: string, district: string): number {
  const key = `${province.trim().toLowerCase()}|${district.trim().toLowerCase()}`;

  // FNV-1a: a well-distributed 32-bit hash, so 77 districts land in a space of
  // two billion rather than the tens of thousands a short rolling hash offers.
  let hash = 0x811c9dc5;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return -(Math.abs(hash) % 2_000_000_000) - 1;
}

/**
 * Seeds Nepal's delivery areas from our own reference data, so the address form
 * can offer real districts before any courier location list has been synced.
 *
 * Idempotent and deliberately non-destructive: a city that already exists is
 * left exactly as it is. A courier sync owns `isValley`, the free-delivery
 * threshold and `isActive` once it has run, and re-seeding must not undo an
 * admin's corrections or un-retire a district a courier has dropped.
 */
export async function seedLogisticsLocations(): Promise<void> {
  console.log('\n--- 📍 Seeding Delivery Areas (Nepal districts) ---');

  let created = 0;
  let kept = 0;

  for (const province of NEPAL_PROVINCES) {
    const provinceName = province.name;

    for (const district of province.districts) {
      const isValley = isValleyDistrict(district);
      const existing = await prisma.logisticsCity.findFirst({
        where: { name: district, province: provinceName },
        select: { id: true },
      });

      if (existing) {
        kept += 1;
        await ensureDefaultZone(existing.id, provinceName, district);
        continue;
      }

      const city = await prisma.logisticsCity.create({
        data: {
          name: district,
          province: provinceName,
          isValley,
          freeDeliveryThreshold: isValley
            ? valleyFreeDeliveryThreshold
            : outsideValleyFreeDeliveryThreshold,
          source: 'BOOTSTRAP',
        },
        select: { id: true },
      });
      await ensureDefaultZone(city.id, provinceName, district);
      created += 1;
    }
  }

  logger.info({ created, kept }, 'Seeded bootstrap delivery areas from Nepal reference data');
  console.log(`    ✓ ${created} created, ${kept} already present`);
}

/**
 * Gives a bootstrap district a zone so the address form's area step is usable.
 *
 * A courier's own list has many zones per city; our reference data has one per
 * district. That is coarse but honest - a district with a single delivery area is
 * a district we can serve across. Real zones replace it when a courier syncs.
 */
async function ensureDefaultZone(
  cityId: string,
  province: string,
  district: string,
): Promise<void> {
  const existing = await prisma.logisticsZone.findFirst({
    where: { cityId },
    select: { id: true },
  });
  if (existing) return;

  await prisma.logisticsZone.create({
    data: {
      cityId,
      // Synthetic: this zone came from our reference data, not a courier, so it
      // has no courier identifier to hold. The value is derived from the district
      // it serves rather than from a generated row id, so it is stable across
      // environments, and negative so it can never collide with a courier's own.
      externalId: syntheticZoneExternalId(province, district),
      name: district,
    },
  });
}
