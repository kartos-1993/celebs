import { Request, Response } from 'express';

import { codSettlementSchema, dispatchOrderSchema } from '@celebs/shared-types';
import { asyncHandler } from '@celebs/shared-utils';

import { type LogisticsService, logisticsService } from './logistics.service';

import { sendSuccess } from '@/common/utils/response.util';

export class LogisticsController {
  private service: LogisticsService;

  constructor(service: LogisticsService = logisticsService) {
    this.service = service;
  }

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
}

export const logisticsController = new LogisticsController();
