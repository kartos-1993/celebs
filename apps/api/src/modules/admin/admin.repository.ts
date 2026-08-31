import prisma, { Prisma } from '@/config/db.prisma';

export class AdminRepository {
  public async findAllVendors() {
    return prisma.vendorProfile.findMany({
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

  public async findVendorById(id: string) {
    return prisma.vendorProfile.findUnique({
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
    return prisma.user.findUnique({
      where: { id },
    });
  }

  public async deleteUser(id: string) {
    return prisma.user.delete({
      where: { id },
    });
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

export type AdminVendorListRecord = Prisma.PromiseReturnType<AdminRepository['findAllVendors']>;
export type AdminVendorItem = AdminVendorListRecord[number];
export type AdminVendorRecord = Prisma.PromiseReturnType<AdminRepository['findVendorById']>;
export type AdminUserListRecord = Prisma.PromiseReturnType<AdminRepository['findAllUsers']>;
export type AdminUserRecord = Prisma.PromiseReturnType<AdminRepository['findUserById']>;
export type AdminUserCreatedRecord = Prisma.PromiseReturnType<AdminRepository['createUser']>;
export type AdminUserUpdatedRecord = Prisma.PromiseReturnType<
  AdminRepository['updateUserRoleAndPermissions']
>;

export interface IAdminRepository {
  findAllVendors(): Promise<AdminVendorListRecord>;
  findVendorById(id: string): Promise<AdminVendorRecord>;
  findAllUsers(): Promise<AdminUserListRecord>;
  createUser(data: Prisma.UserCreateInput): Promise<AdminUserCreatedRecord>;
  findUserById(id: string): Promise<AdminUserRecord>;
  deleteUser(id: string): Promise<unknown>;
  updateUserRoleAndPermissions(
    id: string,
    data: Prisma.UserUpdateInput,
  ): Promise<AdminUserUpdatedRecord>;
}

export const adminRepository: IAdminRepository = new AdminRepository();
