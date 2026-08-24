import { TtlCache } from '@/common/utils/ttl-cache';
import prisma from '@/config/db.prisma';

export interface BannerCreateInput {
  imageUrl: string;
  targetUrl: string | null;
  title: string;
  position: string;
  isActive: boolean;
}

const activeBannersCache = new TtlCache<unknown[]>('banners:active');

export class BannerRepository {
  async findActiveBanners() {
    const cached = await activeBannersCache.get('all');
    if (cached) return cached;

    const banners = await prisma.banner.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });

    // Wholesale-replaced on every save, so invalidation below is always exact.
    await activeBannersCache.set('all', banners);
    return banners;
  }

  async findAllBanners() {
    return prisma.banner.findMany({
      orderBy: { createdAt: 'asc' },
    });
  }

  async replaceBanners(bannersData: BannerCreateInput[]) {
    const created = await prisma.$transaction(async (tx) => {
      await tx.banner.deleteMany({});
      const items = [];
      for (const b of bannersData) {
        const item = await tx.banner.create({
          data: b,
        });
        items.push(item);
      }
      return items;
    });

    await activeBannersCache.invalidate();
    return created;
  }
}

export const bannerRepository = new BannerRepository();
