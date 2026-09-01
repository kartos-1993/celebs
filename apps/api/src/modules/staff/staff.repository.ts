import prisma, { Prisma } from '@/config/db.prisma';

const VENDOR_PROFILE_SELECT = {
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
} as const;

export class StaffRepository {
  public async findUserWithVendor(userId: string) {
    return prisma.user.findUnique({
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
  }

  public async findVendorProfileById(id: string) {
    return prisma.vendorProfile.findUnique({
      where: { id },
      select: VENDOR_PROFILE_SELECT,
    });
  }

  public async findVendorProfileByUserId(userId: string) {
    return prisma.vendorProfile.findUnique({
      where: { userId },
      select: VENDOR_PROFILE_SELECT,
    });
  }

  public async findUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  public async createStaffUser(data: Prisma.UserCreateInput) {
    return prisma.user.create({
      data,
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

  public async createVerificationCode(data: Prisma.VerificationCodeCreateInput) {
    return prisma.verificationCode.create({
      data,
    });
  }

  public async findAllStaff() {
    return prisma.user.findMany({
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

  public async findStaffByVendorId(vendorId: string) {
    return prisma.user.findMany({
      where: {
        vendorId,
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

  public async findStaffById(id: string) {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  public async deleteStaff(id: string) {
    return prisma.user.delete({
      where: { id },
    });
  }

  public async updateStaff(id: string, data: Prisma.UserUpdateInput) {
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
        vendorId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}

export const staffRepository = new StaffRepository();
