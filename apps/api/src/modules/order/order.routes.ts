import { Router } from 'express';

import { Permission } from '@celebs/rbac';
import { asyncHandler } from '@celebs/shared-utils';

import { OrderController } from './order.controller';
import { OrderService } from './order.service';

import { actorContext } from '@/common/context/actor-context.middleware';
import { requirePlatformActor, requireStoreState } from '@/common/guards/store.guards';
import { authenticateJWT } from '@/common/strategies/jwt.strategy';
import { requirePermissions } from '@/middlewares/rbac.middleware';

const orderRoutes = Router();
const orderService = new OrderService();
const controller = new OrderController(orderService);
const approvedStore = requireStoreState(['APPROVED']);

// --- CUSTOMER ADDRESS ROUTES ---
orderRoutes.get('/addresses', authenticateJWT, asyncHandler(controller.getUserAddresses));
orderRoutes.post('/addresses', authenticateJWT, asyncHandler(controller.createAddress));
orderRoutes.patch('/addresses/:addressId', authenticateJWT, asyncHandler(controller.updateAddress));
orderRoutes.delete(
  '/addresses/:addressId',
  authenticateJWT,
  asyncHandler(controller.deleteAddress),
);

// --- CUSTOMER CHECKOUT & ORDERS ---
orderRoutes.post('/checkout', authenticateJWT, asyncHandler(controller.checkout));
orderRoutes.get('/my-orders', authenticateJWT, asyncHandler(controller.getMyOrders));
orderRoutes.get('/my-orders/:orderId', authenticateJWT, asyncHandler(controller.getOrderById));
orderRoutes.post(
  '/my-orders/:orderId/cancel',
  authenticateJWT,
  asyncHandler(controller.cancelOrder),
);

// --- VENDOR FULFILLMENT ROUTES ---
orderRoutes.get(
  '/vendor/orders',
  authenticateJWT,
  asyncHandler(actorContext),
  approvedStore,
  requirePermissions(Permission.ORDER_VIEW),
  asyncHandler(controller.getVendorOrders),
);
orderRoutes.get(
  '/vendor/orders/:orderId',
  authenticateJWT,
  asyncHandler(actorContext),
  approvedStore,
  requirePermissions(Permission.ORDER_VIEW),
  asyncHandler(controller.getVendorOrderById),
);
orderRoutes.patch(
  '/vendor/orders/items/:orderItemId/status',
  authenticateJWT,
  asyncHandler(actorContext),
  approvedStore,
  requirePermissions(Permission.ORDER_MANAGE),
  asyncHandler(controller.updateOrderItemStatus),
);

// --- ADMIN OVERVIEW ---
orderRoutes.get(
  '/admin/orders',
  authenticateJWT,
  asyncHandler(actorContext),
  requirePlatformActor,
  requirePermissions(Permission.ORDER_VIEW),
  asyncHandler(controller.adminGetOrders),
);

export default orderRoutes;
