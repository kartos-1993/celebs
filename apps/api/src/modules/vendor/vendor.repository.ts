import { Prisma, VendorProfile, Warehouse } from '@prisma/client';

import prisma from '@/config/db.prisma';

export class VendorRepository {
  public async findByUserId(userId: string) {
    return prisma.vendorProfile.findUnique({
      where: { userId },
      include: { warehouses: true },
    });
  }

  public async findByShopName(shopName: string): Promise<VendorProfile | null> {
    return prisma.vendorProfile.findUnique({
      where: { shopName },
    });
  }

  public async findByPhoneNumber(phoneNumber: string): Promise<VendorProfile | null> {
    return prisma.vendorProfile.findUnique({
      where: { phoneNumber },
    });
  }

  public async findByPanNumber(panNumber: string): Promise<VendorProfile | null> {
    return prisma.vendorProfile.findUnique({
      where: { panNumber },
    });
  }

  public async findByCitizenshipNumber(citizenshipNumber: string): Promise<VendorProfile | null> {
    return prisma.vendorProfile.findUnique({
      where: { citizenshipNumber },
    });
  }

  public async updateProfile(userId: string, data: Prisma.VendorProfileUpdateInput) {
    return prisma.vendorProfile.update({
      where: { userId },
      data,
      include: {
        warehouses: true,
      },
    });
  }

  public async upsertWarehouse(
    profileId: string,
    data: Prisma.WarehouseCreateWithoutVendorInput,
  ): Promise<Warehouse> {
    return prisma.warehouse.upsert({
      where: {
        id: profileId,
      },
      create: {
        ...data,
        vendorProfileId: profileId,
      },
      update: data,
    });
  }

  public async createVendorWithProfile(
    userData: Prisma.UserCreateInput,
    profileData: Omit<Prisma.VendorProfileUncheckedCreateInput, 'userId'>,
  ) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const user = await tx.user.create({
        data: userData,
      });

      const vendorProfile = await tx.vendorProfile.create({
        data: {
          ...profileData,
          userId: user.id,
        },
      });

      // Provision default product albums on vendor registration
      await tx.mediaFolder.createMany({
        data: [
          { vendorId: vendorProfile.id, name: 'Main Catalog', parentId: null },
          { vendorId: vendorProfile.id, name: 'Color Swatches', parentId: null },
          { vendorId: vendorProfile.id, name: 'Lookbooks', parentId: null },
        ],
        skipDuplicates: true,
      });

      return { user, vendorProfileId: vendorProfile.id };
    });
  }
}

export const vendorRepository = new VendorRepository();
