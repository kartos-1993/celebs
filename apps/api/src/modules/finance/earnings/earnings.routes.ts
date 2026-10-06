import { Router } from 'express';

import { Permission } from '@celebs/rbac';
import { asyncHandler } from '@celebs/shared-utils';

import { earningsController } from './earnings.controller';

import { actorContext } from '@/common/context/actor-context.middleware';
import { authenticateJWT } from '@/middlewares/auth.middleware';
import { requirePermissions } from '@/middlewares/rbac.middleware';

/**
 * A seller's own earnings.
 *
 * Guarded by the shop-scoped FINANCE_VIEW, which is the permission a seller
 * already holds and which the registry describes as "review shop revenue, payout
 * ledgers, earnings breakdown". That is exactly this screen.
 *
 * Deliberately NOT the platform permission: these are one seller's figures, and
 * reusing a platform-wide permission here would either lock sellers out or tempt
 * us into loosening what "platform" means.
 *
 * Reading *whose* earnings is decided in the controller, not here, because only
 * there is it known whether the caller is the seller or admin support.
 */

const router = Router();

router.use(authenticateJWT, asyncHandler(actorContext));

router.get(
  '/summary',
  requirePermissions(Permission.FINANCE_VIEW),
  asyncHandler(earningsController.summary),
);

router.get('/', requirePermissions(Permission.FINANCE_VIEW), asyncHandler(earningsController.list));

export default router;
