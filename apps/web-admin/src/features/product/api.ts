import type {
  AdminProductDetail,
  AdminProductListItem,
  CategoryAttributeType,
  CategoryTreeNode,
  DropdownCategory,
  IApiResponse,
  RecentCategory,
} from '@celebs/shared-types';
import { logger } from '@celebs/shared-utils';

import type {
  CreateProductRequest,
  FieldSpec,
  ProductFilterRequest,
  ReviewProductRequestPayload,
  UpdateProductRequest,
} from './types';
export type { ReviewProductRequestPayload } from './types';

import { axiosClient } from '@/lib/axios/axios-client';
import { directUploadBatch } from '@/lib/media-upload';

export type ProductApiResponse<T> = IApiResponse<T>;

export interface PaginatedProductsResponse {
  products: AdminProductListItem[];
  total: number;
  page?: number;
  limit?: number;
  nextCursor?: string;
  hasMore?: boolean;
}

const BASE_PATH = '/products';
/** Uploads ride the shared client but with an extended timeout. */
const _UPLOAD_TIMEOUT_MS = 120_000;

/**
 * Product feature — centralized TanStack Query key factory (FSD mandates §2, §9).
 * Canonical home for ALL product-feature query keys; every hook imports from
 * here (`../api`) instead of defining local factories.
 *
 * Centralization note: `PRODUCT_QUERY_KEYS` previously lived in
 * `hooks/use-product-queries.ts` and `PRODUCT_SCHEMA_QUERY_KEYS` in
 * `hooks/use-product-schema.ts` (split factories — cache identity could drift
 * between owners). Both now live here. The hook modules re-export the same
 * object under their legacy names so call sites outside this feature's owned
 * file set keep compiling; both names therefore resolve to ONE identity.
 */
export const PRODUCT_QUERY_KEYS = {
  all: ['products'] as const,
  lists: () => [...PRODUCT_QUERY_KEYS.all, 'list'] as const,
  list: (params: ProductFilterRequest) => [...PRODUCT_QUERY_KEYS.all, 'list', params] as const,
  selector: (search?: string) => [...PRODUCT_QUERY_KEYS.all, 'selector', search] as const,
  reviewQueues: () => [...PRODUCT_QUERY_KEYS.all, 'review-queue'] as const,
  reviewQueue: (page: number, limit: number) =>
    [...PRODUCT_QUERY_KEYS.all, 'review-queue', { page, limit }] as const,
  details: () => [...PRODUCT_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...PRODUCT_QUERY_KEYS.all, 'detail', id] as const,
  categoryTree: () => [...PRODUCT_QUERY_KEYS.all, 'category-tree'] as const,
  categoryRecent: () => [...PRODUCT_QUERY_KEYS.all, 'category-recent'] as const,
  categorySearch: (query: string) => [...PRODUCT_QUERY_KEYS.all, 'category-search', query] as const,
  variantAxes: (path: string, paramsKey: string) =>
    [...PRODUCT_QUERY_KEYS.all, 'variant-axes', path, paramsKey] as const,
  schemaAll: ['product-schema'] as const,
  schemaRender: (catId: string, productId?: string) =>
    [...PRODUCT_QUERY_KEYS.schemaAll, 'render', catId, productId ?? 'new'] as const,
};

export async function createProduct(
  data: CreateProductRequest,
): Promise<ProductApiResponse<AdminProductDetail>> {
  const response = await axiosClient.post<ProductApiResponse<AdminProductDetail>>(BASE_PATH, data);
  return response.data;
}

export async function getProducts(
  filters?: ProductFilterRequest,
): Promise<ProductApiResponse<PaginatedProductsResponse>> {
  const response = await axiosClient.get<ProductApiResponse<PaginatedProductsResponse>>(BASE_PATH, {
    params: filters,
  });
  return response.data;
}

export async function getProductById(id: string): Promise<ProductApiResponse<AdminProductDetail>> {
  const response = await axiosClient.get<ProductApiResponse<AdminProductDetail>>(
    `${BASE_PATH}/${id}`,
  );
  return response.data;
}

export async function updateProduct(
  id: string,
  data: UpdateProductRequest,
): Promise<ProductApiResponse<AdminProductDetail>> {
  const response = await axiosClient.put<ProductApiResponse<AdminProductDetail>>(
    `${BASE_PATH}/${id}`,
    data,
  );
  return response.data;
}

export async function getProductReviewQueue(
  page = 1,
  limit = 10,
): Promise<ProductApiResponse<PaginatedProductsResponse>> {
  const response = await axiosClient.get<ProductApiResponse<PaginatedProductsResponse>>(
    `${BASE_PATH}/review-product-queue`,
    { params: { page, limit } },
  );
  return response.data;
}

