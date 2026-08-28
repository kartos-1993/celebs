export interface Banner {
  id: string;
  imageUrl: string;
  linkType: 'PRODUCT' | 'CATEGORY' | 'EXTERNAL' | 'NONE';
  linkValue?: string;
  title?: string;
  order: number;
}

export interface CampaignData {
  id: string;
  title: string;
  slug: string;
  campaignType: 'FESTIVAL' | 'SEASONAL' | 'FLASH_SALE' | 'HOLIDAY' | 'NEW_YEAR';
  tagline?: string;
  bannerImage?: string;
  themeColor: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

export interface HydratedProduct {
  id?: string;
  name?: string;
  price?: number;
  mainImages?: string[];
  colorVariants?: {
    name: string;
    colorCode?: string;
    images?: string[];
    stocks?: { size: string; quantity: number }[];
  }[];
}

export interface ComboItemData {
  id: string;
  bundleId?: string;
  productId: string;
  defaultQuantity?: number;
  product?: HydratedProduct;
}

export interface ComboBundleData {
  id: string;
  title: string;
  slug: string;
  subtitle?: string;
  description?: string;
  bannerImage?: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  isFirstParty: boolean;
  tag?: string;
  items?: ComboItemData[];
  itemDetails?: ComboItemData[];
  createdAt: string;
}
