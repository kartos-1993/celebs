import { Router } from 'express';
import { staffController } from './staff.module';
import { authenticateJWT } from '@/common/strategies/jwt.strategy';
import { requirePermissions } from '@/middlewares/rbac.middleware';
import { Permission } from '@celebs/rbac';

const staffRoutes = Router();

// Require JWT authentication for all staff routes
staffRoutes.use(authenticateJWT);

// Apply STAFF_MANAGE permission guard
staffRoutes.post('/', requirePermissions(Permission.STAFF_MANAGE), staffController.createStaff);
staffRoutes.get('/', requirePermissions(Permission.STAFF_MANAGE), staffController.getStaff);
staffRoutes.delete('/:id', requirePermissions(Permission.STAFF_MANAGE), staffController.deleteStaff);

export default staffRoutes;
