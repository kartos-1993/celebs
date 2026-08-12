import { Router } from 'express';

import { OrderController } from './order.controller';
import { OrderService } from './order.service';

import { authenticateJWT } from '@/common/strategies/jwt.strategy';

const orderRoutes = Router();
const orderService = new OrderService();
const controller = new OrderController(orderService);

// --- CUSTOMER ADDRESS ROUTES ---
orderRoutes.get('/addresses', authenticateJWT, controller.getUserAddresses);
orderRoutes.post('/addresses', authenticateJWT, controller.createAddress);
orderRoutes.patch('/addresses/:addressId', authenticateJWT, controller.updateAddress);
orderRoutes.delete('/addresses/:addressId', authenticateJWT, controller.deleteAddress);

// --- CUSTOMER CHECKOUT & ORDERS ---
orderRoutes.post('/checkout', authenticateJWT, controller.checkout);
orderRoutes.get('/my-orders', authenticateJWT, controller.getMyOrders);
orderRoutes.get('/my-orders/:orderId', authenticateJWT, controller.getOrderById);
orderRoutes.post('/my-orders/:orderId/cancel', authenticateJWT, controller.cancelOrder);

// --- VENDOR FULFILLMENT ROUTES ---
orderRoutes.get('/vendor/orders', authenticateJWT, controller.getVendorOrders);
orderRoutes.patch(
  '/vendor/orders/items/:orderItemId/status',
  authenticateJWT,
  controller.updateOrderItemStatus,
);

// --- ADMIN OVERVIEW ---
orderRoutes.get('/admin/orders', authenticateJWT, controller.adminGetOrders);

export default orderRoutes;
