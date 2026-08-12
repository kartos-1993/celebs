import { Role } from '@prisma/client';

import { NotFoundException } from '@celebs/shared-utils';

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

  public async approveVendor(id: string) {
    const vendor = await prisma.vendorProfile.findUnique({
      where: { id },
      include: { user: { select: { email: true } } },
    });
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    const updated = await prisma.vendorProfile.update({
      where: { id },
      data: {
        status: 'APPROVED',
        rejectionReason: null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            isEmailVerified: true,
          },
        },
      },
    });

    if (vendor.user?.email) {
      const template = vendorApprovalTemplate(vendor.shopName);
      await sendEmail({
        to: vendor.user.email,
        subject: template.subject,
        text: template.text,
        html: template.html,
      });
    }

    return updated;
  }

  public async rejectVendor(id: string, reason?: string) {
    const vendor = await prisma.vendorProfile.findUnique({
      where: { id },
      include: { user: { select: { email: true } } },
    });
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    const rejectionReasonText =
      reason?.trim() || 'Your seller profile details require updates before account activation.';

    const updated = await prisma.vendorProfile.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectionReason: rejectionReasonText,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            isEmailVerified: true,
          },
        },
      },
    });

    if (vendor.user?.email) {
      const template = vendorRejectionTemplate(vendor.shopName, rejectionReasonText);
      await sendEmail({
        to: vendor.user.email,
        subject: template.subject,
        text: template.text,
        html: template.html,
      });
    }

    return updated;
  }

  public async suspendVendor(id: string) {
    const vendor = await prisma.vendorProfile.findUnique({ where: { id } });
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }
    return await prisma.vendorProfile.update({
      where: { id },
      data: { status: 'SUSPENDED' },
    });
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
}
