import { Router } from 'express';

import { Permission } from '@celebs/rbac';
import { asyncHandler } from '@celebs/shared-utils';

import { commissionController } from './commission.controller';

import { actorContext } from '@/common/context/actor-context.middleware';
import { authenticateJWT } from '@/middlewares/auth.middleware';
import { requirePermissions } from '@/middlewares/rbac.middleware';

/**
 * The platform's cut.
 *
 * Three tiers, because "what commission is this" and "what commission may I set"
 * are not one permission:
 *
 * - `/quote` is the seller-facing calculator. Open to any signed-in account: a
 *   seller who cannot see what they will keep will not list against us. It is
 *   arithmetic over figures the caller already has, and it reads no rule the
 *   caller could not price themselves.
 * - `/` and `/history` are the platform's rate card. COMMISSION_VIEW, granted to
 *   ADMIN, so support can tell a seller what rate they are on.
 * - `POST /` is COMMISSION_MANAGE and is not granted to ADMIN at all: it changes
 *   what sellers are paid, and an ADMIN able to set it could set it to zero, the
 *   one edit that cannot be walked back once a seller has listed against it.
 *
 * actorContext is mounted like every other finance router so the guards read the
 * merged role-plus-override permission set rather than the raw user record, which
 * would judge a per-user override differently here than everywhere else.
 */

const router = Router();

router.use(authenticateJWT, asyncHandler(actorContext));

router.get('/quote', asyncHandler(commissionController.quote));

router.get(
  '/history',
  requirePermissions(Permission.COMMISSION_VIEW),
  asyncHandler(commissionController.listHistory),
);

router.get(
  '/',
  requirePermissions(Permission.COMMISSION_VIEW),
  asyncHandler(commissionController.listCurrent),
);

router.post(
  '/',
  requirePermissions(Permission.COMMISSION_MANAGE),
  asyncHandler(commissionController.setRate),
);

export default router;