export async function submitProductForReview(
  id: string,
): Promise<ProductApiResponse<AdminProductDetail>> {
  const response = await axiosClient.post<ProductApiResponse<AdminProductDetail>>(
    `${BASE_PATH}/${id}/submit-for-review`,
  );
  return response.data;
}

/** Single payload signature — callers pass `{ action: 'approve' }` etc. */
export async function reviewProduct(
  id: string,
  payload: ReviewProductRequestPayload,
): Promise<ProductApiResponse<AdminProductDetail>> {
  const response = await axiosClient.post<ProductApiResponse<AdminProductDetail>>(
    `${BASE_PATH}/${id}/review`,
    payload,
  );
  return response.data;
}

export async function archiveProduct(id: string): Promise<ProductApiResponse<AdminProductDetail>> {
  const response = await axiosClient.delete<ProductApiResponse<AdminProductDetail>>(
    `${BASE_PATH}/${id}`,
  );
  return response.data;
}

export async function toggleProductActivation(
  id: string,
): Promise<ProductApiResponse<AdminProductDetail>> {
  const response = await axiosClient.patch<ProductApiResponse<AdminProductDetail>>(
    `${BASE_PATH}/${id}`,
  );
  return response.data;
}

/**
 * Uploads media files directly to Cloudflare R2 via presigned URLs.
 * Accepts a mix of already-uploaded URLs (passed through untouched)
 * and File instances (uploaded directly to R2).
 * Returns the ordered list of public URLs.
 */
export async function uploadFiles(
  files: Array<File | string | null | undefined>,
): Promise<string[]> {
  const existingUrls = files.filter(
    (file): file is string => typeof file === 'string' && file.length > 0,
  );
  const pendingFiles = files.filter((file): file is File => file instanceof File);

  if (pendingFiles.length === 0) return existingUrls;

  const uploadedUrls = await directUploadBatch(pendingFiles, 'celebs/products');

  return [...existingUrls, ...uploadedUrls];
}

/**
 * Product-side category read client. The category backend routes are the
 * shared contract; each feature colocates its own thin client instead of
 * importing across features (see FSD mandates).
 */
const CATEGORY_BASE_PATH = '/category';

export async function getDropdownCategoryTree(): Promise<ProductApiResponse<CategoryTreeNode[]>> {
  const response = await axiosClient.get<ProductApiResponse<CategoryTreeNode[]>>(
    `${CATEGORY_BASE_PATH}/tree-with-attributes`,
  );
  return response.data;
}

interface CategorySearchResultItem {
  id: string;
  name: string;
  parentCategory?: string | null;
  hasChildren?: boolean;
  level?: number;
  path?: string[] | string;
  slug?: string;
}

export async function searchDropdownCategories(query: string): Promise<DropdownCategory[]> {
  const response = await axiosClient.get(`${CATEGORY_BASE_PATH}/search`, {
    params: { q: query, limit: 20 },
  });
  // Safety shim (kept intentionally): the canonical envelope is
  // `{ data: [...] }`, but a bare-array payload is still tolerated so a
  // backend drift never hard-crashes the dropdown. Backend drift must still
  // get noticed — hence the dev-only warn below (no behavior change in prod).
  // Implemented via `logger` (not raw `console.warn`) to satisfy the
  // `no-console` lint rule.
  const envelopeItems: unknown = response.data?.data;
  if (import.meta.env.DEV && envelopeItems === undefined && response.data !== undefined) {
    logger.warn(
      { payload: response.data },
      'searchDropdownCategories: envelope fallback fired (expected response.data.data)',
    );
  }
  const items: CategorySearchResultItem[] = response.data?.data ?? response.data ?? [];
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    parentCategory: item.parentCategory ?? null,
    hasChildren: Boolean(item.hasChildren),
    level:
      item.level ??
      (Array.isArray(item.path)
        ? item.path.length - 1
        : typeof item.path === 'string'
          ? item.path.split('/').length - 1
          : 0),
    path: Array.isArray(item.path)
      ? item.path
      : typeof item.path === 'string'
        ? item.path.split('/')
        : [item.name],
    slug: item.slug,
  }));
}

export async function getDropdownRecentCategories(): Promise<ProductApiResponse<RecentCategory[]>> {
  const response = await axiosClient.get<ProductApiResponse<RecentCategory[]>>(
    `${CATEGORY_BASE_PATH}/recent`,
  );
  return response.data;
}

export async function recordDropdownRecentCategory(
  categoryId: string,
): Promise<ProductApiResponse<RecentCategory[]>> {
  const response = await axiosClient.post<ProductApiResponse<RecentCategory[]>>(
    `${CATEGORY_BASE_PATH}/recent`,
    { categoryId },
  );
  return response.data;
}

export interface DropdownCategoryDetail {
  attributes?: CategoryAttributeType[];
}

