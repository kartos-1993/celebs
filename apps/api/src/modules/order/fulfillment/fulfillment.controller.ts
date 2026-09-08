import { Request, Response } from 'express';

import { updateOrderItemStatusSchema } from '@celebs/shared-types';
import { ErrorCode, ForbiddenException } from '@celebs/shared-utils';

import { FulfillmentService,fulfillmentService } from './fulfillment.service';

import { isPlatformActor } from '@/common/context/actor-context';
import { sendSuccess } from '@/common/utils/response.util';

export class FulfillmentController {
  constructor(private service: FulfillmentService = fulfillmentService) {}

  getVendorOrders = async (req: Request, res: Response) => {
    const isPlatform = isPlatformActor(req.actor);
    const vendorId = isPlatform
      ? typeof req.query.vendorId === 'string' && req.query.vendorId.length > 0
        ? req.query.vendorId
        : undefined
      : req.store?.id;

    if (!vendorId && !isPlatform) {
      throw new ForbiddenException(
        'Seller store context required',
        ErrorCode.SELLER_CONTEXT_REQUIRED,
      );
    }
    const status = req.query.status as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await this.service.getVendorOrders(vendorId, status, page, limit, isPlatform);
    return sendSuccess(res, result, 'Vendor orders retrieved successfully');
  };

  getVendorOrderById = async (req: Request, res: Response) => {
    const isPlatform = isPlatformActor(req.actor);
    const vendorId = isPlatform
      ? typeof req.query.vendorId === 'string' && req.query.vendorId.length > 0
        ? req.query.vendorId
        : undefined
      : req.store?.id;

    if (!vendorId && !isPlatform) {
      throw new ForbiddenException(
        'Seller store context required',
        ErrorCode.SELLER_CONTEXT_REQUIRED,
      );
    }

    const orderId = req.params.orderId || req.params.id || '';
    const order = await this.service.getVendorOrderById(orderId, vendorId, isPlatform);
    return sendSuccess(res, order, 'Vendor order retrieved successfully');
  };

  updateOrderItemStatus = async (req: Request, res: Response) => {
    const isPlatform = isPlatformActor(req.actor);
    const vendorId = req.store?.id;

    if (!vendorId && !isPlatform) {
      throw new ForbiddenException(
        'Seller store context required',
        ErrorCode.SELLER_CONTEXT_REQUIRED,
      );
    }
    const orderItemId = req.params.orderItemId || '';
    const validated = updateOrderItemStatusSchema.parse(req.body);

    const updated = await this.service.updateOrderItemStatus(
      vendorId,
      orderItemId,
      validated.itemStatus,
      validated.trackingNumber,
      validated.courierPartner,
      isPlatform,
    );
    return sendSuccess(res, updated, 'Item status updated successfully');
  };
}

export const fulfillmentController = new FulfillmentController();
