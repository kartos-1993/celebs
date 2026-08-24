import { getUserPermissions, Permission } from '@celebs/rbac';
import { CreateStaffType } from '@celebs/shared-types';
import {
  BadRequestException,
  ErrorCode,
  ForbiddenException,
  logger,
  NotFoundException,
} from '@celebs/shared-utils';

import { VerificationEnum } from '@/common/enums/verification-code.enum';
import { enqueueMail } from '@/common/services/mail.queue';
import { hashValue } from '@/common/utils/bcrypt';
import { fortyFiveMinutesFromNow } from '@/common/utils/date-time';
import { buildWebUrl } from '@/common/utils/url';
import prisma from '@/config/db.prisma';
import { } from '@/mailers/mailer';
import { verifyEmailTemplate } from '@/mailers/templates/template';

export interface CreateStaffInput extends CreateStaffType {
  vendorId?: string;
  permissions?: string[];
}

/**
 * E3 hardening: staff sub-accounts can never hold platform or management
 * permissions — no exceptions for custom grants. Jurisdictional permissions
 * (STAFF_MANAGE, VENDOR_MANAGE, USER_MANAGE, PRODUCT_PUBLISH/REVIEW,
 * FINANCE_MANAGE, BRAND_MANAGE, CATALOG_MANAGE, PLATFORM_MANAGE) are excluded.
 */
const GRANTABLE_TO_STAFF: ReadonlySet<string> = new Set<string>([
  Permission.PRODUCT_VIEW,
  Permission.PRODUCT_CREATE,
  Permission.PRODUCT_EDIT,
  Permission.CATALOG_VIEW,
  Permission.BRAND_VIEW,
  Permission.MEDIA_VIEW,
  Permission.MEDIA_MANAGE,
  Permission.ORDER_VIEW,
  Permission.FINANCE_VIEW,
  Permission.STAFF_VIEW, // read-only roster visibility for senior staff
]);

/** Grantor ceiling: sellers may only grant permissions they themselves hold. */
function assertGrantablePermissions(requested: string[], grantor: { role: string; permissions: string[] }) {
  const illegal = requested.filter((p) => !GRANTABLE_TO_STAFF.has(p));
  if (illegal.length > 0) {
    throw new ForbiddenException(
      `The following permissions cannot be granted to store staff: ${illegal.join(', ')}`,
      ErrorCode.ACCESS_FORBIDDEN,
    );
  }

  const grantorEffective = getUserPermissions(grantor.role as Parameters<typeof getUserPermissions>[0], grantor.permissions);
  const exceeded = requested.filter((p) => !grantorEffective.includes(p as Permission));
  if (exceeded.length > 0) {
    throw new ForbiddenException(
      `You cannot grant permissions you do not hold yourself: ${exceeded.join(', ')}`,
      ErrorCode.ACCESS_FORBIDDEN,
    );
  }
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
        permissions: true,
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

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });
    if (existingUser) {
      throw new BadRequestException(
        'A user account with this email address already exists. Please use a unique email address for the staff member.',
      );
    }

    if (Array.isArray(data.permissions)) {
      assertGrantablePermissions(data.permissions, {
        role: user.role,
        permissions: user.permissions ?? [],
      });
    }

    const hashedPassword = await hashValue(data.password);
    const staff = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        password: hashedPassword,
        role: 'STAFF',
        permissions: data.permissions || [],
        isEmailVerified: false,
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

    // Generate verification code and send activation/invite email
    const verification = await prisma.verificationCode.create({
      data: {
        userId: staff.id,
        type: VerificationEnum.EMAIL_VERIFICATION,
        expiresAt: fortyFiveMinutesFromNow(),
      },
    });

    const verificationUrl = buildWebUrl('/verify-email', { code: verification.code });
    logger.info(
      { email: staff.email, verificationUrl },
      'Attempting to send activation email to sub-account staff member',
    );

    try {
      await enqueueMail({
        to: staff.email,
        subject: 'Activate your staff sub-account',
        text: `You have been added as a staff sub-account member. Please activate your account by clicking the following link: ${verificationUrl}`,
        html: verifyEmailTemplate(verificationUrl).html,
      });
      logger.info({ email: staff.email }, 'Activation email sent to staff member');
    } catch (err) {
      logger.error({ err, email: staff.email }, 'Failed to send activation email to staff member');
      if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
        logger.warn(
          { verificationUrl, email: staff.email },
          '[DEV/TEST FALLBACK] Staff activation email failed to send. Click link in logs to verify manually.',
        );
      }
    }

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
    if (staffId === creatorUserId) {
      throw new ForbiddenException('You cannot delete your own account', ErrorCode.ACCESS_FORBIDDEN);
    }

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

  public async updateStaff(
    staffId: string,
    creatorUserId: string,
    data: { permissions?: string[]; name?: string },
  ) {
    // E3 hardening: no actor may rewrite their own permission array.
    if (staffId === creatorUserId && Array.isArray(data.permissions)) {
      throw new ForbiddenException(
        'You cannot modify your own permissions',
        ErrorCode.ACCESS_FORBIDDEN,
      );
    }

    const { user, vendorProfile } = await this.resolveUserAndVendor(creatorUserId);

    const staffUser = await prisma.user.findUnique({
      where: { id: staffId },
    });
    if (!staffUser) {
      throw new NotFoundException('Staff user not found');
    }

    const isAdmin = user.role === 'SUPERADMIN' || user.role === 'ADMIN';
    if (!isAdmin) {
      if (!vendorProfile || staffUser.vendorId !== vendorProfile.id) {
        throw new ForbiddenException('Forbidden: You do not manage this staff member');
      }
    }

    if (Array.isArray(data.permissions)) {
      assertGrantablePermissions(data.permissions, {
        role: user.role,
        permissions: user.permissions ?? [],
      });
    }

    const updated = await prisma.user.update({
      where: { id: staffId },
      data: {
        ...(Array.isArray(data.permissions) ? { permissions: data.permissions } : {}),
        ...(data.name ? { name: data.name } : {}),
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

    return updated;
  }
}
