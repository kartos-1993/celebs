import { Router } from 'express';

import { Permission } from '@celebs/rbac';
import { asyncHandler } from '@celebs/shared-utils';

import { commissionController } from './commission.controller';

import { authenticateJWT } from '@/middlewares/auth.middleware';
import { requirePermissions } from '@/middlewares/rbac.middleware';

/**
 * The platform's cut.
 *
 * Reading and writing are separate guards, and the split is deliberate rather
 * than symmetrical. Reading the current rate is information any signed-in user
 * needs - a seller who cannot see what they will keep will not list. Changing it
 * is revenue, and is superadmin only: an ADMIN with this permission could set
 * their own commission to zero, so the permission is not granted to ADMIN at all.
 *
 * The calculator is under the read guard for the same reason as the rate: it is
 * arithmetic over figures the caller already has.
 */

const router = Router();

router.use(authenticateJWT);

router.get('/quote', asyncHandler(commissionController.quote));

router.get(
  '/history',
  requirePermissions(Permission.COMMISSION_MANAGE),
  asyncHandler(commissionController.listHistory),
);

router.get(
  '/',
  requirePermissions(Permission.COMMISSION_MANAGE),
  asyncHandler(commissionController.listCurrent),
);

router.post(
  '/',
  requirePermissions(Permission.COMMISSION_MANAGE),
  asyncHandler(commissionController.setRate),
);

export default router;
