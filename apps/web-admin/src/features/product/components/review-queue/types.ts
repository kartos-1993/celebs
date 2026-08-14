export interface CategoryRef {
  id?: string;
  name: string;
  slug?: string;
  path?: string;
}

export interface ProductMeasurement {
  name: string;
  value: string;
  unit: string;
}

export interface BodyMeasurement {
  name: string;
  value: string;
  unit: string;
}

export interface SizeItem {
  name: string;
  productMeasurements?: ProductMeasurement[];
  bodyMeasurements?: BodyMeasurement[];
}

export interface StockItem {
  size: string;
  quantity: number;
}

export interface ColorVariantItem {
  name: string;
  colorCode: string;
  swatch?: string;
  images?: string[];
  stocks?: StockItem[];
}

export interface ReviewHistoryRecord {
  action: 'approve' | 'reject' | 'submit';
  reviewerId?: string;
  reviewerName?: string;
  rejectionReasonCategory?: string;
  rejectionSubcategories?: string[];
  rejectionFields?: string[];
  note?: string;
  reviewedAt: string | Date;
}

export interface ProductQueueItem {
  id: string;
  name: string;
  brand?: string;
  slug?: string;
  description?: string;
  price: number;
  discountedPrice?: number;
  category?: CategoryRef | string;
  subcategory?: CategoryRef | string;
  sizes?: SizeItem[];
  colorVariants?: ColorVariantItem[];
  mainImages?: string[];
  dynamicData?: Record<string, unknown>;
  tags?: string[];
  featured?: boolean;
  status: 'draft' | 'pending_review' | 'published' | 'rejected' | 'deactivated' | 'archived';
  vendorId?: string;
  vendorName?: string;
  reviewNote?: string;
  rejectionReasonCategory?: string;
  rejectionSubcategories?: string[];
  rejectionFields?: string[];
  qualityScore?: number;
  reviewHistory?: ReviewHistoryRecord[];
  reviewedBy?: string;
  reviewedAt?: string | Date;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface RejectionCategoryOption {
  id: string;
  label: string;
  subcategories: string[];
  suggestedFields: string[];
}
