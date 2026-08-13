import { Router } from 'express';

import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';

import { authenticateJWT } from '@/common/strategies/jwt.strategy';

const staffService = new StaffService();
const staffController = new StaffController(staffService);
import { Permission } from '@celebs/rbac';

import { requirePermissions } from '@/middlewares/rbac.middleware';

const staffRoutes = Router();

// Require JWT authentication for all staff routes
staffRoutes.use(authenticateJWT);

// Apply STAFF_MANAGE permission guard
staffRoutes.post('/', requirePermissions(Permission.STAFF_MANAGE), staffController.createStaff);
staffRoutes.get('/', requirePermissions(Permission.STAFF_VIEW), staffController.getStaff);
staffRoutes.patch(
  '/:id',
  requirePermissions(Permission.STAFF_MANAGE),
  staffController.updateStaff,
);
staffRoutes.delete(
  '/:id',
  requirePermissions(Permission.STAFF_MANAGE),
  staffController.deleteStaff,
);

export default staffRoutes;
