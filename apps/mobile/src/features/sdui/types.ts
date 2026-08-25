import type {
  DynamicWidget,
  SDUIPageLayout,
  WidgetAnalytics,
  WidgetProps,
  WidgetStyling,
} from '@celebs/shared-types';

export type { DynamicWidget, SDUIPageLayout, WidgetAnalytics, WidgetProps, WidgetStyling };

export type KnownSDUIWidgetType =
  | 'BANNER_CAROUSEL'
  | 'CAMPAIGN_COUNTDOWN'
  | 'COMBO_SHOWCASE'
  | 'CATEGORY_GRID'
  | 'PRODUCT_GRID'
  | 'PROMO_CARD'
  | 'CUSTOM_BANNER'
  | 'FLASH_SALE'
  | 'STORIES_REELS'
  | 'TESTIMONIALS';

/**
 * Extensible widget type allowing autocomplete for known widgets
 * while permitting any future dynamic backend widget string.
 */
export type SDUIWidgetType = KnownSDUIWidgetType | (string & {});

export interface WidgetActionPayload {
  actionType: 'NAVIGATE' | 'OPEN_MODAL' | 'DEEP_LINK' | 'TRACK_EVENT';
  route?: string;
  params?: Record<string, unknown>;
  modalType?: string;
  data?: unknown;
}
