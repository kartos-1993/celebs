import { Router } from 'express';

import { Permission } from '@celebs/rbac';
import { asyncHandler } from '@celebs/shared-utils';

import { userController } from './user.controller';

import { actorContext } from '@/common/context/actor-context.middleware';
import { requirePlatformActor } from '@/common/guards/store.guards';
import { authenticateJWT } from '@/common/strategies/jwt.strategy';
import { requirePermissions } from '@/middlewares/rbac.middleware';

const userRoutes = Router();

// Platform admin guard pipeline: identity → actor context → platform guard → permission
userRoutes.use(authenticateJWT);
userRoutes.use(asyncHandler(actorContext));
userRoutes.use(requirePlatformActor);

userRoutes.get('/', requirePermissions(Permission.USER_MANAGE), userController.getAllUsers);
userRoutes.post('/', requirePermissions(Permission.USER_MANAGE), userController.createUser);
userRoutes.put(
  '/:id/role-permissions',
  requirePermissions(Permission.USER_MANAGE),
  userController.updateUserRoleAndPermissions,
);
userRoutes.delete('/:id', requirePermissions(Permission.USER_MANAGE), userController.deleteUser);

export default userRoutes;
