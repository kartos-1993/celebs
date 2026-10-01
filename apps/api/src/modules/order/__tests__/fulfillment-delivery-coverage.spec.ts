import { OrderStatus, PaymentMethod } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';

import type { CoverageResult, CoverageStatus } from '../../logistics/delivery-coverage';
import type { DeliveryCoverageRepository } from '../../logistics/delivery-coverage.repository';
import { FulfillmentRepository } from '../fulfillment/fulfillment.repository';
import { FulfillmentService } from '../fulfillment/fulfillment.service';

/**
 * A seller marking an item HANDED_OVER is the same real-world act as a dispatch:
 * the parcel leaves for the customer. It used to write the order to HANDED_OVER
 * with a tracking number without ever asking whether we deliver to the address,
 * which is the one question a retired zone answers no to.
 */
const createItem = (logisticsZoneId: string | null) =>
  ({
    id: 'item-1',
    orderId: 'order-1',
    inventoryId: 'inv-1',
    quantity: 1,
    vendorId: 'vendor-1',
    itemStatus: 'PACKED',
    order: {
      id: 'order-1',
      status: OrderStatus.PACKED,
      paymentMethod: PaymentMethod.COD,
      address: { logisticsZoneId },
    },
  }) as never;

const coverageReturning = (status: CoverageStatus, cityName: string | null = null) =>
  ({
    coverageForAddress: async () => ({ status, cityName }) as CoverageResult,
  }) as Partial<DeliveryCoverageRepository>;

const buildService = (status: CoverageStatus, cityName: string | null = null) => {
  const applyOrderItemStatus = vi.fn(async () => ({
    itemId: 'item-1',
    orderStatus: OrderStatus.HANDED_OVER,
  }));

  const repo = {
    findVendorOrderItemById: async () => createItem('zone-1'),
    findOrderItemById: async () => createItem('zone-1'),
    applyOrderItemStatus,
  } as unknown as FulfillmentRepository;

  return {
    service: new FulfillmentService(repo, undefined, coverageReturning(status, cityName)),
    applyOrderItemStatus,
  };
};

describe('delivery coverage on a seller handover', () => {
  it('refuses to hand over to an area the courier does not deliver to', async () => {
    const { service, applyOrderItemStatus } = buildService('UNCOVERED', 'Ilam');

    await expect(
      service.updateOrderItemStatus('vendor-1', 'item-1', 'HANDED_OVER', 'TRK-1', 'Nepal Can Move'),
    ).rejects.toThrow(/Ilam/);

    expect(applyOrderItemStatus).not.toHaveBeenCalled();
  });

  it('leaves the order untouched when it refuses the handover', async () => {
    const { service, applyOrderItemStatus } = buildService('UNCOVERED', 'Ilam');

    await expect(
      service.updateOrderItemStatus('vendor-1', 'item-1', 'HANDED_OVER', 'TRK-1', 'Nepal Can Move'),
    ).rejects.toThrow();

    expect(applyOrderItemStatus).not.toHaveBeenCalled();
  });

  // The seller is holding the parcel, so an empty or stale mirror on our side is
  // not a reason to stop them.
  it('allows the handover when coverage is merely unverified', async () => {
    const { service, applyOrderItemStatus } = buildService('UNVERIFIED');

    await service.updateOrderItemStatus(
      'vendor-1',
      'item-1',
      'HANDED_OVER',
      'TRK-1',
      'Nepal Can Move',
    );

    expect(applyOrderItemStatus).toHaveBeenCalledOnce();
  });

  it('allows the handover when the address is covered', async () => {
    const { service, applyOrderItemStatus } = buildService('COVERED');

    await service.updateOrderItemStatus(
      'vendor-1',
      'item-1',
      'HANDED_OVER',
      'TRK-1',
      'Nepal Can Move',
    );

    expect(applyOrderItemStatus).toHaveBeenCalledOnce();
  });

  // Only the handover creates the expectation of delivery. Packing a box is a
  // warehouse action and must keep working even where we no longer deliver.
  it.each(['PENDING', 'PACKED', 'DELIVERED', 'CANCELLED'] as const)(
    'does not consult coverage for the %s transition',
    async (nextStatus) => {
      const { service, applyOrderItemStatus } = buildService('UNCOVERED', 'Ilam');

      await service.updateOrderItemStatus(
        'vendor-1',
        'item-1',
        nextStatus,
        'TRK-1',
        'Nepal Can Move',
      );

      expect(applyOrderItemStatus).toHaveBeenCalledOnce();
    },
  );

  it('allows the handover for an address created before the district picker existed', async () => {
    const applyOrderItemStatus = vi.fn(async () => ({
      itemId: 'item-1',
      orderStatus: OrderStatus.HANDED_OVER,
    }));
    const repo = {
      findVendorOrderItemById: async () => createItem(null),
      applyOrderItemStatus,
    } as unknown as FulfillmentRepository;

    const service = new FulfillmentService(repo);

    await service.updateOrderItemStatus(
      'vendor-1',
      'item-1',
      'HANDED_OVER',
      'TRK-1',
      'Nepal Can Move',
    );

    expect(applyOrderItemStatus).toHaveBeenCalledOnce();
  });
});
