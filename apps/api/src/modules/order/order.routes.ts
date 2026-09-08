import { Router } from 'express';

import { Permission } from '@celebs/rbac';
import { asyncHandler } from '@celebs/shared-utils';

import { addressController } from './address/address.controller';
import { checkoutController } from './checkout/checkout.controller';
import { coreOrderController } from './core/order.controller';
import { fulfillmentController } from './fulfillment/fulfillment.controller';
import { paymentController } from './payment/payment.controller';

import { actorContext } from '@/common/context/actor-context.middleware';
import { requirePlatformActor, requireStoreState } from '@/common/guards/store.guards';
import { authenticateJWT } from '@/common/strategies/jwt.strategy';
import { requirePermissions } from '@/middlewares/rbac.middleware';

const orderRoutes = Router();
const approvedStore = requireStoreState(['APPROVED']);

// --- CUSTOMER ADDRESS ROUTES ---
orderRoutes.get('/addresses', authenticateJWT, asyncHandler(addressController.getUserAddresses));
orderRoutes.post('/addresses', authenticateJWT, asyncHandler(addressController.createAddress));
orderRoutes.patch(
  '/addresses/:addressId',
  authenticateJWT,
  asyncHandler(addressController.updateAddress),
);
orderRoutes.delete(
  '/addresses/:addressId',
  authenticateJWT,
  asyncHandler(addressController.deleteAddress),
);

// --- CUSTOMER CHECKOUT & ORDERS ---
orderRoutes.post('/checkout', authenticateJWT, asyncHandler(checkoutController.checkout));
orderRoutes.get('/my-orders', authenticateJWT, asyncHandler(coreOrderController.getMyOrders));
orderRoutes.get(
  '/my-orders/:orderId',
  authenticateJWT,
  asyncHandler(coreOrderController.getOrderById),
);
orderRoutes.post(
  '/my-orders/:orderId/cancel',
  authenticateJWT,
  asyncHandler(coreOrderController.cancelOrder),
);

// --- VENDOR FULFILLMENT ROUTES ---
orderRoutes.get(
  '/vendor/orders',
  authenticateJWT,
  asyncHandler(actorContext),
  approvedStore,
  requirePermissions(Permission.ORDER_VIEW),
  asyncHandler(fulfillmentController.getVendorOrders),
);
orderRoutes.get(
  '/vendor/orders/:orderId',
  authenticateJWT,
  asyncHandler(actorContext),
  approvedStore,
  requirePermissions(Permission.ORDER_VIEW),
  asyncHandler(fulfillmentController.getVendorOrderById),
);
orderRoutes.patch(
  '/vendor/orders/items/:orderItemId/status',
  authenticateJWT,
  asyncHandler(actorContext),
  approvedStore,
  requirePermissions(Permission.ORDER_MANAGE),
  asyncHandler(fulfillmentController.updateOrderItemStatus),
);

// --- ADMIN OVERVIEW ---
orderRoutes.get(
  '/admin/orders',
  authenticateJWT,
  asyncHandler(actorContext),
  requirePlatformActor,
  requirePermissions(Permission.ORDER_VIEW),
  asyncHandler(coreOrderController.adminGetOrders),
);
orderRoutes.patch(
  '/admin/orders/:orderId/payment',
  authenticateJWT,
  asyncHandler(actorContext),
  requirePlatformActor,
  requirePermissions(Permission.FINANCE_MANAGE),
  asyncHandler(paymentController.adminUpdatePaymentStatus),
);

// --- PUBLIC WALLET CALLBACKS ---
orderRoutes.get('/payments/esewa/success', asyncHandler(paymentController.esewaSuccess));
orderRoutes.get('/payments/esewa/failure', asyncHandler(paymentController.esewaFailure));
orderRoutes.get('/payments/esewa/form/:orderId', asyncHandler(paymentController.esewaForm));
orderRoutes.get('/payments/khalti/return', asyncHandler(paymentController.khaltiReturn));

export default orderRoutes;
