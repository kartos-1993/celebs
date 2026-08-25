import type { SDUIPageLayout } from '@celebs/shared-types';

export type DeviceViewport = 'iphone' | 'pixel' | 'tablet';

export interface DeviceConfig {
  id: DeviceViewport;
  name: string;
  width: number;
  height: number;
  frameBorderRadius: string;
}

export const DEVICE_PRESETS: Record<DeviceViewport, DeviceConfig> = {
  iphone: {
    id: 'iphone',
    name: 'iPhone 16 Pro (393 × 852)',
    width: 393,
    height: 780,
    frameBorderRadius: 'rounded-[48px]',
  },
  pixel: {
    id: 'pixel',
    name: 'Google Pixel 8 (412 × 915)',
    width: 412,
    height: 780,
    frameBorderRadius: 'rounded-[36px]',
  },
  tablet: {
    id: 'tablet',
    name: 'iPad Mini (768 × 1024)',
    width: 580,
    height: 800,
    frameBorderRadius: 'rounded-[28px]',
  },
};

export const MOCK_SDUI_LAYOUT: SDUIPageLayout = {
  pageId: 'home',
  title: 'Celebs Storefront Live Preview',
  widgets: [
    {
      id: 'w-banner',
      type: 'BANNER_CAROUSEL',
      order: 1,
      data: {
        banners: [{ title: 'Mega Festive Collection 2026', subtitle: 'Up to 50% Off Top Brands' }],
      },
    },
    {
      id: 'w-campaign',
      type: 'CAMPAIGN_COUNTDOWN',
      order: 2,
      data: {
        campaignName: 'Dashain Mega Sale',
        endsInHours: 48,
      },
    },
    {
      id: 'w-combo',
      type: 'COMBO_SHOWCASE',
      order: 3,
      data: {
        title: 'Curated Festive Bundles',
        badge: 'Save Extra 20%',
      },
    },
    {
      id: 'w-category',
      type: 'CATEGORY_GRID',
      order: 4,
      data: {
        categories: ['Women Ethnic', 'Men Formal', 'Footwear', 'Accessories'],
      },
    },
    {
      id: 'w-product',
      type: 'PRODUCT_GRID',
      order: 5,
      data: {
        itemsCount: 12,
      },
    },
  ],
};
