import { logger } from '@celebs/shared-utils';

import { prisma } from '@/config/db.prisma';

/**
 * Mirrors the courier's city / zone / area lists locally.
 *
 * Why mirror rather than call live: the address form needs the list to offer the
 * customer a district we actually deliver to, and an address form that fails
 * open to free text is what produced undeliverable addresses in the first place.
 * A local mirror also means an address is entered at full speed rather than
 * behind a courier round trip.
 *
 * Valley classification drives the free-delivery threshold, so it is a field we
 * hold. It is seeded from the city name and then left alone: a later sync must
 * not silently reclassify a city an admin has deliberately corrected.
 */

export interface ExternalCity {
  id: number;
  name: string;
  /** Optional: a courier's own taxonomy may not map cleanly onto ours. */
  province?: string;
}

export interface ExternalZone {
  id: number;
  cityId: number;
  name: string;
}

export interface ExternalArea {
  id: number;
  zoneId: number;
  name: string;
}

export interface CourierLocationClient {
  listCities(): Promise<ExternalCity[]>;
  listZones(cityId: number): Promise<ExternalZone[]>;
  listAreas(zoneId: number): Promise<ExternalArea[]>;
}

/**
 * Cities inside the Kathmandu Valley. Matched loosely because courier naming is
 * inconsistent about suffixes and casing ("Kathmandu", "KTM", "Kathmandu Valley").
 */
const VALLEY_CITY_PATTERNS = [/^kathmandu$/i, /^ktm$/i, /^lalitpur/i, /^bhaktapur/i, /^kirtipur/i];

export function isValleyCityName(cityName: string): boolean {
  const trimmed = cityName.trim();
  return VALLEY_CITY_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export interface SyncSummary {
  cities: number;
  zones: number;
  areas: number;
  syncedAt: Date;
}

export class LogisticsLocationSyncService {
  constructor(private readonly client: CourierLocationClient) {}

  async sync(): Promise<SyncSummary> {
    const cities = await this.client.listCities();
    const syncedAt = new Date();

    let zoneCount = 0;
    let areaCount = 0;

    for (const city of cities) {
      // A city is created once. On later syncs only the name is refreshed, so an
      // admin's `isValley` correction and the free-delivery threshold they may
      // have tuned survive a sync.
      const record = await prisma.logisticsCity.upsert({
        where: { externalId: city.id },
        update: { name: city.name, syncedAt },
        create: {
          externalId: city.id,
          name: city.name,
          province: city.province ?? '',
          isValley: isValleyCityName(city.name),
          source: 'COURIER',
          syncedAt,
        },
        select: { id: true },
      });

      const zones = await this.client.listZones(city.id);

      for (const zone of zones) {
        const zoneRecord = await prisma.logisticsZone.upsert({
          where: { externalId: zone.id },
          update: { name: zone.name, cityId: record.id, syncedAt },
          create: { externalId: zone.id, name: zone.name, cityId: record.id, syncedAt },
          select: { id: true },
        });
        zoneCount += 1;

        const areas = await this.client.listAreas(zone.id);
        for (const area of areas) {
          await prisma.logisticsArea.upsert({
            where: { externalId: area.id },
            update: { name: area.name, zoneId: zoneRecord.id, syncedAt },
            create: { externalId: area.id, name: area.name, zoneId: zoneRecord.id, syncedAt },
          });
          areaCount += 1;
        }
      }
    }

    logger.info(
      { cities: cities.length, zones: zoneCount, areas: areaCount },
      'Synced courier locations',
    );

    return { cities: cities.length, zones: zoneCount, areas: areaCount, syncedAt };
  }
}
