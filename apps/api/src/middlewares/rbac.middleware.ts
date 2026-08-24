import { NextFunction, Request, Response } from 'express';

import { can, Permission } from '@celebs/rbac';
import { ForbiddenException, UnauthorizedException } from '@celebs/shared-utils';

export const requirePermissions = (...requiredPermissions: Permission[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Prefer the normalized actor context (Layer 1); fall back to the raw
    // user record for routers that have not been migrated to actorContext yet.
    const actor = req.actor;
    const role = actor?.role ?? req.user?.role;
    const permissions =
      actor?.permissions ?? (req.user as { permissions?: string[] } | undefined)?.permissions;

    if (!role) {
      return next(new UnauthorizedException('Authentication required'));
    }

    const hasPermission = requiredPermissions.every((p) => can(role as string, p, permissions));

    if (!hasPermission) {
      return next(new ForbiddenException('Forbidden: Insufficient permissions'));
    }

    next();
  };
};
