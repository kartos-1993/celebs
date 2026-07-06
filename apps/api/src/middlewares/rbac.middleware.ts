import { NextFunction, Request, Response } from 'express';
import { ForbiddenException, UnauthorizedException } from '@celebs/shared-utils';
import { Role } from '../generated/prisma';
import { Permission } from '../common/enums/permission.enum';

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  CUSTOMER: [],
  VENDOR: [
    Permission.CREATE_PRODUCT,
    Permission.VIEW_ORDERS,
    Permission.MANAGE_ORDERS,
    Permission.VIEW_FINANCE,
  ],
  STAFF: [
    Permission.CREATE_PRODUCT,
    Permission.PUBLISH_PRODUCT,
    Permission.MANAGE_CATEGORIES,
    Permission.VIEW_ORDERS,
    Permission.MANAGE_ORDERS,
  ],
  ADMIN: Object.values(Permission),
};

export const requirePermissions = (...requiredPermissions: Permission[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as any;
    if (!user) {
      return next(new UnauthorizedException('Authentication required'));
    }

    const userPermissions = ROLE_PERMISSIONS[user.role as Role] || [];
    const hasPermission = requiredPermissions.every((p) => userPermissions.includes(p));

    if (!hasPermission) {
      return next(new ForbiddenException('Forbidden: Insufficient permissions'));
    }

    next();
  };
};
