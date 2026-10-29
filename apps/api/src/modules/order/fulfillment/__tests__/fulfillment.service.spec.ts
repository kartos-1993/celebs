import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorCode, HTTPSTATUS } from '@celebs/shared-utils';

import * as ledgerPosting from '../../../finance/ledger/ledger-posting.service';
import type { FulfillmentRepository } from '../fulfillment.repository';
import { FulfillmentService } from '../fulfillment.service';

import type { DeliveryCoverageRepository } from '@/modules/logistics/delivery-coverage.repository';
import type { NotificationService } from '@/modules/notification/notification.service';

vi.mock('../../../finance/ledger/ledger-posting.service', () => ({
  postOrderPlacementEntries: vi.fn().mockResolvedValue([]),
  postOrderCommissionEntries: vi.fn().mockResolvedValue([]),
}));

describe('FulfillmentService Role Boundaries & Delivery Ledger Posting', () => {
  let service: FulfillmentService;
  let mockRepo: Partial<FulfillmentRepository>;
  let mockNotification: Partial<NotificationService>;
  let mockCoverageRepo: Partial<DeliveryCoverageRepository>;

  const mockItem = {
    id: 'item-1',
    orderId: 'order-1',
    inventoryId: 'inv-1',
    quantity: 1,
    itemStatus: 'PENDING',
    order: {
      status: 'CONFIRMED',
      paymentMethod: 'COD',
      address: { logisticsZoneId: 'zone-1' },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockRepo = {
      findVendorOrderItemById: vi.fn().mockResolvedValue(mockItem),
      findOrderItemById: vi.fn().mockResolvedValue(mockItem),
      applyOrderItemStatus: vi.fn().mockResolvedValue({
        updatedItem: { ...mockItem, itemStatus: 'PACKED' },
        newOrderStatus: 'PACKED',
        allDelivered: false,
        isPaid: false,
      }),
    };

    mockNotification = {
      notifyOrderStatus: vi.fn().mockResolvedValue(undefined),
    };

    mockCoverageRepo = {
      coverageForAddress: vi.fn().mockResolvedValue({
        status: 'COVERED',
        cityName: 'Kathmandu',
      }),
    };

    service = new FulfillmentService(
      mockRepo as FulfillmentRepository,
      mockNotification as NotificationService,
      mockCoverageRepo as DeliveryCoverageRepository,
    );
  });

  describe('Vendor Role Boundary Enforcement', () => {
    it('prevents vendors from marking items as DELIVERED', async () => {
      await expect(
        service.updateOrderItemStatus(
          'vendor-1',
          'item-1',
          'DELIVERED',
          undefined,
          undefined,
          false,
        ),
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: HTTPSTATUS.FORBIDDEN,
          errorCode: ErrorCode.FORBIDDEN_ACCESS,
        }),
      );

      expect(mockRepo.applyOrderItemStatus).not.toHaveBeenCalled();
    });

    it('prevents vendors from marking items as HANDED_OVER directly', async () => {
      await expect(
        service.updateOrderItemStatus(
          'vendor-1',
          'item-1',
          'HANDED_OVER',
          undefined,
          undefined,
          false,
        ),
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: HTTPSTATUS.FORBIDDEN,
          errorCode: ErrorCode.FORBIDDEN_ACCESS,
        }),
      );

      expect(mockRepo.applyOrderItemStatus).not.toHaveBeenCalled();
    });

    it('allows vendors to mark items as PACKED', async () => {
      await service.updateOrderItemStatus(
        'vendor-1',
        'item-1',
        'PACKED',
        undefined,
        undefined,
        false,
      );

      expect(mockRepo.applyOrderItemStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          itemStatus: 'PACKED',
          source: 'VENDOR',
        }),
      );
    });

    it('allows vendors to mark out-of-stock items as CANCELLED', async () => {
      await service.updateOrderItemStatus(
        'vendor-1',
        'item-1',
        'CANCELLED',
        undefined,
        undefined,
        false,
      );

      expect(mockRepo.applyOrderItemStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          itemStatus: 'CANCELLED',
          source: 'VENDOR',
        }),
      );
    });
  });

  describe('Platform Admin Handover & Delivery-Driven Finance Posting', () => {
    it('allows platform admin to mark order item as DELIVERED and triggers ledger posting', async () => {
      (
        mockRepo.applyOrderItemStatus as unknown as {
          mockResolvedValueOnce: (val: unknown) => void;
        }
      ).mockResolvedValueOnce({
        updatedItem: { ...mockItem, itemStatus: 'DELIVERED' },
        newOrderStatus: 'DELIVERED',
        allDelivered: true,
        isPaid: true,
      });

      await service.updateOrderItemStatus(
        undefined,
        'item-1',
        'DELIVERED',
        undefined,
        undefined,
        true,
      );

      expect(mockRepo.applyOrderItemStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          itemStatus: 'DELIVERED',
          source: 'PLATFORM',
        }),
      );

      expect(ledgerPosting.postOrderPlacementEntries).toHaveBeenCalledWith({
        orderId: 'order-1',
      });
      expect(ledgerPosting.postOrderCommissionEntries).toHaveBeenCalledWith({
        orderId: 'order-1',
      });
    });
  });
});
