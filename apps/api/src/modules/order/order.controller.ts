import { Request, Response } from 'express';

import {
  addressSchema,
  checkoutSchema,
  updateAddressSchema,
  updateOrderItemStatusSchema,
} from '@celebs/shared-types';
import { ErrorCode, ForbiddenException } from '@celebs/shared-utils';

import { OrderService } from './order.service';

import { isPlatformActor } from '@/common/context/actor-context';
import { sendCreated, sendSuccess } from '@/common/utils/response.util';

export class OrderController {
  constructor(private orderService: OrderService) {}

  // --- ADDRESS HANDLERS ---

  getUserAddresses = async (req: Request, res: Response) => {
    const userId = req.user?.id || '';
    const addresses = await this.orderService.getUserAddresses(userId);
    return sendSuccess(res, addresses, 'Addresses retrieved successfully');
  };

  createAddress = async (req: Request, res: Response) => {
    const userId = req.user?.id || '';
    const validated = addressSchema.parse(req.body);
    const address = await this.orderService.createAddress(userId, validated);
    return sendCreated(res, address, 'Address created successfully');
  };

  updateAddress = async (req: Request, res: Response) => {
    const userId = req.user?.id || '';
    const addressId = req.params.addressId || '';
    const validated = updateAddressSchema.parse(req.body);
    const updated = await this.orderService.updateAddress(userId, addressId, validated);
    return sendSuccess(res, updated, 'Address updated successfully');
  };

  deleteAddress = async (req: Request, res: Response) => {
    const userId = req.user?.id || '';
    const addressId = req.params.addressId || '';
    await this.orderService.deleteAddress(userId, addressId);
    return sendSuccess(res, null, 'Address deleted successfully');
  };

  // --- CHECKOUT & ORDER HANDLERS ---

  checkout = async (req: Request, res: Response) => {
    const userId = req.user?.id || '';
    const validated = checkoutSchema.parse(req.body);
    const result = await this.orderService.checkout(userId, validated);
    return sendCreated(res, result, 'Order placed successfully');
  };

  getMyOrders = async (req: Request, res: Response) => {
    const userId = req.user?.id || '';
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const result = await this.orderService.getMyOrders(userId, page, limit);
    return sendSuccess(res, result, 'Orders retrieved successfully');
  };

  getOrderById = async (req: Request, res: Response) => {
    const userId = req.user?.id || '';
    const orderId = req.params.orderId || '';
    const order = await this.orderService.getOrderById(userId, orderId);
    return sendSuccess(res, order, 'Order retrieved successfully');
  };

  cancelOrder = async (req: Request, res: Response) => {
    const userId = req.user?.id || '';
    const orderId = req.params.orderId || '';
    const cancelled = await this.orderService.cancelOrder(userId, orderId);
    return sendSuccess(res, cancelled, 'Order cancelled successfully');
  };

  // --- VENDOR FULFILLMENT HANDLERS ---

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

    const result = await this.orderService.getVendorOrders(
      vendorId,
      status,
      page,
      limit,
      isPlatform,
    );
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
    const order = await this.orderService.getVendorOrderById(orderId, vendorId, isPlatform);
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

    const updated = await this.orderService.updateOrderItemStatus(
      vendorId,
      orderItemId,
      validated.itemStatus,
      validated.trackingNumber,
      validated.courierPartner,
      isPlatform,
    );
    return sendSuccess(res, updated, 'Item status updated successfully');
  };

  // --- ADMIN OVERVIEW HANDLERS ---

  adminGetOrders = async (req: Request, res: Response) => {
    const status = req.query.status as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await this.orderService.adminGetOrders(status, page, limit);
    return sendSuccess(res, result, 'Admin orders retrieved successfully');
  };
}
