import { NotFoundException } from '@celebs/shared-utils';
import prisma from '../../db';
import { hashValue } from '../../common/utils/bcrypt';

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
          },
        },
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
    const vendor = await prisma.vendorProfile.findUnique({ where: { id } });
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }
    return await prisma.vendorProfile.update({
      where: { id },
      data: { status: 'APPROVED' },
    });
  }

  public async rejectVendor(id: string, reason?: string) {
    const vendor = await prisma.vendorProfile.findUnique({ where: { id } });
    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }
    return await prisma.vendorProfile.update({
      where: { id },
      data: { status: 'REJECTED' }, // In a real app we might log the reason
    });
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

  public async createUser(data: any) {
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
    await prisma.user.delete({ where: { id } });
    return { id };
  }
}
