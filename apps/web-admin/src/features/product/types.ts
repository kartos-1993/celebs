import type {
  CreateProductType,
  UpdateProductType,
  ProductFilterType,
  ProductType,
} from '@celebs/shared-types';

export type CreateProductRequest = CreateProductType;
export type UpdateProductRequest = UpdateProductType;
export type ProductFilterRequest = ProductFilterType;
export type ProductRecord = ProductType & {
  category?: { id?: string; name?: string; slug?: string; path?: string | string[]; level?: number };
  subcategory?: { id?: string; name?: string; slug?: string; path?: string | string[]; level?: number };
};

export type ProductStatus =
  | 'draft'
  | 'pending_review'
  | 'published'
  | 'rejected'
  | 'deactivated'
  | 'archived';

// ── Dynamic form schema ─────────────────────────────────────────────────────
export type UiType =
  | 'input'
  | 'number'
  | 'Switch'
  | 'select'
  | 'multiselect'
  | 'VariantList'
  | 'ColorInline'
  | 'SkuTableV2'
  | 'MainImage'
  | 'ColorMeta'
  | 'SizeMeasurementsTable';

export interface FieldSpec {
  name: string;
  uiType: UiType;
  label: string;
  group: string;
  required?: boolean;
  value?: unknown;
  dataSource?: Record<string, unknown>;
  rule?: Record<string, unknown>;
  visible?: boolean;
}

export type VariantKind = 'color' | 'size' | 'other';

export interface VariantMetaItem {
  key: string;
  label: string;
  kind: VariantKind;
  ui: 'select' | 'multiselect' | 'VariantList';
}

export type PageSectionKey =
  | 'basic'
  | 'images'
  | 'specification'
  | 'pricing'
  | 'shipping'
  | 'terms';

export interface ProductSidebarSection {
  anchorId: string;
  errors: string[];
  key: string;
  label: string;
  status: boolean;
}

export interface ProductDraft {
  categoryPath?: string[];
  savedAt?: string;
  values?: Record<string, unknown>;
}

export interface DropdownCategory {
  id: string;
  name: string;
  parentId: string | null;
  hasChildren: boolean;
  level: number;
  path: string[] | string;
  slug?: string;
}

export interface ProductListItem {
  id: string;
  name: string;
  brand?: string;
  price: number;
  status: ProductStatus;
  vendorName?: string;
  mainImages?: string[];
  createdAt?: string;
}

// ── Category dropdown ───────────────────────────────────────────────────────
export interface DropdownCategory {
  id: string;
  name: string;
  parentId: string | null;
  hasChildren: boolean;
  level: number;
  path: string[] | string;
  slug?: string;
}

export interface RecentCategory {
  id: string;
  name: string;
  path: string[] | string;
  usedAt: Date;
}
