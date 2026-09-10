import type { DynamicWidget, SDUIPageLayout } from '@celebs/shared-types';
import { logger } from '@celebs/shared-utils';

import { BannerRepository, bannerRepository } from '../banner/banner.repository';
import { CampaignRepository, campaignRepository } from '../campaign/campaign.repository';
import { CategoryRepository } from '../category/category.repository';
import { ComboRepository, comboRepository } from '../combo/combo.repository';
import { PlatformSettingsService } from '../platform-settings/platform-settings.service';
import { ProductService } from '../product/product.service';

import {
  getCachedJson,
  invalidateCacheKey,
  setCachedJson,
} from '@/common/services/redis-cache.service';

export const STOREFRONT_HOME_CACHE_KEY = 'storefront:home';
const STOREFRONT_HOME_TTL_SECONDS = 600; // 10 minutes

export class StorefrontService {
  constructor(
    private readonly bannerRepo: BannerRepository = bannerRepository,
    private readonly campaignRepo: CampaignRepository = campaignRepository,
    private readonly comboRepo: ComboRepository = comboRepository,
    private readonly categoryRepo: CategoryRepository = new CategoryRepository(),
    private readonly productService: ProductService = new ProductService(),
    private readonly settingsService: PlatformSettingsService = new PlatformSettingsService(),
  ) {}

  async invalidateHomeCache(): Promise<void> {
    await invalidateCacheKey(STOREFRONT_HOME_CACHE_KEY);
    logger.info('[StorefrontService] Invalidated storefront home Redis cache');
  }

  async getHomeComposite(): Promise<SDUIPageLayout> {
    const cached = await getCachedJson<SDUIPageLayout>(STOREFRONT_HOME_CACHE_KEY);
    if (cached) {
      return cached;
    }

    const now = new Date();
    const [banners, campaigns, combos, categories, productResult, layoutSetting] =
      await Promise.all([
        this.bannerRepo.findActiveBanners().catch(() => []),
        this.campaignRepo.findActiveCampaigns(now).catch(() => []),
        this.comboRepo.findActiveCombos().catch(() => []),
        this.categoryRepo.findMany({ isActive: true }, 16).catch(() => []),
        this.productService
          .getProducts({ page: 1, limit: 12 })
          .catch(() => ({ products: [], total: 0, nextCursor: null })),
        this.settingsService.getSettingByKey('layout_home').catch(() => null),
      ]);

    const customLayout = layoutSetting?.parsedValue as SDUIPageLayout | undefined;

    let widgets: DynamicWidget[] = [];

    if (customLayout?.widgets && Array.isArray(customLayout.widgets)) {
      widgets = customLayout.widgets.map((w) => {
        const enriched = { ...w };
        if (w.type === 'BANNER_CAROUSEL') {
          enriched.data = {
            banners,
            ...(typeof w.data === 'object' && w.data !== null ? w.data : {}),
          };
        } else if (w.type === 'CAMPAIGN_COUNTDOWN') {
          enriched.data = {
            campaigns,
            ...(typeof w.data === 'object' && w.data !== null ? w.data : {}),
          };
          if (campaigns.length === 0) enriched.isActive = false;
        } else if (w.type === 'CATEGORY_GRID') {
          enriched.data = {
            categories,
            ...(typeof w.data === 'object' && w.data !== null ? w.data : {}),
          };
        } else if (w.type === 'COMBO_SHOWCASE') {
          enriched.data = {
            combos,
            ...(typeof w.data === 'object' && w.data !== null ? w.data : {}),
          };
          if (combos.length === 0) enriched.isActive = false;
        } else if (w.type === 'PRODUCT_GRID') {
          enriched.data = {
            products: productResult.products,
            total: productResult.total,
            nextCursor: productResult.nextCursor,
            ...(typeof w.data === 'object' && w.data !== null ? w.data : {}),
          };
        }
        return enriched;
      });
    } else {
      widgets = [
        {
          id: 'widget-banner-carousel',
          type: 'BANNER_CAROUSEL',
          order: 1,
          isActive: true,
          data: { banners },
        },
        {
          id: 'widget-campaign-countdown',
          type: 'CAMPAIGN_COUNTDOWN',
          order: 2,
          isActive: campaigns.length > 0,
          data: { campaigns },
        },
        {
          id: 'widget-category-grid',
          type: 'CATEGORY_GRID',
          order: 3,
          isActive: true,
          data: { categories },
        },
        {
          id: 'widget-combo-showcase',
          type: 'COMBO_SHOWCASE',
          order: 4,
          isActive: combos.length > 0,
          data: { combos },
        },
        {
          id: 'widget-product-grid',
          type: 'PRODUCT_GRID',
          order: 5,
          isActive: true,
          data: {
            products: productResult.products,
            total: productResult.total,
            nextCursor: productResult.nextCursor,
          },
        },
      ];
    }

    const layout: SDUIPageLayout = {
      pageId: 'home',
      title: 'Celebs Storefront',
      widgets,
      updatedAt: new Date().toISOString(),
    };

    await setCachedJson(STOREFRONT_HOME_CACHE_KEY, layout, STOREFRONT_HOME_TTL_SECONDS);

    return layout;
  }
}

export const storefrontService = new StorefrontService();
