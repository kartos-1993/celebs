import type { RouteObject } from 'react-router-dom';

import { hasPermissionAccess, type PermissionMode, type PermissionRequirement } from '@celebs/rbac';
import type { UserData } from '@celebs/shared-types';

export interface RouteMeta {
  title?: string;
  crumb?: string;
  navGroup?: string;
  landingPriority?: number; // Lower number = higher priority for landing route
  hideFromNav?: boolean;
  permissions?: PermissionRequirement;
  permissionMode?: PermissionMode;
  allowedRoles?: string[];
}

export type AppRouteObject = RouteObject & {
  handle?: RouteMeta;
  children?: AppRouteObject[];
};

interface FlatNavCandidate {
  fullPath: string;
  priority: number;
}

/**
 * Traverses the application route manifest and dynamically resolves the best landing route
 * for a user based on their active permissions and role, with zero hardcoded switch cases.
 */
export function resolveDefaultLandingRoute(
  routes: AppRouteObject[],
  user: UserData | undefined,
  basePath = '',
): string {
  if (!user) {
    return '/login';
  }

  const candidates: FlatNavCandidate[] = [];

  function traverse(nodeList: AppRouteObject[], currentPath: string) {
    for (const node of nodeList) {
      const segment = node.path ? (node.path.startsWith('/') ? node.path : `/${node.path}`) : '';
      const fullPath = node.index ? currentPath : `${currentPath}${segment}`.replace(/\/+/g, '/');
      const meta = node.handle;

      const isAllowed = hasPermissionAccess(
        user!.role,
        user!.permissions,
        meta?.permissions,
        meta?.permissionMode,
      );

      if (!isAllowed) continue;

      if (
        meta?.allowedRoles &&
        meta.allowedRoles.length > 0 &&
        !meta.allowedRoles.includes(user!.role)
      ) {
        continue;
      }

      if (!meta?.hideFromNav && (node.index || (!node.children && node.element))) {
        candidates.push({
          fullPath,
          priority: meta?.landingPriority ?? 999,
        });
      }

      if (node.children && node.children.length > 0) {
        traverse(node.children, fullPath);
      }
    }
  }

  traverse(routes, basePath);
  candidates.sort((a, b) => a.priority - b.priority);

  return candidates[0]?.fullPath || '/account/profile';
}
