import prisma from '@/config/db.prisma';

interface BannerInput {
  imageUrl: string;
  linkType: 'PRODUCT' | 'CATEGORY' | 'EXTERNAL' | 'NONE';
  linkValue?: string;
  title?: string;
  order: number;
  isActive?: boolean;
}

export class BannerService {
  private formatBanner(banner: any) {
    if (!banner) return null;
    return {
      ...banner,
      _id: banner.id,
    };
  }

  async getActiveBanners(): Promise<any[]> {
    const banners = await prisma.banner.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    return banners.map((b) => this.formatBanner(b));
  }

  async getAllBanners(): Promise<any[]> {
    const banners = await prisma.banner.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return banners.map((b) => this.formatBanner(b));
  }

  async updateBanners(bannersData: BannerInput[]): Promise<any[]> {
    if (!Array.isArray(bannersData) || bannersData.length > 3) {
      throw new Error('Banner list can have at most 3 banners');
    }

    return prisma.$transaction(async (tx) => {
      await tx.banner.deleteMany({});
      const created = [];
      for (const b of bannersData) {
        const item = await tx.banner.create({
          data: {
            imageUrl: b.imageUrl,
            targetUrl: b.linkValue || null,
            title: b.title || '',
            position: 'home_hero',
            isActive: b.isActive !== undefined ? b.isActive : true,
          },
        });
        created.push(this.formatBanner(item));
      }
      return created;
    });
  }
}
