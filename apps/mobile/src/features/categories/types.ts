import type { QuickFilterDisplayAs, QuickFilterItem, QuickFilterType } from '@celebs/shared-types';

export type { QuickFilterDisplayAs, QuickFilterItem, QuickFilterType };

export interface QuickFilterConfig {
  id: string;
  type: QuickFilterType;
  attributeId?: string | null;
  displayAs: QuickFilterDisplayAs;
  displayOrder: number;
  items: QuickFilterItem[];
}

export interface DrawerFilterConfig {
  id: string;
  name: string;
  uiType: 'checkbox' | 'color_swatch' | 'size_box' | 'range_slider';
  attributeId?: string | null;
  attributeName?: string | null;
  values: string[];
  isMultiSelect: boolean;
  displayOrder: number;
}

export interface StorefrontCategoryInfo {
  id: string;
  name: string;
  slug: string;
  level: number;
  imageUrl?: string | null;
}

export interface StorefrontConfigData {
  category: StorefrontCategoryInfo;
  quickFilters: QuickFilterConfig[];
  drawerFilters: DrawerFilterConfig[];
}

export interface Category {
  id: string;
  name: string;
  slug?: string;
  displayName?: string;
  imageUrl?: string | null;
  level: number;
}
