import { Router } from 'express';

import { Permission } from '@celebs/rbac';
import { asyncHandler } from '@celebs/shared-utils';

import { optionSetController } from './option-set.controller';

import { actorContext } from '@/common/context/actor-context.middleware';
import { authenticateJWT } from '@/middlewares/auth.middleware';
import { requirePermissions } from '@/middlewares/rbac.middleware';

const router = Router();

// Public reads (storefront needs option sets)
// Writes are platform-only — no store context needed but platform actor + permission gate required
router.get('/', optionSetController.list);
router.get('/:id', optionSetController.getById);

router.post(
  '/',
  authenticateJWT,
  asyncHandler(actorContext),
  requirePermissions(Permission.CATALOG_MANAGE),
  optionSetController.create,
);
router.put(
  '/:id',
  authenticateJWT,
  asyncHandler(actorContext),
  requirePermissions(Permission.CATALOG_MANAGE),
  optionSetController.update,
);
router.delete(
  '/:id',
  authenticateJWT,
  asyncHandler(actorContext),
  requirePermissions(Permission.CATALOG_MANAGE),
  optionSetController.delete,
);

export default router;
