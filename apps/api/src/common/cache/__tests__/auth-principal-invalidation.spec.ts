import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminService } from '@/modules/admin/admin.service';
import { StaffService } from '@/modules/staff/staff.service';
import { UserService } from '@/modules/user/user.service';

/**
 * A role, permission, vendor or email-verification change must be visible to
 * the very next authenticated request.
 *
 * The identity layer caches the principal (`role`, `permissions`, `vendorId`,
 * `isEmailVerified`) in Redis for up to 30s, and the passport strategy reads
 * that cache before Postgres. Session revocation was already wired
 * (`invalidateSessions` has callers); principal revocation was not, so a
 * promotion or a demulation kept the old authority for a full TTL. These
 * assertions fail if a mutation path succeeds without dropping the cached
 * principal.
 */

const { mockAuthCache } = vi.hoisted(() => ({
  mockAuthCache: {
    invalidateUser: vi.fn().mockResolvedValue(undefined),
    invalidateSessions: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/common/cache/auth-cache', () => ({ authCache: mockAuthCache }));

const USER_ID = '11111111-1111-4111-8111-111111111111';
const ACTOR_ID = '22222222-2222-4222-8222-222222222222';

const existingUser = {
  id: USER_ID,
  role: 'CUSTOMER',
  permissions: [],
  vendorId: null,
  isEmailVerified: false,
};

describe('role and identity changes drop the cached principal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('drops the cached principal after an admin changes a role or permissions', async () => {
    const adminRepo = {
      findUserById: vi.fn().mockResolvedValue(existingUser),
      updateUserRoleAndPermissions: vi.fn().mockResolvedValue({
        ...existingUser,
        role: 'ADMIN',
      }),
    };

    await new AdminService({ adminRepo: adminRepo as never }).updateUserRoleAndPermissions(
      USER_ID,
      {
        role: 'ADMIN' as never,
      },
    );

    expect(mockAuthCache.invalidateUser).toHaveBeenCalledWith(USER_ID);
  });

  it('drops the cached principal after a user changes their own role or permissions', async () => {
    const userRepo = {
      findUserById: vi.fn().mockResolvedValue(existingUser),
      updateUserRoleAndPermissions: vi.fn().mockResolvedValue({
        ...existingUser,
        permissions: ['orders:read'],
      }),
    };

    await new UserService({ userRepo: userRepo as never }).updateUserRoleAndPermissions(USER_ID, {
      permissions: ['orders:read'],
    } as never);

    expect(mockAuthCache.invalidateUser).toHaveBeenCalledWith(USER_ID);
  });

  it('drops the cached principal after staff permissions or vendor change', async () => {
    // A distinct actor: `updateStaff` refuses to let anyone rewrite their own
    // permission array, so the target must not be the caller.
    const actor = { id: ACTOR_ID, role: 'SUPERADMIN', permissions: [] };
    const staffRepo = {
      findUserWithVendor: vi.fn().mockResolvedValue({ ...actor, vendorProfile: null }),
      findVendorProfileByUserId: vi.fn().mockResolvedValue(null),
      findStaffById: vi.fn().mockResolvedValue({ ...existingUser, role: 'STAFF' }),
      updateStaff: vi.fn().mockResolvedValue({ ...existingUser, role: 'STAFF' }),
    };

    await new StaffService({ staffRepo: staffRepo as never }).updateStaff(USER_ID, ACTOR_ID, {
      permissions: ['product:view'],
    });

    expect(mockAuthCache.invalidateUser).toHaveBeenCalledWith(USER_ID);
  });
});
