import { Request, Response } from 'express';

import {
  createShippingRateSchema,
  rateIdParamSchema,
  updateDeliveryCitySchema,
  updateShippingRateSchema,
} from '@celebs/shared-types';
import { asyncHandler } from '@celebs/shared-utils';

import { type ShippingRateService, shippingRateService } from './shipping-rate.service';

import { sendCreated, sendSuccess } from '@/common/utils/response.util';

/**
 * Admin management of the delivery rate card and per-city thresholds.
 *
 * Platform-only: these numbers decide what every customer is charged, so a
 * vendor must not be able to edit them.
 */
export class ShippingRateController {
  constructor(private readonly service: ShippingRateService = shippingRateService) {}

  public listCities = asyncHandler(async (_req: Request, res: Response) => {
    const cities = await this.service.listCities();

    return sendSuccess(res, cities, 'Delivery cities retrieved successfully');
  });

  public listRates = asyncHandler(async (_req: Request, res: Response) => {
    const rates = await this.service.listRates();

    return sendSuccess(res, rates, 'Shipping rates retrieved successfully');
  });

  public createRate = asyncHandler(async (req: Request, res: Response) => {
    const input = createShippingRateSchema.parse(req.body);
    const rate = await this.service.createRate(input);

    return sendCreated(res, rate, 'Shipping rate created successfully');
  });

  public updateRate = asyncHandler(async (req: Request, res: Response) => {
    const { id } = rateIdParamSchema.parse(req.params);
    const input = updateShippingRateSchema.parse(req.body);
    const rate = await this.service.updateRate(id, input);

    return sendSuccess(res, rate, 'Shipping rate updated successfully');
  });

  public deleteRate = asyncHandler(async (req: Request, res: Response) => {
    const { id } = rateIdParamSchema.parse(req.params);
    await this.service.deleteRate(id);

    return sendSuccess(res, { id }, 'Shipping rate deleted successfully');
  });

  public updateCity = asyncHandler(async (req: Request, res: Response) => {
    const { id } = rateIdParamSchema.parse(req.params);
    const input = updateDeliveryCitySchema.parse(req.body);
    const city = await this.service.updateCity(id, input);

    return sendSuccess(res, city, 'Delivery city updated successfully');
  });
}

export const shippingRateController = new ShippingRateController();
