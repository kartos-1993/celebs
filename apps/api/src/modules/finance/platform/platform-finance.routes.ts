import { Router } from 'express';

import { Permission } from '@celebs/rbac';
import { asyncHandler } from '@celebs/shared-utils';

import { platformFinanceController } from './platform-finance.controller';

import { actorContext } from '@/common/context/actor-context.middleware';
import { authenticateJWT } from '@/middlewares/auth.middleware';
import { requirePermissions } from '@/middlewares/rbac.middleware';

/**
 * Platform Marketplace Financial Operations & Seller Remittance Directory.
 * Guarded strictly by FINANCE_PLATFORM_VIEW.
 */
const router = Router();

router.use(authenticateJWT, asyncHandler(actorContext));

router.get(
  '/overview',
  requirePermissions(Permission.FINANCE_PLATFORM_VIEW),
  platformFinanceController.getOverview,
);

router.get(
  '/sellers',
  requirePermissions(Permission.FINANCE_PLATFORM_VIEW),
  platformFinanceController.listSellers,
);

export default router;
