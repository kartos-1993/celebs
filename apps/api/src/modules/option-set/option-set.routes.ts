import { Router } from 'express';

import { Permission } from '@celebs/rbac';
import { asyncHandler } from '@celebs/shared-utils';

import { OptionSetController } from './option-set.controller';
import { OptionSetService } from './option-set.service';

import { actorContext } from '@/common/context/actor-context.middleware';
import { authenticateJWT } from '@/middlewares/auth.middleware';
import { requirePermissions } from '@/middlewares/rbac.middleware';

const router = Router();
const controller = new OptionSetController(new OptionSetService());

// Public reads (storefront needs option sets)
// Writes are platform-only — no store context needed but platform actor + permission gate required
router.get('/', asyncHandler(controller.list));
router.get('/:id', asyncHandler(controller.getById));

router.post(
  '/',
  authenticateJWT,
  asyncHandler(actorContext),
  requirePermissions(Permission.CATALOG_MANAGE),
  asyncHandler(controller.create),
);
router.put(
  '/:id',
  authenticateJWT,
  asyncHandler(actorContext),
  requirePermissions(Permission.CATALOG_MANAGE),
  asyncHandler(controller.update),
);
router.delete(
  '/:id',
  authenticateJWT,
  asyncHandler(actorContext),
  requirePermissions(Permission.CATALOG_MANAGE),
  asyncHandler(controller.delete),
);

export default router;
