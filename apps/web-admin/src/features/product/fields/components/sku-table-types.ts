export interface VariantDataSource {
  labels?: Record<string, Record<string, string>>;
  variants?: Array<{ key?: string; name?: string; label?: string; value?: string }>;
  fetch?: string;
  params?: Record<string, unknown>;
}

export interface VariantMetaItem {
  key: string;
  label: string;
}

export interface VariantSelection {
  key: string;
  label: string;
  values: string[];
}

export interface ApplyAllState {
  price?: string;
  specialPrice?: string;
  stock?: string;
  sellerSku?: string;
  freeItems?: string;
  available?: boolean;
}

export interface ScopeOption {
  value: string;
  label: string;
}
