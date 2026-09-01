import { Role } from '@prisma/client';

import { NotFoundException } from '@celebs/shared-utils';

import { mediaRepository } from '../media/media.repository';
import { storeLifecycle } from '../store/store-lifecycle.service';

import { type AdminRepository, adminRepository } from './admin.repository';

import { enqueueMail } from '@/common/services/mail.queue';
import { hashValue } from '@/common/utils/bcrypt';
import {} from '@/mailers/mailer';
import {
  vendorApprovalTemplate,
  vendorRejectionTemplate,
} from '@/mailers/templates/vendor-review.template';

export interface AdminServiceDeps {
  adminRepo?: Partial<AdminRepository>;
}

export class AdminService {
  private adminRepo: AdminRepository;

  constructor(deps: AdminServiceDeps = {}) {
    this.adminRepo = (deps.adminRepo ?? adminRepository) as AdminRepository;
  }

  // Vendor Management
  public async getAllVendors() {
    return this.adminRepo.findAllVendors();
  }

  public async getVendorById(id: string) {
    const vendor = await this.adminRepo.findVendorById(id);
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
      await enqueueMail({
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
      await enqueueMail({
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
    return this.adminRepo.findAllUsers();
  }

  public async createUser(data: { name: string; email: string; password: string; role?: Role }) {
    const hashedPassword = await hashValue(data.password);
    return this.adminRepo.createUser({
      name: data.name,
      email: data.email.toLowerCase(),
      password: hashedPassword,
      role: data.role,
      isEmailVerified: true,
    });
  }

  public async deleteUser(id: string) {
    const user = await this.adminRepo.findUserById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.adminRepo.deleteUser(id);
  }

  public async updateUserRoleAndPermissions(
    id: string,
    data: { role?: Role; permissions?: string[] },
  ) {
    const user = await this.adminRepo.findUserById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.adminRepo.updateUserRoleAndPermissions(id, {
      role: data.role !== undefined ? data.role : user.role,
      permissions: data.permissions !== undefined ? data.permissions : (user.permissions ?? []),
    });
  }
}

export const adminService = new AdminService();
