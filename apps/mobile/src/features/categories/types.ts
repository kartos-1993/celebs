import type {
  StorefrontShortcutDisplayAs,
  StorefrontShortcutItem,
  StorefrontShortcutType,
} from '@celebs/shared-types';

export type { StorefrontShortcutDisplayAs, StorefrontShortcutItem, StorefrontShortcutType };

export interface StorefrontShortcutConfig {
  id: string;
  type: StorefrontShortcutType;
  attributeId?: string | null;
  displayAs: StorefrontShortcutDisplayAs;
  displayOrder: number;
  items: StorefrontShortcutItem[];
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
  shortcuts: StorefrontShortcutConfig[];
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
