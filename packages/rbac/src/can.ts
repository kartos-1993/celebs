import { Permission } from './permissions';
import { Role, ROLE_PERMISSIONS } from './role-permissions';
import type { PermissionMode, PermissionRequirement } from './types';

/**
 * Returns all effective permissions for a given user, merging static role defaults
 * with dynamic custom permission overrides assigned to that user account.
 */
export function getUserPermissions(
  role: Role | string,
  userCustomPermissions?: string[],
): Permission[] {
  if (role === 'SUPERADMIN') {
    return Object.values(Permission);
  }

  const defaultRolePermissions = ROLE_PERMISSIONS[role as Role] ?? [];

  if (
    userCustomPermissions &&
    Array.isArray(userCustomPermissions) &&
    userCustomPermissions.length > 0
  ) {
    const combined = new Set<string>([...defaultRolePermissions, ...userCustomPermissions]);
    return Array.from(combined) as Permission[];
  }

  return [...defaultRolePermissions];
}

/**
 * Evaluates whether a user with a given role and optional custom permissions array
 * has the required permission. SUPERADMIN always evaluates to true.
 */
export function can(
  role: Role | string,
  permission: Permission,
  userCustomPermissions?: string[],
): boolean {
  if (role === 'SUPERADMIN') return true;

  const effectivePermissions = getUserPermissions(role, userCustomPermissions);
  return effectivePermissions.includes(permission);
}

/**
 * Evaluates whether a user satisfies a permission requirement (single permission or array)
 * under the specified mode ('ANY' or 'ALL'). SUPERADMIN always evaluates to true.
 */
export function hasPermissionAccess(
  role: Role | string,
  userCustomPermissions: string[] | undefined,
  required: PermissionRequirement | undefined,
  mode: PermissionMode = 'ANY',
): boolean {
  if (!required) return true;
  if (role === 'SUPERADMIN') return true;

  const perms = Array.isArray(required) ? required : [required];
  if (perms.length === 0) return true;

  if (mode === 'ALL') {
    return perms.every((perm) => can(role, perm, userCustomPermissions));
  }

  return perms.some((perm) => can(role, perm, userCustomPermissions));
}
