import type { CreateProductType, ProductFilterType, UpdateProductType } from '@celebs/shared-types';

export type CreateProductRequest = CreateProductType;
export type UpdateProductRequest = UpdateProductType;
export type ProductFilterRequest = ProductFilterType;

export interface ReviewProductRequestPayload {
  action: 'approve' | 'reject';
  note?: string;
  rejectionCategory?: string;
  rejectionSubcategories?: string[];
  rejectionFields?: string[];
}

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
  storeId?: string;
  values?: Record<string, unknown>;
}

// ── Cascading category dropdown UI state ────────────────────────────────
export interface DropdownColumn {
  parentId: string | null;
  parentName: string;
  searchQuery: string;
}

// ── Manage list UI state ────────────────────────────────────────────────
export type ProductSortKey = 'newest' | 'price-asc' | 'price-desc' | 'name-asc';

export type StockState = 'in' | 'low' | 'out';

export type PreviewStockFilter = 'all' | StockState;

export interface PreviewFilters {
  vendor: string;
  category: string;
  stock: PreviewStockFilter;
}
