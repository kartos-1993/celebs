import prisma from '../../config/db.prisma';

/** Synthetic external id for zones that come from our own reference data. */
const BOOTSTRAP_ZONE_EXTERNAL_ID = 900_000;
import { logger } from '@celebs/shared-utils';

import {
  isValleyDistrict,
  NEPAL_PROVINCES,
  outsideValleyFreeDeliveryThreshold,
  valleyFreeDeliveryThreshold,
} from './nepal-locations';

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
        await ensureDefaultZone(existing.id, district);
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
      await ensureDefaultZone(city.id, district);
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
async function ensureDefaultZone(cityId: string, district: string): Promise<void> {
  const existing = await prisma.logisticsZone.findFirst({
    where: { cityId },
    select: { id: true },
  });
  if (existing) return;

  await prisma.logisticsZone.create({
    data: {
      cityId,
      // Synthetic: this zone came from our reference data, not a courier, so it
      // has no courier identifier to hold. The column is unique per row and no
      // two zones in a city share a courier id anyway, so uniqueness is scoped by
      // the caller's own city.
      externalId: BOOTSTRAP_ZONE_EXTERNAL_ID + hashCityId(cityId),
      name: district,
    },
  });
}

/** Deterministic small offset so every district's synthetic zone id is distinct. */
function hashCityId(cityId: string): number {
  let hash = 0;
  for (let index = 0; index < cityId.length; index += 1) {
    hash = (hash * 31 + cityId.charCodeAt(index)) % 900_000;
  }
  return hash;
}
