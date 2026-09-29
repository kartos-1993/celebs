import { prisma } from '@/config/db.prisma';
import { Prisma } from '@/config/db.prisma';

/**
 * The free-delivery threshold for a destination, and the cost of waiving it.
 *
 * The threshold is per delivery city because delivery inside the Kathmandu Valley
 * costs the courier far less than delivery to Biratnagar, so one platform-wide
 * number would either over-promise in the valley or overcharge everywhere else.
 */

export interface DeliveryZonePricing {
  cityId: string | null;
  zoneId: string | null;
  cityName: string | null;
  isValley: boolean;
  freeDeliveryThreshold: number;
  absorbedCost: number;
}

/**
 * Used when the destination is not known yet, or could not be resolved.
 *
 * Deliberately the *higher* of the two thresholds. A cart that does not yet know
 * where it is going must not advertise a free-delivery promise the server would
 * then decline to honour - that is the same class of bug as the app promising
 * free delivery and the checkout charging for it.
 */
export const UNRESOLVED_FREE_DELIVERY_THRESHOLD = 5000;

export class DeliveryPricingRepository {
  /**
   * Resolves the threshold for an address's courier zone.
   *
   * Returns the conservative threshold when the zone is missing, which is the
   * honest answer: we do not know the destination yet.
   */
  async thresholdForAddress(address: {
    logisticsZoneId: string | null;
  }): Promise<DeliveryZonePricing> {
    const unresolved: DeliveryZonePricing = {
      cityId: null,
      zoneId: null,
      cityName: null,
      isValley: false,
      freeDeliveryThreshold: UNRESOLVED_FREE_DELIVERY_THRESHOLD,
      absorbedCost: 0,
    };

    if (!address.logisticsZoneId) return unresolved;

    const zone = await prisma.logisticsZone.findUnique({
      where: { id: address.logisticsZoneId },
      select: {
        id: true,
        name: true,
        isActive: true,
        city: {
          select: {
            id: true,
            name: true,
            isValley: true,
            isActive: true,
            freeDeliveryThreshold: true,
          },
        },
      },
    });

    if (!zone || !zone.isActive || !zone.city.isActive) return unresolved;

    return {
      cityId: zone.city.id,
      zoneId: zone.id,
      cityName: zone.city.name,
      isValley: zone.city.isValley,
      freeDeliveryThreshold: zone.city.freeDeliveryThreshold,
      absorbedCost: 0,
    };
  }

  /** Active rate bands, most specific first is resolved by the caller. */
  async activeRates(cityId: string | null): Promise<
    Array<{
      id: string;
      cityId: string | null;
      minWeightKg: number;
      maxWeightKg: number;
      fee: number;
      codFee: number;
      isActive: boolean;
    }>
  > {
    const rows = await prisma.shippingRate.findMany({
      where: { isActive: true, OR: [{ cityId: null }, ...(cityId ? [{ cityId }] : [])] },
      orderBy: { minWeightKg: 'asc' },
      select: {
        id: true,
        cityId: true,
        minWeightKg: true,
        maxWeightKg: true,
        fee: true,
        codFee: true,
        isActive: true,
      },
    });

    return rows.map((row) => ({
      id: row.id,
      cityId: row.cityId,
      minWeightKg: Number(row.minWeightKg),
      maxWeightKg: Number(row.maxWeightKg),
      fee: Number(new Prisma.Decimal(row.fee)),
      codFee: Number(new Prisma.Decimal(row.codFee)),
      isActive: row.isActive,
    }));
  }
}

export const deliveryPricingRepository = new DeliveryPricingRepository();
