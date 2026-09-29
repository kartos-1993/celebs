import prisma from '../../config/db.prisma';
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
        continue;
      }

      await prisma.logisticsCity.create({
        data: {
          name: district,
          province: provinceName,
          isValley,
          freeDeliveryThreshold: isValley
            ? valleyFreeDeliveryThreshold
            : outsideValleyFreeDeliveryThreshold,
          source: 'BOOTSTRAP',
        },
      });
      created += 1;
    }
  }

  logger.info({ created, kept }, 'Seeded bootstrap delivery areas from Nepal reference data');
  console.log(`    ✓ ${created} created, ${kept} already present`);
}
