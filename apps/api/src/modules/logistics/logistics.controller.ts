import { Request, Response } from 'express';

import { codSettlementSchema, dispatchOrderSchema } from '@celebs/shared-types';
import { asyncHandler } from '@celebs/shared-utils';

import {
  type DeliveryLocationRepository,
  deliveryLocationRepository,
} from './delivery-location.repository';
import { type LogisticsService, logisticsService } from './logistics.service';

import { sendSuccess } from '@/common/utils/response.util';

export class LogisticsController {
  private service: LogisticsService;

  constructor(
    service: LogisticsService = logisticsService,
    private readonly locationRepo: DeliveryLocationRepository = deliveryLocationRepository,
  ) {
    this.service = service;
  }

  /**
   * Delivery provinces, districts and areas for the address form.
   *
   * Unauthenticated on purpose: a customer chooses where they live before they
   * have an account, and the payload is place names only.
   */
  public listDeliveryLocations = asyncHandler(async (_req: Request, res: Response) => {
    const locations = await this.locationRepo.listLocations();

    return sendSuccess(res, locations, 'Delivery locations retrieved successfully');
  });

  public dispatchOrder = asyncHandler(async (req: Request, res: Response) => {
    const { orderId } = req.params;
    const validated = dispatchOrderSchema.parse({
      orderId,
      provider: req.body.provider || 'NEPAL_CAN_MOVE',
      ...req.body,
    });

    // Sellers: req.store.id, Platform: null → repository enforces vendorId scoping
    const actorStoreId = req.store?.id ?? null;
    const result = await this.service.dispatchOrder(validated, actorStoreId);

    return sendSuccess(res, result, 'Order dispatched successfully');
  });

  public settleCod = asyncHandler(async (req: Request, res: Response) => {
    const { orderId } = req.params;
    const validated = codSettlementSchema.parse({
      orderId,
      settlementReference: req.body.reference || req.body.settlementReference,
    });

    const result = await this.service.markCodSettled(
      validated.orderId,
      validated.settlementReference,
    );

    return sendSuccess(res, result, 'COD payment settled successfully');
  });

  public handleCourierWebhook = asyncHandler(async (req: Request, res: Response) => {
    const trackingNumber = req.body.trackingNumber || req.body.waybillNumber || req.body.waybillId;
    const status = req.body.status || req.body.event;

    if (!trackingNumber) {
      return res.status(400).json({
        success: false,
        message: 'Tracking or waybill number is required',
      });
    }

    const result = await this.service.processCourierWebhook({
      trackingNumber: String(trackingNumber),
      status: status || 'HANDED_OVER',
      title: req.body.title,
      description: req.body.description,
      location: req.body.location,
    });

    return sendSuccess(res, result, 'Courier tracking event processed successfully');
  });
}

export const logisticsController = new LogisticsController();
