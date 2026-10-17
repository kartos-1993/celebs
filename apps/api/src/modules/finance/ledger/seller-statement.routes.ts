import { Router } from 'express';

import { Permission } from '@celebs/rbac';
import { asyncHandler } from '@celebs/shared-utils';

import { sellerStatementController } from './seller-statement.controller';

import { actorContext } from '@/common/context/actor-context.middleware';
import { authenticateJWT } from '@/middlewares/auth.middleware';
import { requirePermissions } from '@/middlewares/rbac.middleware';

/**
 * What the platform owes a seller, frozen per period.
 *
 * One workflow, four permissions, and the split is the point: reading a
 * statement, freezing its figures, authorising the payout and recording the
 * payment are different acts with different consequences. A deployment can hand
 * them to different people, and the service refuses outright for one person to
 * both freeze and approve.
 *
 * Sellers reach the two reads and nothing else. Which seller is decided in the
 * controller from the caller's own store, so there is no parameter here that
 * could widen a seller's view.
 */
const router = Router();

router.use(authenticateJWT, asyncHandler(actorContext));

// ── Reads ────────────────────────────────────────────────────────────────────
// SELLER_STATEMENT_VIEW is granted to VENDOR and STAFF as well as platform
// finance; the controller pins a seller to their own statements.
router.get(
  '/',
  requirePermissions(Permission.SELLER_STATEMENT_VIEW),
  asyncHandler(sellerStatementController.list),
);

router.get(
  '/:id',
  requirePermissions(Permission.SELLER_STATEMENT_VIEW),
  asyncHandler(sellerStatementController.getById),
);

// ── Prepare ──────────────────────────────────────────────────────────────────
router.post(
  '/generate',
  requirePermissions(Permission.SELLER_STATEMENT_PREPARE),
  asyncHandler(sellerStatementController.generate),
);

router.post(
  '/:id/lock',
  requirePermissions(Permission.SELLER_STATEMENT_PREPARE),
  asyncHandler(sellerStatementController.lock),
);

router.post(
  '/:id/void',
  requirePermissions(Permission.SELLER_STATEMENT_PREPARE),
  asyncHandler(sellerStatementController.voidStatement),
);

// ── Approve, then pay ────────────────────────────────────────────────────────
router.post(
  '/:id/approve',
  requirePermissions(Permission.SELLER_STATEMENT_APPROVE),
  asyncHandler(sellerStatementController.approve),
);

router.post(
  '/:id/pay',
  requirePermissions(Permission.SELLER_STATEMENT_PAY),
  asyncHandler(sellerStatementController.pay),
);

export default router;
