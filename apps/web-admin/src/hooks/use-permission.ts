import { useAuthContext } from '@/context/auth-provider';
import { hasPermissionAccess, type PermissionRequirement, type PermissionMode } from '@celebs/rbac';

/**
 * Custom hook to dynamically evaluate whether the currently logged-in user
 * satisfies the required permission(s).
 */
export function usePermission(
  required?: PermissionRequirement,
  mode: PermissionMode = 'ANY',
): boolean {
  const { user } = useAuthContext();
  if (!user) return false;

  return hasPermissionAccess(user.role, user.permissions, required, mode);
}
