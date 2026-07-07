import { Role, ROLE_PERMISSIONS } from './role-permissions';
import { Permission } from './permissions';

export function can(role: Role | string, permission: Permission): boolean {
  const rolePermissions = ROLE_PERMISSIONS[role as Role];
  if (!rolePermissions) return false;
  return rolePermissions.includes(permission);
}
