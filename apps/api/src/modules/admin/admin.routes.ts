import { Router } from 'express';

import { Permission } from '@celebs/rbac';
import { asyncHandler } from '@celebs/shared-utils';

import { userController } from '../user/user.controller';

import { adminController } from './admin.controller';

import { actorContext } from '@/common/context/actor-context.middleware';
import { requirePlatformActor } from '@/common/guards/store.guards';
import { authenticateJWT } from '@/common/strategies/jwt.strategy';
import { requirePermissions } from '@/middlewares/rbac.middleware';

const adminRoutes = Router();

// identity → context → jurisdiction → permission
// E21 hardening: permission checks alone are insufficient — a staff account
// with a custom VENDOR_MANAGE grant must never reach platform operations.
adminRoutes.use(authenticateJWT);
adminRoutes.use(asyncHandler(actorContext));
adminRoutes.use(requirePlatformActor);

// Vendor Management (requires VENDOR_MANAGE permission)
adminRoutes.get(
  '/vendors',
  requirePermissions(Permission.VENDOR_MANAGE),
  adminController.getAllVendors,
);
adminRoutes.get(
  '/vendors/:id',
  requirePermissions(Permission.VENDOR_MANAGE),
  adminController.getVendorById,
);
adminRoutes.patch(
  '/vendors/:id/approve',
  requirePermissions(Permission.VENDOR_MANAGE),
  adminController.approveVendor,
);
adminRoutes.patch(
  '/vendors/:id/reject',
  requirePermissions(Permission.VENDOR_MANAGE),
  adminController.rejectVendor,
);
adminRoutes.patch(
  '/vendors/:id/suspend',
  requirePermissions(Permission.VENDOR_MANAGE),
  adminController.suspendVendor,
);

// User Management (requires USER_MANAGE permission, typically SUPERADMIN only)
adminRoutes.get('/users', requirePermissions(Permission.USER_MANAGE), userController.getAllUsers);
adminRoutes.post('/users', requirePermissions(Permission.USER_MANAGE), userController.createUser);
adminRoutes.put(
  '/users/:id/role-permissions',
  requirePermissions(Permission.USER_MANAGE),
  userController.updateUserRoleAndPermissions,
);
adminRoutes.delete(
  '/users/:id',
  requirePermissions(Permission.USER_MANAGE),
  userController.deleteUser,
);

export default adminRoutes;
