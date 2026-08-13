import { Role, ROLE_PERMISSIONS } from './role-permissions';
import { Permission } from './permissions';

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

  if (userCustomPermissions && Array.isArray(userCustomPermissions) && userCustomPermissions.length > 0) {
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