export async function getDropdownCategoryById(
  id: string,
): Promise<ProductApiResponse<DropdownCategoryDetail>> {
  const response = await axiosClient.get<ProductApiResponse<DropdownCategoryDetail>>(
    `${CATEGORY_BASE_PATH}/${id}`,
  );
  return response.data;
}

export interface ProductRenderSchemaResponse {
  fields: FieldSpec[];
  renderTag: string;
  catId: string;
}

export async function fetchProductRenderSchema(
  catId: string,
  productId?: string,
): Promise<ProductApiResponse<ProductRenderSchemaResponse>> {
  const response = await axiosClient.get<ProductApiResponse<ProductRenderSchemaResponse>>(
    '/product-render',
    { params: { catId, locale: 'en_US', productId } },
  );
  return response.data;
}

/**
 * Variant-axis read backing the SKU matrix. The render schema supplies the
 * path at runtime (`dataSource.fetch`, e.g. `/option-sets/:id`), so this stays
 * a pass-through — but the request still lives here so no hook calls
 * `axiosClient` directly (AGENTS.md §9). Returns `response.data` like every
 * other client function (§8); envelope shape is validated by the caller
 * (`parseVariantAxesResponse`) and never guessed here.
 */
export async function getVariantAxes(
  path: string,
  params?: Record<string, unknown>,
): Promise<unknown> {
  const response = await axiosClient.get(path, { params });
  return response.data;
}

/** Structured per-field error detail (server sends `errors[]` additively). */
export interface SubmitErrorDetail {
  field?: string;
  message: string;
}

/** Normalized submit-failure contract shared by every caller. */
export interface ParsedSubmitError {
  /** Field-mapped errors for `form.setError`; empty for global failures. */
  fieldErrors: Array<{ path: string; message: string }>;
  /** Best single human-readable message for toasts ('' when unknown). */
  message: string;
}

const asErrorRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : undefined;

const normalizeSubmitText = (value: unknown): string =>
  value === null || value === undefined ? '' : String(value).trim();

/** One raw entry (object OR bare string) normalized into `{ path, message }`. */
const readSubmitEntry = (entry: unknown): { path: string; message: string } | undefined => {
  const record = asErrorRecord(entry);
  const message = normalizeSubmitText(record ? (record.message ?? record.msg) : entry);
  if (!message) return undefined;
  return { path: normalizeSubmitText(record?.field ?? record?.path), message };
};

const pickSubmitEntries = (...candidates: unknown[]): unknown[] => {
  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length > 0) return candidate;
  }
  return [];
};

const toFieldErrors = (entries: unknown[]): ParsedSubmitError['fieldErrors'] => {
  const fieldErrors: ParsedSubmitError['fieldErrors'] = [];
  for (const entry of entries) {
    const parsed = readSubmitEntry(entry);
    if (parsed?.path) fieldErrors.push({ path: parsed.path, message: parsed.message });
  }
  return fieldErrors;
};

const firstUnmappedMessage = (entries: unknown[]): string => {
  for (const entry of entries) {
    const parsed = readSubmitEntry(entry);
    if (parsed && !parsed.path) return parsed.message;
  }
  return '';
};

/**
 * Submit-error parsing contract (owned by api.ts; the submit hook in
 * `use-add-product-submit.ts` belongs to another stream and must NOT be
 * touched — it should adopt this helper when it can).
 *
 * Prefers the structured `errors[]` shape the server now returns additively
 * (`errors?: Array<{ field?: string; message: string }>`). The axios response
 * interceptor flattens the envelope, so the array surfaces at the ROOT of the
 * rejection; `response.data.errors` is still read for raw AxiosError rejections
 * that bypass the interceptor. Legacy shapes (`data` arrays, plain
 * `message`-only envelopes, bare strings) remain supported as fallbacks.
 */
export function parseSubmitError(error: unknown): ParsedSubmitError {
  const root = asErrorRecord(error);
  const responsePayload = asErrorRecord(asErrorRecord(root?.response)?.data);
  const structured = pickSubmitEntries(root?.errors, responsePayload?.errors);
  const entries =
    structured.length > 0 ? structured : pickSubmitEntries(root?.data, responsePayload?.data);
  return {
    fieldErrors: toFieldErrors(entries),
    message:
      firstUnmappedMessage(entries) ||
      normalizeSubmitText(responsePayload?.message) ||
      normalizeSubmitText(root?.message) ||
      (typeof error === 'string' ? error.trim() : ''),
  };
}

export const ProductApiService = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  getProductReviewQueue,
  submitProductForReview,
  reviewProduct,
  archiveProduct,
  toggleProductActivation,
  uploadFiles,
  getDropdownCategoryTree,
  getDropdownCategoryById,
  searchDropdownCategories,
  getDropdownRecentCategories,
  recordDropdownRecentCategory,
  fetchProductRenderSchema,
  getVariantAxes,
};
