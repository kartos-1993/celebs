import { Router } from 'express';

import { Permission } from '@celebs/rbac';
import { asyncHandler } from '@celebs/shared-utils';

import { logisticsController } from './logistics.controller';

import { actorContext } from '@/common/context/actor-context.middleware';
import { requirePlatformActor, requireStoreState } from '@/common/guards/store.guards';
import { authenticateJWT } from '@/middlewares/auth.middleware';
import { requirePermissions } from '@/middlewares/rbac.middleware';

const router = Router();

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

export default router;
