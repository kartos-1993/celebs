import { Router } from 'express';

import { Permission } from '@celebs/rbac';
import { codSettlementSchema,dispatchOrderSchema } from '@celebs/shared-types';
import { asyncHandler, HTTPSTATUS } from '@celebs/shared-utils';

import { authenticateJWT } from '../../middlewares/auth.middleware';
import { requirePermissions } from '../../middlewares/rbac.middleware';

import { logisticsService } from './logistics.service';

const router = Router();

// Dispatch order via 3PL (Vendor / Admin)
router.post(
  '/dispatch/:orderId',
  authenticateJWT,
  requirePermissions(Permission.ORDER_MANAGE),
  asyncHandler(async (req, res) => {
    const { orderId } = req.params;
    const validated = dispatchOrderSchema.parse({
      orderId,
      provider: req.body.provider || 'NEPAL_CAN_MOVE',
      ...req.body,
    });
    const result = await logisticsService.dispatchOrder(validated);
    res.status(HTTPSTATUS.OK).json({ success: true, data: result });
  }),
);

// Settle COD payments (Admin / SuperAdmin)
router.post(
  '/settle-cod/:orderId',
  authenticateJWT,
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
