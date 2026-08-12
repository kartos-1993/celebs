import { CreateStaffType } from '@celebs/shared-types';
import { BadRequestException, ForbiddenException, NotFoundException } from '@celebs/shared-utils';

import { hashValue } from '@/common/utils/bcrypt';
import prisma from '@/db';

export interface CreateStaffInput extends CreateStaffType {
  vendorId?: string;
  permissions?: string[];
}

export class StaffService {
  /**
   * Resolves vendorProfile and user info for a given userId.
   * Handles VENDOR owners, STAFF sub-users, and ADMIN/SUPERADMIN roles.
   */
  private async resolveUserAndVendor(userId: string, targetVendorId?: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        vendorId: true,
        vendorProfile: {
          select: { id: true, shopName: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const vendorProfileSelect = {
      id: true,
      userId: true,
      shopName: true,
      shopDescription: true,
      phoneNumber: true,
      panNumber: true,
      citizenshipNumber: true,
      status: true,
      availableBalance: true,
      withholdingEscrow: true,
      currencyCode: true,
      createdAt: true,
      updatedAt: true,
    };

    // 1. If explicit targetVendorId is passed (e.g. by admin)
    if (targetVendorId) {
      const vendorProfile = await prisma.vendorProfile.findUnique({
        where: { id: targetVendorId },
        select: vendorProfileSelect,
      });
      if (!vendorProfile) {
        throw new NotFoundException(`Vendor profile with ID ${targetVendorId} not found`);
      }
      return { user, vendorProfile };
    }

    // 2. Direct vendor owner
    if (user.vendorProfile) {
      return { user, vendorProfile: user.vendorProfile };
    }

    // 3. Vendor staff sub-user (has vendorId set)
    if (user.vendorId) {
      const vendorProfile = await prisma.vendorProfile.findUnique({
        where: { id: user.vendorId },
        select: vendorProfileSelect,
      });
      if (vendorProfile) {
        return { user, vendorProfile };
      }
    }

    // 4. Fallback for vendor profile by userId
    const vendorProfile = await prisma.vendorProfile.findUnique({
      where: { userId },
      select: vendorProfileSelect,
    });

    return { user, vendorProfile: vendorProfile || null };
  }

  public async createStaff(creatorUserId: string, data: CreateStaffInput) {
    const { user, vendorProfile } = await this.resolveUserAndVendor(creatorUserId, data.vendorId);

    const effectiveVendorId: string | undefined = vendorProfile?.id;

    if (!effectiveVendorId) {
      if (user.role === 'SUPERADMIN' || user.role === 'ADMIN') {
        throw new BadRequestException(
          'Vendor ID is required when creating staff as an administrator',
        );
      }
      throw new NotFoundException('Vendor profile not found for creator');
    }

    const hashedPassword = await hashValue(data.password);
    const staff = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        password: hashedPassword,
        role: 'STAFF',
        permissions: data.permissions || [],
        isEmailVerified: true,
        vendorId: effectiveVendorId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        permissions: true,
        isEmailVerified: true,
        vendorId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return staff;
  }

  public async getStaff(creatorUserId: string, targetVendorId?: string) {
    const { user, vendorProfile } = await this.resolveUserAndVendor(creatorUserId, targetVendorId);

    // If Admin/Superadmin and no specific vendor profile found/requested, return all staff
    if (!vendorProfile && (user.role === 'SUPERADMIN' || user.role === 'ADMIN')) {
      return await prisma.user.findMany({
        where: {
          role: 'STAFF',
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          permissions: true,
          isEmailVerified: true,
          vendorId: true,
          vendor: {
            select: {
              id: true,
              shopName: true,
            },
          },
          createdAt: true,
          updatedAt: true,
        },
      });
    }

    if (!vendorProfile) {
      throw new NotFoundException('Vendor profile not found');
    }

    return await prisma.user.findMany({
      where: {
        vendorId: vendorProfile.id,
        role: 'STAFF',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        permissions: true,
        isEmailVerified: true,
        vendorId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  public async deleteStaff(staffId: string, creatorUserId: string) {
    const { user, vendorProfile } = await this.resolveUserAndVendor(creatorUserId);

    const staffUser = await prisma.user.findUnique({
      where: { id: staffId },
    });
    if (!staffUser) {
      throw new NotFoundException('Staff user not found');
    }

    // Security check: Only the owning vendor (or their staff with permission) or ADMIN/SUPERADMIN can delete staff
    const isAdmin = user.role === 'SUPERADMIN' || user.role === 'ADMIN';
    if (!isAdmin) {
      if (!vendorProfile || staffUser.vendorId !== vendorProfile.id) {
        throw new ForbiddenException('Forbidden: You do not own this staff member');
      }
    }

    await prisma.user.delete({
      where: { id: staffId },
    });

    return { id: staffId };
  }
}
