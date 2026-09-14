import prisma, { Prisma } from '@/config/db.prisma';

export class AddressRepository {
  async createAddress(data: Prisma.AddressUncheckedCreateInput) {
    return prisma.address.create({ data });
  }

  async findAddressesByUser(userId: string) {
    return prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findAddressById(id: string, userId: string) {
    return prisma.address.findFirst({
      where: { id, userId },
    });
  }

  async updateAddress(id: string, userId: string, data: Prisma.AddressUpdateInput) {
    return prisma.address.update({
      where: { id, userId },
      data,
    });
  }

  async deleteAddress(id: string) {
    return prisma.address.delete({
      where: { id },
    });
  }

  async unsetOtherDefaultAddresses(userId: string, currentAddressId?: string) {
    return prisma.address.updateMany({
      where: {
        userId,
        isDefault: true,
        ...(currentAddressId ? { NOT: { id: currentAddressId } } : {}),
      },
      data: { isDefault: false },
    });
  }
}

export const addressRepository = new AddressRepository();
