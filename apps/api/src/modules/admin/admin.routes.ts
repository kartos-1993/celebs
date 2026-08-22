import { Router } from 'express';

import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

import { Permission } from '@celebs/rbac';
import { asyncHandler } from '@celebs/shared-utils';

import { actorContext } from '@/common/context/actor-context.middleware';
import { requirePlatformActor } from '@/common/guards/store.guards';
import { authenticateJWT } from '@/common/strategies/jwt.strategy';
import { requirePermissions } from '@/middlewares/rbac.middleware';

const adminService = new AdminService();
const adminController = new AdminController(adminService);

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
adminRoutes.get('/users', requirePermissions(Permission.USER_MANAGE), adminController.getAllUsers);
adminRoutes.post('/users', requirePermissions(Permission.USER_MANAGE), adminController.createUser);
adminRoutes.put(
  '/users/:id/role-permissions',
  requirePermissions(Permission.USER_MANAGE),
  adminController.updateUserRoleAndPermissions,
);
adminRoutes.delete(
  '/users/:id',
  requirePermissions(Permission.USER_MANAGE),
  adminController.deleteUser,
);

export default adminRoutes;
