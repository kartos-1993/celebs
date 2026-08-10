import { Router } from 'express';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { authenticateJWT } from '@/common/strategies/jwt.strategy';

const adminService = new AdminService();
const adminController = new AdminController(adminService);
import { requirePermissions } from '@/middlewares/rbac.middleware';
import { Permission } from '@celebs/rbac';

const adminRoutes = Router();

// Apply global auth guard
adminRoutes.use(authenticateJWT);

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
adminRoutes.delete(
  '/users/:id',
  requirePermissions(Permission.USER_MANAGE),
  adminController.deleteUser,
);

export default adminRoutes;
