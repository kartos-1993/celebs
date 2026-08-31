import { Request, Response } from 'express';

import { codSettlementSchema, dispatchOrderSchema } from '@celebs/shared-types';
import { asyncHandler, HTTPSTATUS } from '@celebs/shared-utils';

import { type LogisticsService, logisticsService } from './logistics.service';

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

    res.status(HTTPSTATUS.OK).json({
      success: true,
      message: 'Order dispatched successfully',
      data: result,
    });
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

    res.status(HTTPSTATUS.OK).json({
      success: true,
      message: 'COD payment settled successfully',
      data: result,
    });
  });
}

export const logisticsController = new LogisticsController();
