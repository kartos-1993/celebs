import { Router } from 'express';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';
import { authenticateJWT } from '@/common/strategies/jwt.strategy';

const staffService = new StaffService();
const staffController = new StaffController(staffService);
import { requirePermissions } from '@/middlewares/rbac.middleware';
import { Permission } from '@celebs/rbac';

const staffRoutes = Router();

// Require JWT authentication for all staff routes
staffRoutes.use(authenticateJWT);

// Apply STAFF_MANAGE permission guard
staffRoutes.post('/', requirePermissions(Permission.STAFF_MANAGE), staffController.createStaff);
staffRoutes.get('/', requirePermissions(Permission.STAFF_VIEW), staffController.getStaff);
staffRoutes.delete('/:id', requirePermissions(Permission.STAFF_MANAGE), staffController.deleteStaff);

export default staffRoutes;
