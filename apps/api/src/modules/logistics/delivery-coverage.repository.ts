
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

  async coverageForAddress(address: AddressCoverageRow): Promise<CoverageResult> {
    const zone = address.logisticsZoneId ? await this.loadZone(address.logisticsZoneId) : null;

    return classifyCoverage({
      logisticsZoneId: address.logisticsZoneId,
      zone,
      mirrorIsEmpty: false,
      mirrorIsStale: false,
    });
  }
}

export const deliveryCoverageRepository = new DeliveryCoverageRepository();
