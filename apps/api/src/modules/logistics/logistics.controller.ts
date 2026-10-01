import { Request, Response } from 'express';

import {
  codSettlementSchema,
  courierWebhookSchema,
  dispatchOrderSchema,
} from '@celebs/shared-types';
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
    // Validated rather than hand-checked, so a missing waybill number is refused
    // through the standard path and answered with the shared error envelope.
    const body = courierWebhookSchema.parse(req.body);
    const trackingNumber = body.trackingNumber ?? body.waybillNumber ?? body.waybillId;

    const result = await this.service.processCourierWebhook({
      trackingNumber: String(trackingNumber),
      status: body.status ?? body.event ?? 'HANDED_OVER',
      title: body.title,
      description: body.description,
      location: body.location,
    });

    return sendSuccess(res, result, 'Courier tracking event processed successfully');
  });
}

export const logisticsController = new LogisticsController();
