import { NextFunction, Request, Response } from 'express';
import { ForbiddenException, UnauthorizedException } from '@celebs/shared-utils';
import { can, Permission } from '@celebs/rbac';

export const requirePermissions = (...requiredPermissions: Permission[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as any;
    if (!user) {
      return next(new UnauthorizedException('Authentication required'));
    }

    const hasPermission = requiredPermissions.every((p) => can(user.role as string, p));

    if (!hasPermission) {
      return next(new ForbiddenException('Forbidden: Insufficient permissions'));
    }

    next();
  };
};
