import prisma from '@/config/db.prisma';

export class WishlistRepository {
  async findManyByUser(userId: string) {
    return prisma.wishlistItem.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { product: true },
    });
  }

  async findByUserAndProduct(userId: string, productId: string) {
    return prisma.wishlistItem.findUnique({
      where: { userId_productId: { userId, productId } },
    });
  }

  async create(userId: string, productId: string) {
    return prisma.wishlistItem.create({
      data: { userId, productId },
      include: { product: true },
    });
  }

  async delete(userId: string, productId: string) {
    return prisma.wishlistItem.delete({
      where: { userId_productId: { userId, productId } },
    });
  }
}

export const wishlistRepository = new WishlistRepository();
