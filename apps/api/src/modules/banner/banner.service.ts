import { BannerInputType } from '@celebs/shared-types';
import { AppError, ErrorCode, HTTPSTATUS } from '@celebs/shared-utils';

import { type BannerRepository, bannerRepository } from './banner.repository';

export interface BannerServiceDeps {
  bannerRepo?: BannerRepository;
}

export class BannerService {
  private bannerRepo: BannerRepository;

  constructor(deps: BannerServiceDeps = {}) {
    this.bannerRepo = deps.bannerRepo ?? bannerRepository;
  }

  private formatBanner<T extends Record<string, unknown>>(banner: T | null) {
    if (!banner) return null;
    return {
      ...banner,
      id: banner.id,
    };
  }

  async getActiveBanners() {
    const banners = await this.bannerRepo.findActiveBanners();
    return banners.map((b) => this.formatBanner(b as Record<string, unknown>));
  }

  async getAllBanners() {
    const banners = await this.bannerRepo.findAllBanners();
    return banners.map((b) => this.formatBanner(b as Record<string, unknown>));
  }

  async updateBanners(bannersData: BannerInputType[]) {
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

    const created = await this.bannerRepo.replaceBanners(payload);
    return created.map((item) => this.formatBanner(item));
  }
}

export const bannerService = new BannerService();
