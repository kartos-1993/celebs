import { Router } from 'express';

import { Permission } from '@celebs/rbac';
import { asyncHandler } from '@celebs/shared-utils';

import { financeController } from './finance.controller';

import { actorContext } from '@/common/context/actor-context.middleware';
import { authenticateJWT } from '@/middlewares/auth.middleware';
import { requirePermissions } from '@/middlewares/rbac.middleware';

/**
 * The courier ledger and settlement batches.
 *
 * Read and write are guarded separately, and deliberately so. The platform
 * permissions are separate from the shop-scoped FINANCE_VIEW that a vendor
 * holds, because a seller reading their own earnings must not also read every
 * other seller's delivery costs. View lets someone see that a courier underpaid by
 * Rs 200; manage lets them record the statement, sign it off and mark it settled.
 */

const router = Router();

router.use(authenticateJWT, asyncHandler(actorContext));

router.get(
  '/ledger',
  requirePermissions(Permission.FINANCE_PLATFORM_VIEW),
  asyncHandler(financeController.listLedger),
);

router.get(
  '/settlements',
  requirePermissions(Permission.FINANCE_PLATFORM_VIEW),
  asyncHandler(financeController.listSettlements),
);

router.post(
  '/settlements',
  requirePermissions(Permission.FINANCE_PLATFORM_MANAGE),
  asyncHandler(financeController.openBatch),
);

router.patch(
  '/settlements/:id/statement',
  requirePermissions(Permission.FINANCE_PLATFORM_MANAGE),
  asyncHandler(financeController.recordStatement),
);

router.post(
  '/settlements/:id/reconcile',
  requirePermissions(Permission.FINANCE_PLATFORM_MANAGE),
  asyncHandler(financeController.reconcile),
);

router.post(
  '/settlements/:id/pay',
  requirePermissions(Permission.FINANCE_PLATFORM_MANAGE),
  asyncHandler(financeController.markPaid),
);

export default router;
