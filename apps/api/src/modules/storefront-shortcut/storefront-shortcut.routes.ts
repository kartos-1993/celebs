import { Router } from 'express';

import { Permission } from '@celebs/rbac';
import { asyncHandler } from '@celebs/shared-utils';

import { StorefrontShortcutController } from './storefront-shortcut.controller';
import { storefrontShortcutService } from './storefront-shortcut.service';

import { authenticateJWT } from '@/middlewares/auth.middleware';
import { requirePermissions } from '@/middlewares/rbac.middleware';

const storefrontShortcutController = new StorefrontShortcutController(storefrontShortcutService);

const storefrontShortcutRoutes = Router();

// Protected admin routes for storefront shortcut management
storefrontShortcutRoutes.get(
  '/',
  authenticateJWT,
  requirePermissions(Permission.CATALOG_MANAGE),
  asyncHandler(storefrontShortcutController.getStorefrontShortcutsForCategory),
);
storefrontShortcutRoutes.post(
  '/',
  authenticateJWT,
  requirePermissions(Permission.CATALOG_MANAGE),
  asyncHandler(storefrontShortcutController.createStorefrontShortcut),
);
storefrontShortcutRoutes.put(
  '/:id',
  authenticateJWT,
  requirePermissions(Permission.CATALOG_MANAGE),
  asyncHandler(storefrontShortcutController.updateStorefrontShortcut),
);
storefrontShortcutRoutes.delete(
  '/:id',
  authenticateJWT,
  requirePermissions(Permission.CATALOG_MANAGE),
  asyncHandler(storefrontShortcutController.deleteStorefrontShortcut),
);

export default storefrontShortcutRoutes;
