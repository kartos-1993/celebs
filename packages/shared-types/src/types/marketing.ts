export type ComboDiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';

export type CampaignTypeEnum = 'FESTIVAL' | 'SEASONAL' | 'FLASH_SALE' | 'HOLIDAY' | 'NEW_YEAR';

export interface ComboBundleType {
  id: string;
  title: string;
  slug: string;
  subtitle?: string;
  description?: string;
  discountType: ComboDiscountType;
  discountValue: number;
  isActive: boolean;
  tag?: string;
  bannerImage?: string;
  itemCount: number;
  items?: Array<{ id?: string; productId?: string }>;
  createdAt: string;
  updatedAt?: string;
}

export interface CampaignItemType {
  id: string;
  title: string;
  slug: string;
  campaignType: CampaignTypeEnum;
  tagline?: string;
  bannerImage?: string;
  themeColor: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  productCount: number;
  products?: Array<{ id?: string; productId?: string }>;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductSelectorPropsType {
  selectedProductIds: string[];
  onChange: (ids: string[]) => void;
  label?: string;
  minRequired?: number;
}

export interface BannerImageUploadPropsType {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  aspectHint?: string;
}

export interface CatalogProductType {
  _id: string;
  name: string;
  price: number;
  discountedPrice?: number;
  mainImages?: string[];
  colorVariants?: Array<{ name?: string; colorCode?: string; images?: string[] }>;
  skus?: Array<{ skuCode?: string; price?: number; image?: string | null }>;
  brand?: string;
  status?: string;
}
