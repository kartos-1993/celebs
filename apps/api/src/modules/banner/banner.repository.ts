import prisma from '@/config/db.prisma';

export interface BannerCreateInput {
  imageUrl: string;
  targetUrl: string | null;
  title: string;
  position: string;
  isActive: boolean;
}

export class BannerRepository {
  async findActiveBanners() {
    return prisma.banner.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findAllBanners() {
    return prisma.banner.findMany({
      orderBy: { createdAt: 'asc' },
    });
  }

  async replaceBanners(bannersData: BannerCreateInput[]) {
    return prisma.$transaction(async (tx) => {
      await tx.banner.deleteMany({});
      const created = [];
      for (const b of bannersData) {
        const item = await tx.banner.create({
          data: b,
        });
        created.push(item);
      }
      return created;
    });
  }
}

export const bannerRepository = new BannerRepository();
