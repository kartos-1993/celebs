import {
  AuthPrincipalData,
} from '@celebs/shared-types';

import prisma, { Prisma } from '@/config/db.prisma';

export class UserRepository {
  public async findUserWithVendor(userId: string) {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        vendorProfile: true,
        vendor: true,
      },
    });

    if (!user) return null;

    const { vendor, vendorProfile, ...userWithoutVendor } = user;
    const effectiveVendorProfile = vendorProfile || vendor;
    return {
      ...userWithoutVendor,
      vendorProfile: effectiveVendorProfile || null,
    };
  }

  public async findAuthPrincipal(userId: string): Promise<AuthPrincipalData | null> {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        permissions: true,
        isEmailVerified: true,
        vendorId: true,
        vendorProfile: { select: { id: true } },
      },
    });
  }

  public async findAllUsers() {
    return prisma.user.findMany({
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

  public async createUser(data: Prisma.UserCreateInput) {
    return prisma.user.create({
      data,
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

  public async findUserById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  }

  public async deleteUser(id: string) {
    return prisma.user.delete({ where: { id } });
  }

  public async updateUserRoleAndPermissions(id: string, data: Prisma.UserUpdateInput) {
    return prisma.user.update({
      where: { id },
      data,
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

export const userRepository = new UserRepository();
