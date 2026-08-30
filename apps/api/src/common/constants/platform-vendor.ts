import { Prisma, PrismaClient } from '@prisma/client';

export const PLATFORM_VENDOR_ID = '00000000-0000-0000-0000-000000000001';
export const PLATFORM_VENDOR_NAME = 'Celebs Official';

/**
 * Predicate to determine if a store/vendor ID represents the platform's 1P store.
 * Eliminates all null comparisons across the codebase.
 */
export const is1PVendor = (vendorId?: string | null): boolean => vendorId === PLATFORM_VENDOR_ID;

/**
 * Ensures the canonical 1P platform vendor exists in the database.
 * Used during Superadmin setup, seeds, and lazy integration test bootstraps.
 */
export async function ensurePlatformVendor(
  client: PrismaClient | Prisma.TransactionClient,
  superadminUserId?: string,
) {
  const existing = await client.vendorProfile.findUnique({
    where: { id: PLATFORM_VENDOR_ID },
  });
  if (existing) return existing;

  let userId = superadminUserId;
  if (!userId) {
    const admin = await client.user.findFirst({
      where: { role: 'SUPERADMIN' },
    });
    if (!admin) return null;
    userId = admin.id;
  }

  return client.vendorProfile.upsert({
    where: { id: PLATFORM_VENDOR_ID },
    create: {
      id: PLATFORM_VENDOR_ID,
      userId,
      shopName: PLATFORM_VENDOR_NAME,
      phoneNumber: '+977-1-0000000',
      panNumber: '000000000',
      citizenshipNumber: '000000000',
      status: 'APPROVED',
    },
    update: {
      status: 'APPROVED',
    },
  });
}
