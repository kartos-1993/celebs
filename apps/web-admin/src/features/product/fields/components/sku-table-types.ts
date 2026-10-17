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

/**
 * Batch-apply draft state. Every key here is written by
 * `collectApplyAssignments` (see `APPLY_ALL_FIELD_NAMES`) and read back by
 * `buildPayloadSkus` into `skus[]`. `freeItems`/`available` were removed: no
 * `skuItemSchema` key and no API/Prisma column exists for them, so they were
 * collected, applied, and then silently dropped by the payload.
 */
export interface ApplyAllState {
  price?: string;
  specialPrice?: string;
  stock?: string;
  sellerSku?: string;
}

export interface ScopeOption {
  value: string;
  label: string;
}

/** One editable variant cell: its RHF path plus the option values behind the path. */
export interface SkuFieldItem {
  path: string;
  options: string[];
}
