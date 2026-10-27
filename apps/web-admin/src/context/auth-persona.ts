import { getUserPermissions, type Permission } from '@celebs/rbac';

import type { UserData } from '@/types';

export type Mode = 'vendor' | 'admin';

export interface AuthPersona {
  role?: string;
  isVendor: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isStaff: boolean;
  isPlatform: boolean;
  isSeller: boolean;
  mode: Mode;
  storeId?: string;
  permissions: Permission[];
}

/**
 * Derives immutable persona flags, operational mode, tenant scoping, and effective capabilities
 * from a user account.
 *
 * Rules:
 * 1. Platform Invariant: ADMIN and SUPERADMIN always have isPlatform = true, isSeller = false, mode = 'admin'.
 * 2. Store Invariant: VENDOR, STAFF, or any non-platform account with a linked storeId has isSeller = true, isPlatform = false, mode = 'vendor'.
 * 3. Granular Capabilities: Permissions merge static role defaults with dynamic custom permission overrides.
 */
export function deriveAuthPersona(user?: UserData): AuthPersona {
  const role = user?.role;
  const isVendor = role === 'VENDOR';
  const isAdmin = role === 'ADMIN';
  const isSuperAdmin = role === 'SUPERADMIN';
  const isStaff = role === 'STAFF';

  const isPlatform = isAdmin || isSuperAdmin;
  const storeId = user?.vendorProfile?.id || user?.vendorId;
  const isSeller = !isPlatform && (isVendor || isStaff || Boolean(storeId));
  const mode: Mode = isPlatform ? 'admin' : 'vendor';

  const permissions = getUserPermissions(role || 'CUSTOMER', user?.permissions);

  return {
    role,
    isVendor,
    isAdmin,
    isSuperAdmin,
    isStaff,
    isPlatform,
    isSeller,
    mode,
    storeId,
    permissions,
  };
}
