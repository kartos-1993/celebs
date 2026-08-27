import { Router } from 'express';

import { Permission } from '@celebs/rbac';
import { codSettlementSchema, dispatchOrderSchema } from '@celebs/shared-types';
import { asyncHandler, HTTPSTATUS } from '@celebs/shared-utils';

import { logisticsService } from './logistics.service';

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
  asyncHandler(async (req, res) => {
    const { orderId } = req.params;
    const validated = dispatchOrderSchema.parse({
      orderId,
      provider: req.body.provider || 'NEPAL_CAN_MOVE',
      ...req.body,
    });
    // sellers: req.store.id, platform: null → repository enforces vendorId scoping
    const actorStoreId = req.store?.id ?? null;
    const result = await logisticsService.dispatchOrder(validated, actorStoreId);
    res.status(HTTPSTATUS.OK).json({ success: true, data: result });
  }),
);

// Settle COD payments (Admin / SuperAdmin) — platform only
router.post(
  '/settle-cod/:orderId',
  authenticateJWT,
  asyncHandler(actorContext),
  requirePlatformActor,
  requirePermissions(Permission.FINANCE_MANAGE),
  asyncHandler(async (req, res) => {
    const { orderId } = req.params;
    const validated = codSettlementSchema.parse({
      orderId,
      settlementReference: req.body.reference || req.body.settlementReference,
    });
    const result = await logisticsService.markCodSettled(
      validated.orderId,
      validated.settlementReference,
    );
    res.status(HTTPSTATUS.OK).json({ success: true, data: result });
  }),
);

export default router;
