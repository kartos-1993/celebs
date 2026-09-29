import { logger } from '@celebs/shared-utils';

import { classifyCoverage, type CoverageResult, type CoverageZone } from './delivery-coverage';

import { prisma } from '@/config/db.prisma';

/**
 * Reads delivery coverage for an address, backed by the mirrored courier
 * location list.
 *
 * The staleness rule matters more than it looks. A mirror that has not been
 * refreshed recently cannot be trusted to assert that a zone is *still* served,
 * so it is treated as "we cannot tell" rather than "covered". Serving a stale
 * "covered" is how a parcel ends up with a courier who no longer runs that route.
 */

/** Beyond this the mirror is treated as untrustworthy. */
export const LOCATION_MIRROR_STALE_MS = 7 * 24 * 60 * 60 * 1000;

export interface AddressCoverageRow {
  logisticsZoneId: string | null;
}

export class DeliveryCoverageRepository {
  private async loadZone(zoneId: string): Promise<CoverageZone | null> {
    const zone = await prisma.logisticsZone.findUnique({
      where: { id: zoneId },
      select: {
        id: true,
        name: true,
        isActive: true,
        city: { select: { id: true, name: true, isValley: true, isActive: true } },
      },
    });
    return zone;
  }

  private async mirrorHealth(): Promise<{ isEmpty: boolean; isStale: boolean }> {
    const latest = await prisma.logisticsCity.findFirst({
      orderBy: { syncedAt: 'desc' },
      select: { syncedAt: true },
    });

    if (!latest) return { isEmpty: true, isStale: false };

    return {
      isEmpty: false,
      isStale: Date.now() - latest.syncedAt.getTime() > LOCATION_MIRROR_STALE_MS,
    };
  }

  async coverageForAddress(address: AddressCoverageRow): Promise<CoverageResult> {
    const [{ isEmpty, isStale }, zone] = await Promise.all([
      this.mirrorHealth(),
      address.logisticsZoneId ? this.loadZone(address.logisticsZoneId) : Promise.resolve(null),
    ]);

    if (isStale) {
      logger.warn(
        { syncedBefore: LOCATION_MIRROR_STALE_MS },
        'Courier location mirror is stale; coverage cannot be confirmed',
      );
    }

    return classifyCoverage({
      logisticsZoneId: address.logisticsZoneId,
      zone,
      mirrorIsEmpty: isEmpty,
      mirrorIsStale: isStale,
    });
  }
}

export const deliveryCoverageRepository = new DeliveryCoverageRepository();
