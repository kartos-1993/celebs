import { Router } from 'express';

import { Permission } from '@celebs/rbac';
import { asyncHandler } from '@celebs/shared-utils';

import { logisticsController } from './logistics.controller';
import { shippingRateController } from './shipping-rate.controller';

import { actorContext } from '@/common/context/actor-context.middleware';
import { requirePlatformActor, requireStoreState } from '@/common/guards/store.guards';
import { authenticateJWT } from '@/middlewares/auth.middleware';
import { requirePermissions } from '@/middlewares/rbac.middleware';

const router = Router();

// Delivery locations for the address form. Public: a customer picks their
// district before they have an account, and the payload is place names only.
router.get('/delivery-locations', asyncHandler(logisticsController.listDeliveryLocations));

// Dispatch order via 3PL (Vendor / Admin) — tenant-isolated for sellers, platform bypass for ADMIN/SUPERADMIN
router.post(
  '/dispatch/:orderId',
  authenticateJWT,
  asyncHandler(actorContext),
  requirePermissions(Permission.ORDER_MANAGE),
  requireStoreState(['APPROVED']),
  logisticsController.dispatchOrder,
);

// Settle COD payments (Admin / SuperAdmin) — platform only
router.post(
  '/settle-cod/:orderId',
  authenticateJWT,
  asyncHandler(actorContext),
  requirePlatformActor,
  requirePermissions(Permission.FINANCE_MANAGE),
  logisticsController.settleCod,
);

// Inbound 3PL Courier Tracking Webhook (Automated status events from courier)
router.post('/webhook', logisticsController.handleCourierWebhook);

// --- Delivery rate card (platform admin only) ---
//
// These numbers decide what every customer is charged for delivery. Guarded with
// PLATFORM_MANAGE, matching the COD ceiling and fallback fee on the sibling
// commerce settings page: this is platform pricing, not a payout permission, and
// a finance accountant reconciles payouts rather than setting prices.

const rateCardGuards = [
  authenticateJWT,
  asyncHandler(actorContext),
  requirePlatformActor,
  requirePermissions(Permission.PLATFORM_MANAGE),
];

router.get('/delivery-cities', ...rateCardGuards, asyncHandler(shippingRateController.listCities));
router.get('/shipping-rates', ...rateCardGuards, asyncHandler(shippingRateController.listRates));
router.post('/shipping-rates', ...rateCardGuards, asyncHandler(shippingRateController.createRate));
router.patch(
  '/shipping-rates/:id',
  ...rateCardGuards,
  asyncHandler(shippingRateController.updateRate),
);
router.delete(
  '/shipping-rates/:id',
  ...rateCardGuards,
  asyncHandler(shippingRateController.deleteRate),
);
router.patch(
  '/delivery-cities/:id',
  ...rateCardGuards,
  asyncHandler(shippingRateController.updateCity),
);

export default router;
