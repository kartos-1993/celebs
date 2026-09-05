import { Prisma, PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

export const PLATFORM_VENDOR_ID = '00000000-0000-0000-0000-000000000001';
export const PLATFORM_VENDOR_NAME = 'Celebs Official';
export const PLATFORM_SYSTEM_EMAIL = 'platform@celebs.com.np';

export const PLATFORM_COMPANY_DETAILS = {
  businessName: process.env.PLATFORM_COMPANY_NAME || 'Celebs Platform Private Limited',
  phoneNumber: process.env.PLATFORM_SUPPORT_PHONE || '+977-1-4000000',
  panNumber: process.env.PLATFORM_TAX_PAN || 'PAN-CELEBS-DEV',
  citizenshipNumber: process.env.PLATFORM_REG_NUMBER || 'REG-CELEBS-DEV',
  shopDescription: 'Flagship 1P platform catalog for Celebs Official direct retail.',
};

/**
 * Predicate to determine if a store/vendor ID represents the platform's 1P store.
 * Eliminates all null comparisons across the codebase.
 */
export const is1PVendor = (vendorId?: string | null): boolean => vendorId === PLATFORM_VENDOR_ID;

/**
 * Ensures the canonical 1P platform vendor exists in the database.
 * Uses a dedicated system account so individual Superadmin personal accounts
 * never get cluttered with fake personal KYC data.
 * Real corporate details (PAN, Reg No, Support Phone) can be configured via ENV in production.
 */
export async function ensurePlatformVendor(
  client: PrismaClient | Prisma.TransactionClient,
  superadminUserId?: string,
) {
  let vendor = await client.vendorProfile.findUnique({
    where: { id: PLATFORM_VENDOR_ID },
  });

  if (!vendor) {
    let userId = superadminUserId;
    if (!userId) {
      const existingAdmin = await client.user.findFirst({
        where: { role: 'SUPERADMIN' },
      });
      if (existingAdmin) {
        userId = existingAdmin.id;
      } else {
        let platformUser = await client.user.findFirst({
          where: { email: PLATFORM_SYSTEM_EMAIL },
        });
        if (!platformUser) {
          platformUser = await client.user.create({
            data: {
              name: 'Celebs Platform System',
              email: PLATFORM_SYSTEM_EMAIL,
              password: randomUUID(),
              role: 'SUPERADMIN',
              isEmailVerified: true,
            },
          });
        }
        userId = platformUser.id;
      }
    }

    vendor = await client.vendorProfile.upsert({
      where: { id: PLATFORM_VENDOR_ID },
      create: {
        id: PLATFORM_VENDOR_ID,
        userId,
        shopName: PLATFORM_VENDOR_NAME,
        businessName: PLATFORM_COMPANY_DETAILS.businessName,
        shopDescription: PLATFORM_COMPANY_DETAILS.shopDescription,
        phoneNumber: PLATFORM_COMPANY_DETAILS.phoneNumber,
        panNumber: PLATFORM_COMPANY_DETAILS.panNumber,
        citizenshipNumber: PLATFORM_COMPANY_DETAILS.citizenshipNumber,
        status: 'APPROVED',
        onboardingStep: 4,
      },
      update: {
        status: 'APPROVED',
      },
    });
  }

  // Ensure 1P Primary Warehouse exists for fulfillment & logistics
  const existingWarehouse = await client.warehouse.findFirst({
    where: { vendorProfileId: PLATFORM_VENDOR_ID },
  });
  if (!existingWarehouse) {
    await client.warehouse.create({
      data: {
        vendorProfileId: PLATFORM_VENDOR_ID,
        label: 'Celebs Central Fulfillment Center',
        contactName: 'Celebs Operations',
        contactPhone: PLATFORM_COMPANY_DETAILS.phoneNumber,
        addressLine1: 'Durbar Marg, Ward 1',
        city: 'Kathmandu',
        district: 'Kathmandu',
        province: 'Bagmati Province',
        country: 'Nepal',
        isBusinessAddress: true,
        isReturnAddress: true,
      },
    });
  }

  return vendor;
}
