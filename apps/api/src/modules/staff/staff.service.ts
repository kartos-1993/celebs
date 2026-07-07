import { ForbiddenException, NotFoundException } from '@celebs/shared-utils';
import prisma from '../../db';
import { hashValue } from '../../common/utils/bcrypt';

export class StaffService {
  public async createStaff(creatorUserId: string, data: any) {
    // Find creator's vendor profile
    const vendorProfile = await prisma.vendorProfile.findUnique({
      where: { userId: creatorUserId },
    });
    if (!vendorProfile) {
      throw new NotFoundException('Vendor profile not found for creator');
    }

    const hashedPassword = await hashValue(data.password);
    const staff = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        password: hashedPassword,
        role: 'STAFF',
        isEmailVerified: true,
        vendorId: vendorProfile.id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isEmailVerified: true,
        vendorId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return staff;
  }

  public async getStaff(creatorUserId: string) {
    const vendorProfile = await prisma.vendorProfile.findUnique({
      where: { userId: creatorUserId },
    });
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
        isEmailVerified: true,
        vendorId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  public async deleteStaff(staffId: string, creatorUserId: string) {
    const vendorProfile = await prisma.vendorProfile.findUnique({
      where: { userId: creatorUserId },
    });
    if (!vendorProfile) {
      throw new NotFoundException('Vendor profile not found');
    }

    const staffUser = await prisma.user.findUnique({
      where: { id: staffId },
    });
    if (!staffUser) {
      throw new NotFoundException('Staff user not found');
    }

    // Security check: Only the owning vendor can delete their staff
    if (staffUser.vendorId !== vendorProfile.id) {
      throw new ForbiddenException('Forbidden: You do not own this staff member');
    }

    await prisma.user.delete({
      where: { id: staffId },
    });

    return { id: staffId };
  }
}
