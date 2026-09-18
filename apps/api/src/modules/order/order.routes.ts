import { Router } from 'express';

import { Permission } from '@celebs/rbac';
import {
  addressIdParamSchema,
  addressSchema,
  checkoutSchema,
  orderIdParamSchema,
  orderItemIdParamSchema,
  orderPaginationQuerySchema,
  updateAddressSchema,
  updateOrderItemStatusSchema,
  updatePaymentStatusSchema,
} from '@celebs/shared-types';
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
import { validateBody, validateParams, validateQuery } from '@/middlewares/validate';

const orderRoutes = Router();
const approvedStore = requireStoreState(['APPROVED']);

// --- CUSTOMER ADDRESS ROUTES ---
orderRoutes.get('/addresses', authenticateJWT, asyncHandler(addressController.getUserAddresses));
orderRoutes.post(
  '/addresses',
  authenticateJWT,
  validateBody(addressSchema),
  asyncHandler(addressController.createAddress),
);
orderRoutes.patch(
  '/addresses/:addressId',
  authenticateJWT,
  validateParams(addressIdParamSchema),
  validateBody(updateAddressSchema),
  asyncHandler(addressController.updateAddress),
);
orderRoutes.delete(
  '/addresses/:addressId',
  authenticateJWT,
  validateParams(addressIdParamSchema),
  asyncHandler(addressController.deleteAddress),
);

// --- CUSTOMER CHECKOUT & ORDERS ---
orderRoutes.post(
  '/checkout',
  authenticateJWT,
  validateBody(checkoutSchema),
  asyncHandler(checkoutController.checkout),
);
orderRoutes.get(
  '/summary-counts',
  authenticateJWT,
  asyncHandler(coreOrderController.getOrderSummaryCounts),
);
orderRoutes.get(
  '/my-orders',
  authenticateJWT,
  validateQuery(orderPaginationQuerySchema),
  asyncHandler(coreOrderController.getMyOrders),
);
orderRoutes.get(
  '/my-orders/summary-counts',
  authenticateJWT,
  asyncHandler(coreOrderController.getOrderSummaryCounts),
);
orderRoutes.get(
  '/my-orders/:orderId',
  authenticateJWT,
  validateParams(orderIdParamSchema),
  asyncHandler(coreOrderController.getOrderById),
);
orderRoutes.post(
  '/my-orders/:orderId/cancel',
  authenticateJWT,
  validateParams(orderIdParamSchema),
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
  validateParams(orderIdParamSchema),
  asyncHandler(fulfillmentController.getVendorOrderById),
);
orderRoutes.patch(
  '/vendor/orders/items/:orderItemId/status',
  authenticateJWT,
  asyncHandler(actorContext),
  approvedStore,
  requirePermissions(Permission.ORDER_MANAGE),
  validateParams(orderItemIdParamSchema),
  validateBody(updateOrderItemStatusSchema),
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
  validateParams(orderIdParamSchema),
  validateBody(updatePaymentStatusSchema),
  asyncHandler(paymentController.adminUpdatePaymentStatus),
);

// --- PUBLIC WALLET CALLBACKS ---
orderRoutes.get('/payments/esewa/success', asyncHandler(paymentController.esewaSuccess));
orderRoutes.get('/payments/esewa/failure', asyncHandler(paymentController.esewaFailure));
orderRoutes.get(
  '/payments/esewa/form/:orderId',
  validateParams(orderIdParamSchema),
  asyncHandler(paymentController.esewaForm),
);
orderRoutes.get('/payments/khalti/return', asyncHandler(paymentController.khaltiReturn));

export default orderRoutes;
