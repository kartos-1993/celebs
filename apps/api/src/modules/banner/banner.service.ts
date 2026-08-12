import { AppError, ErrorCode, HTTPSTATUS } from '@celebs/shared-utils';

import { bannerRepository } from './banner.repository';

interface BannerInput {
  imageUrl: string;
  linkType: 'PRODUCT' | 'CATEGORY' | 'EXTERNAL' | 'NONE';
  linkValue?: string;
  title?: string;
  order: number;
  isActive?: boolean;
}

export class BannerService {
  private formatBanner<T extends Record<string, unknown>>(banner: T | null) {
    if (!banner) return null;
    return {
      ...banner,
      id: banner.id,
    };
  }

  async getActiveBanners() {
    const banners = await bannerRepository.findActiveBanners();
    return banners.map((b) => this.formatBanner(b as Record<string, unknown>));
  }

  async getAllBanners() {
    const banners = await bannerRepository.findAllBanners();
    return banners.map((b) => this.formatBanner(b as Record<string, unknown>));
  }

  async updateBanners(bannersData: BannerInput[]) {
    if (!Array.isArray(bannersData) || bannersData.length > 3) {
      throw new AppError(
        'Banner list can have at most 3 banners',
        HTTPSTATUS.BAD_REQUEST,
        ErrorCode.VALIDATION_ERROR,
      );
    }

    const payload = bannersData.map((b) => ({
      imageUrl: b.imageUrl,
      targetUrl: b.linkValue || null,
      title: b.title || '',
      position: 'home_hero',
      isActive: b.isActive !== undefined ? b.isActive : true,
    }));

    const created = await bannerRepository.replaceBanners(payload);
    return created.map((item) => this.formatBanner(item));
  }
}
