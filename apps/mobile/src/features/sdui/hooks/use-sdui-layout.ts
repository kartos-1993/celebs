import { useQuery } from '@tanstack/react-query';

import type { SDUIPageLayout } from '../types';

import { apiClient } from '@/api/client';

export const DEFAULT_HOME_LAYOUT: SDUIPageLayout = {
  pageId: 'home',
  title: 'Celebs Storefront',
  widgets: [
    {
      id: 'widget-banner-carousel',
      type: 'BANNER_CAROUSEL',
      order: 1,
      data: {},
    },
    {
      id: 'widget-campaign-countdown',
      type: 'CAMPAIGN_COUNTDOWN',
      order: 2,
      data: {},
    },
    {
      id: 'widget-combo-showcase',
      type: 'COMBO_SHOWCASE',
      order: 3,
      data: {},
    },
    {
      id: 'widget-category-grid',
      type: 'CATEGORY_GRID',
      order: 4,
      data: {},
    },
    {
      id: 'widget-product-grid',
      type: 'PRODUCT_GRID',
      order: 5,
      data: {},
    },
  ],
};

const SDUI_QUERY_KEYS = {
  layout: (pageId: string) => ['sdui', 'layout', pageId] as const,
};

export function useSDUILayout(pageId: string = 'home') {
  return useQuery<SDUIPageLayout>({
    queryKey: SDUI_QUERY_KEYS.layout(pageId),
    queryFn: async () => {
      try {
        const response = await apiClient.get<{
          success: boolean;
          data?: { parsed?: { [key: string]: unknown } };
        }>('/settings/public', { skipAuth: true });

        const customLayout = response.data?.data?.parsed?.[`layout_${pageId}`] as
          | SDUIPageLayout
          | undefined;

        if (
          customLayout &&
          Array.isArray(customLayout.widgets) &&
          customLayout.widgets.length > 0
        ) {
          return customLayout;
        }
      } catch {
        // Fallback gracefully on network / offline error
      }
      return DEFAULT_HOME_LAYOUT;
    },
    initialData: DEFAULT_HOME_LAYOUT,
    // Merchandised layout must revalidate on every mount: the persisted
    // react-query cache (AsyncStorage) would otherwise serve a stale layout
    // for up to staleTime after an app restart.
    staleTime: 0,
    refetchOnMount: 'always',
  });
}
