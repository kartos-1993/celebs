import { BannerModel, IBanner } from '@/db/models/banner.model';

interface BannerInput {
  imageUrl: string;
  linkType: 'PRODUCT' | 'CATEGORY' | 'EXTERNAL' | 'NONE';
  linkValue?: string;
  title?: string;
  order: number;
  isActive?: boolean;
}

export class BannerService {
  /**
   * Get all active banners sorted by order
   */
  async getActiveBanners(): Promise<IBanner[]> {
    return BannerModel.find({ isActive: true }).sort({ order: 1 });
  }

  /**
   * Get all banners (for admin management)
   */
  async getAllBanners(): Promise<IBanner[]> {
    return BannerModel.find().sort({ order: 1 });
  }

  /**
   * Bulk update/replace the banners list.
   * Expects an array of banner inputs (exactly 3).
   */
  async updateBanners(bannersData: BannerInput[]): Promise<IBanner[]> {
    // Validate that we have up to 3 banners
    if (!Array.isArray(bannersData) || bannersData.length > 3) {
      throw new Error('Banner list can have at most 3 banners');
    }

    // We can clear and recreate to avoid complex matching
    await BannerModel.deleteMany({});

    const createdBanners = await BannerModel.create(
      bannersData.map((b, index) => ({
        imageUrl: b.imageUrl,
        linkType: b.linkType || 'NONE',
        linkValue: b.linkValue || '',
        title: b.title || '',
        order: b.order !== undefined ? b.order : index + 1,
        isActive: b.isActive !== undefined ? b.isActive : true,
      }))
    );

    return createdBanners;
  }
}
