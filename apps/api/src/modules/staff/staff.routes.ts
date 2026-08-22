import { Router } from 'express';

import { Permission } from '@celebs/rbac';
import { asyncHandler } from '@celebs/shared-utils';

import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';

import { actorContext } from '@/common/context/actor-context.middleware';
import { requireStoreState } from '@/common/guards/store.guards';
import { authenticateJWT } from '@/common/strategies/jwt.strategy';
import { requirePermissions } from '@/middlewares/rbac.middleware';

const staffService = new StaffService();
const staffController = new StaffController(staffService);

const staffRoutes = Router();

// identity → context → lifecycle → permission.
// Team management is permitted during onboarding (PENDING/UNDER_REVIEW) —
// inviting staff grants nothing by itself. Revoked stores (SUSPENDED/REJECTED)
// lose all staff-management capability.
staffRoutes.use(authenticateJWT);
staffRoutes.use(asyncHandler(actorContext));
staffRoutes.use(requireStoreState(['PENDING', 'UNDER_REVIEW', 'APPROVED']));

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
