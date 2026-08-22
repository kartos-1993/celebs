import { Role } from '@prisma/client';

import { NotFoundException } from '@celebs/shared-utils';

import { mediaRepository } from '../media/media.repository';
import { storeLifecycle } from '../store/store-lifecycle.service';

import { hashValue } from '@/common/utils/bcrypt';
import prisma from '@/db';
import { sendEmail } from '@/mailers/mailer';
import {
  vendorApprovalTemplate,
  vendorRejectionTemplate,
} from '@/mailers/templates/vendor-review.template';

export class AdminService {
  // Vendor Management
  public async getAllVendors() {
    return await prisma.vendorProfile.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            isEmailVerified: true,
            createdAt: true,
          },
        },
        warehouses: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  public async getVendorById(id: string) {
    const vendor = await prisma.vendorProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            isEmailVerified: true,
            createdAt: true,
          },
        },
        warehouses: true,
      },
    });
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }
    return vendor;
  }

  public async approveVendor(id: string, actorUserId?: string) {
    const updated = await storeLifecycle.transition(id, 'APPROVED', {
      actorUserId,
      extraData: { rejectionReason: null },
    });
    if (!updated) {
      throw new NotFoundException('Vendor profile not found');
    }

    // Ensure default media folders are created for the approved vendor
    await mediaRepository.ensureDefaultFolders(id);

    if (updated.user?.email) {
      const template = vendorApprovalTemplate(updated.shopName);
      await sendEmail({
        to: updated.user.email,
        subject: template.subject,
        text: template.text,
        html: template.html,
      });
    }

    return updated;
  }

  public async rejectVendor(id: string, reason?: string, actorUserId?: string) {
    const rejectionReasonText =
      reason?.trim() || 'Your seller profile details require updates before account activation.';

    const updated = await storeLifecycle.transition(id, 'REJECTED', {
      actorUserId,
      extraData: { rejectionReason: rejectionReasonText },
    });
    if (!updated) {
      throw new NotFoundException('Vendor profile not found');
    }

    if (updated.user?.email) {
      const template = vendorRejectionTemplate(updated.shopName, rejectionReasonText);
      await sendEmail({
        to: updated.user.email,
        subject: template.subject,
        text: template.text,
        html: template.html,
      });
    }

    return updated;
  }

  public async suspendVendor(id: string, actorUserId?: string) {
    return storeLifecycle.transition(id, 'SUSPENDED', { actorUserId });
  }

  // User Management (Superadmin only)
  public async getAllUsers() {
    return await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isEmailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  public async createUser(data: { name: string; email: string; password: string; role?: Role }) {
    const hashedPassword = await hashValue(data.password);
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        password: hashedPassword,
        role: data.role,
        isEmailVerified: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isEmailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return user;
  }

  public async deleteUser(id: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return await prisma.user.delete({ where: { id } });
  }

  public async updateUserRoleAndPermissions(
    id: string,
    data: { role?: Role; permissions?: string[] },
  ) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return await prisma.user.update({
      where: { id },
      data: {
        role: data.role !== undefined ? data.role : user.role,
        permissions: data.permissions !== undefined ? data.permissions : user.permissions,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        permissions: true,
        isEmailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}
