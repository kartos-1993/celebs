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
  /** Districts taken out of service by this sync. */
  deactivatedCities: number;
  /**
   * Districts that are superseded or retired but were left in service because a
   * stored address still points into them. Surfaced rather than silently ignored:
   * these orders need their district re-picked before the district can be closed.
   */
  retainedForLiveAddresses: string[];
}

/** Courier naming varies in casing and padding; the district identity does not. */
const normaliseDistrictName = (value: string): string => value.trim().toLowerCase();

export class LogisticsLocationSyncService {
  constructor(private readonly client: CourierLocationClient) {}

  /**
   * Brings the mirror back in line with what the courier currently serves.
   *
   * A sync that only adds is not enough. Two kinds of row go stale: districts we
   * seeded ourselves that the courier has since described properly, and rows the
   * courier has dropped from its list entirely. Left active, the first makes the
   * address form offer one district twice, and the second keeps a place on the
   * delivery list that nobody will collect from.
   *
   * A district is never closed while a stored address still points into one of its
   * zones. That would turn a reconciliation detail into an undeliverable order, so
   * those are left in service and named in the summary for an operator to migrate.
   */
  private async reconcile(
    seenCityExternalIds: number[],
    seenZoneExternalIds: number[],
    servedCityNames: Set<string>,
    syncedAt: Date,
  ): Promise<{ deactivatedCities: number; retainedForLiveAddresses: string[] }> {
    const seenZones = new Set(seenZoneExternalIds);

    const supersededSeeded = await prisma.logisticsCity.findMany({
      where: { source: 'BOOTSTRAP' },
      select: { id: true, name: true, zones: { select: { id: true } } },
    });

    const retiredCourier = await prisma.logisticsCity.findMany({
      where: { source: 'COURIER', isActive: true, externalId: { notIn: [...seenCityExternalIds] } },
      select: { id: true, name: true, zones: { select: { id: true } } },
    });

    const servedCourier = await prisma.logisticsCity.findMany({
      where: { source: 'COURIER', externalId: { in: [...new Set(seenCityExternalIds)] } },
      select: { id: true },
    });
    const servedCourierIds = new Set(servedCourier.map((city) => city.id));

    const retainedForLiveAddresses: string[] = [];
    const closable: Array<{ id: string; name: string; zoneIds: string[] }> = [];

    // A seeded district is superseded when the courier serves a district of the
    // same name. It keeps its rows, so the addresses pointing at them still
    // resolve and can be migrated rather than orphaned.
    for (const city of supersededSeeded) {
      if (servedCityNames.has(normaliseDistrictName(city.name))) {
        closable.push({ ...city, zoneIds: city.zones.map((zone) => zone.id) });
      }
    }

    for (const city of retiredCourier) {
      closable.push({ ...city, zoneIds: city.zones.map((zone) => zone.id) });
    }

    for (const candidate of closable) {
      const liveAddresses = await prisma.address.count({
        where: { logisticsZoneId: { in: candidate.zoneIds } },
      });

      if (liveAddresses > 0) {
        retainedForLiveAddresses.push(candidate.name);
        continue;
      }

      await prisma.$transaction(async (tx) => {
        await tx.logisticsZone.updateMany({
          where: { cityId: candidate.id, isActive: true },
          data: { isActive: false },
        });
        await tx.logisticsCity.update({
          where: { id: candidate.id },
          data: { isActive: false },
        });
      });
    }

    // A zone the courier no longer lists under a city it still serves.
    const staleZones = await prisma.logisticsZone.findMany({
      where: {
        isActive: true,
        externalId: { notIn: [...seenZones] },
        cityId: { in: [...servedCourierIds] },
      },
      select: { id: true },
    });

    if (staleZones.length > 0) {
      const zoneIds = staleZones.map((zone) => zone.id);
      const liveAddresses = await prisma.address.count({
        where: { logisticsZoneId: { in: zoneIds } },
      });

      if (liveAddresses === 0) {
        await prisma.logisticsZone.updateMany({
          where: { id: { in: zoneIds } },
          data: { isActive: false },
        });
      }
    }

    if (retainedForLiveAddresses.length > 0) {
      logger.warn(
        { districts: retainedForLiveAddresses, syncedAt },
        'Kept superseded districts in service because a stored address still uses them',
      );
    }

    return {
      deactivatedCities: closable.length - retainedForLiveAddresses.length,
      retainedForLiveAddresses,
    };
  }

  private async courierServesName(cityName: string): Promise<boolean> {
    const cities = await this.client.listCities();
    const wanted = normaliseDistrictName(cityName);
    return cities.some((city) => normaliseDistrictName(city.name) === wanted);
  }

  async sync(): Promise<SyncSummary> {
    const cities = await this.client.listCities();
    const syncedAt = new Date();

    const seenZoneExternalIds: number[] = [];
    let zoneCount = 0;
    let areaCount = 0;

    for (const city of cities) {
      // A city is created once. On later syncs only the name is refreshed, so an
      // admin's `isValley` correction and the free-delivery threshold they may
      // have tuned survive a sync. A city the courier serves again comes back.
      const record = await prisma.logisticsCity.upsert({
        where: { externalId: city.id },
        update: { name: city.name, syncedAt, isActive: true },
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
          update: { name: zone.name, cityId: record.id, syncedAt, isActive: true },
          create: { externalId: zone.id, name: zone.name, cityId: record.id, syncedAt },
          select: { id: true },
        });
        seenZoneExternalIds.push(zone.id);
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

    const reconciliation = await this.reconcile(
      cities.map((city) => city.id),
      seenZoneExternalIds,
      new Set(cities.map((city) => normaliseDistrictName(city.name))),
      syncedAt,
    );

    logger.info(
      {
        cities: cities.length,
        zones: zoneCount,
        areas: areaCount,
        deactivatedCities: reconciliation.deactivatedCities,
        retainedForLiveAddresses: reconciliation.retainedForLiveAddresses,
      },
      'Synced courier locations',
    );

    return {
      cities: cities.length,
      zones: zoneCount,
      areas: areaCount,
      syncedAt,
      ...reconciliation,
    };
  }
}
