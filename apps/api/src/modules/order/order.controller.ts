import { Request, Response } from 'express';
import { HTTPSTATUS } from '@celebs/shared-utils';
import { OrderService } from './order.service';
import { addressSchema, checkoutSchema, updateAddressSchema, updateOrderItemStatusSchema } from '@celebs/shared-types';

export class OrderController {
  private orderService: OrderService;

  constructor() {
    this.orderService = new OrderService();
  }

  // --- ADDRESS HANDLERS ---

  getAddresses = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const addresses = await this.orderService.getUserAddresses(userId);
    res.status(HTTPSTATUS.OK).json({ success: true, data: addresses });
  };

  createAddress = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const validated = addressSchema.parse(req.body);
    const address = await this.orderService.createAddress(userId, validated);
    res.status(HTTPSTATUS.CREATED).json({ success: true, data: address });
  };

  updateAddress = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { addressId } = req.params;
    const validated = updateAddressSchema.parse(req.body);
    const updated = await this.orderService.updateAddress(userId, addressId, validated);
    res.status(HTTPSTATUS.OK).json({ success: true, data: updated });
  };

  deleteAddress = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { addressId } = req.params;
    await this.orderService.deleteAddress(userId, addressId);
    res.status(HTTPSTATUS.OK).json({ success: true, message: 'Address deleted successfully' });
  };

  // --- CHECKOUT & ORDER HANDLERS ---

  checkout = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const validated = checkoutSchema.parse(req.body);
    const result = await this.orderService.checkout(userId, validated);
    res.status(HTTPSTATUS.CREATED).json({ success: true, data: result });
  };

  getMyOrders = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const result = await this.orderService.getMyOrders(userId, page, limit);
    res.status(HTTPSTATUS.OK).json({ success: true, data: result });
  };

  getOrderById = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { orderId } = req.params;
    const order = await this.orderService.getOrderById(userId, orderId);
    res.status(HTTPSTATUS.OK).json({ success: true, data: order });
  };

  cancelOrder = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { orderId } = req.params;
    const cancelled = await this.orderService.cancelOrder(userId, orderId);
    res.status(HTTPSTATUS.OK).json({ success: true, data: cancelled, message: 'Order cancelled successfully' });
  };

  // --- VENDOR FULFILLMENT HANDLERS ---

  getVendorOrders = async (req: Request, res: Response) => {
    const vendorId = (req as any).user.vendorId || (req as any).user.id;
    const status = req.query.status as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await this.orderService.getVendorOrders(vendorId, status, page, limit);
    res.status(HTTPSTATUS.OK).json({ success: true, data: result });
  };

  updateOrderItemStatus = async (req: Request, res: Response) => {
    const vendorId = (req as any).user.vendorId || (req as any).user.id;
    const { orderItemId } = req.params;
    const validated = updateOrderItemStatusSchema.parse(req.body);

    const updated = await this.orderService.updateOrderItemStatus(
      vendorId,
      orderItemId,
      validated.itemStatus,
      validated.trackingNumber,
      validated.courierPartner
    );

    res.status(HTTPSTATUS.OK).json({ success: true, data: updated, message: 'Order item status updated' });
  };

  // --- ADMIN HANDLERS ---

  adminGetOrders = async (req: Request, res: Response) => {
    const status = req.query.status as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await this.orderService.adminGetOrders(status, page, limit);
    res.status(HTTPSTATUS.OK).json({ success: true, data: result });
  };
}
