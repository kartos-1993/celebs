import type {
  DeliveryDistrict,
  DeliveryLocationsResponse,
  DeliveryProvince,
} from '@celebs/shared-types';

import { prisma } from '@/config/db.prisma';

/**
 * Reads the mirrored delivery locations for the address form.
 *
 * Public by necessity: the form is used by a signed-out visitor building an
 * address, and the data is a list of place names with no customer information
 * in it. It is also deliberately a closed list - only active cities and active
 * zones are returned, so a retired area disappears from the form instead of
 * being offered and then refused at checkout.
 */
export class DeliveryLocationRepository {
  async listLocations(): Promise<DeliveryLocationsResponse> {
    const cities = await prisma.logisticsCity.findMany({
      where: { isActive: true },
      orderBy: [{ province: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        province: true,
        isValley: true,
        freeDeliveryThreshold: true,
        syncedAt: true,
        zones: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
          select: { id: true, name: true },
        },
      },
    });

    const byProvince = new Map<string, DeliveryProvince>();
    let latestSync: Date | null = null;

    for (const city of cities) {
      if (!latestSync || city.syncedAt > latestSync) latestSync = city.syncedAt;

      const district: DeliveryDistrict = {
        id: city.id,
        name: city.name,
        isValley: city.isValley,
        // Decimal rendered as its exact string: the wire type is a string so paisa
        // survives, where a JSON number would round it.
        freeDeliveryThreshold: city.freeDeliveryThreshold.toFixed(2),
        areas: city.zones.map((zone) => ({ id: zone.id, name: zone.name })),
      };

      const province = byProvince.get(city.province) ?? { name: city.province, districts: [] };
      province.districts.push(district);
      byProvince.set(city.province, province);
    }

    return {
      provinces: [...byProvince.values()],
      syncedAt: latestSync?.toISOString() ?? null,
    };
  }
}

export const deliveryLocationRepository = new DeliveryLocationRepository();
