import { Router } from 'express';

import { Permission } from '@celebs/rbac';

import { comboController } from './combo.controller';

import { authenticateJWT, optionalAuthenticateJWT } from '@/middlewares/auth.middleware';
import { searchRateLimiter } from '@/middlewares/rate-limiter.middleware';
import { requirePermissions } from '@/middlewares/rbac.middleware';

const router = Router();

// Public routes
router.get('/', optionalAuthenticateJWT, searchRateLimiter, comboController.getActiveCombos);
router.get(
  '/all',
  authenticateJWT,
  requirePermissions(Permission.CATALOG_MANAGE),
  comboController.getAllCombos,
);
router.get('/id/:id', optionalAuthenticateJWT, searchRateLimiter, comboController.getComboById);
router.get('/:slug', optionalAuthenticateJWT, searchRateLimiter, comboController.getComboBySlug);

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
