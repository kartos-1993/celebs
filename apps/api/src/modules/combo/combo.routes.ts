import { Router } from 'express';

import { Permission } from '@celebs/rbac';

import { comboController } from './combo.controller';

import { authenticateJWT } from '@/middlewares/auth.middleware';
import { requirePermissions } from '@/middlewares/rbac.middleware';

const router = Router();

// Public routes
router.get('/', comboController.getActiveCombos);
router.get(
  '/all',
  authenticateJWT,
  requirePermissions(Permission.CATALOG_MANAGE),
  comboController.getAllCombos,
);
router.get('/id/:id', comboController.getComboById);
router.get('/:slug', comboController.getComboBySlug);

// Protected Admin routes
router.post(
  '/',
  authenticateJWT,
  requirePermissions(Permission.CATALOG_MANAGE),
  comboController.createCombo,
);

router.put(
  '/:id',
  authenticateJWT,
  requirePermissions(Permission.CATALOG_MANAGE),
  comboController.updateCombo,
);

router.delete(
  '/:id',
  authenticateJWT,
  requirePermissions(Permission.CATALOG_MANAGE),
  comboController.deleteCombo,
);

export default router;
