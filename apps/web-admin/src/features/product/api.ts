import type { IApiResponse } from '@celebs/shared-types';
import type { CategoryAttributeType, CategoryTreeNode, RecentCategory } from '@celebs/shared-types';

import type {
  CreateProductRequest,
  DropdownCategory,
  ProductFilterRequest,
  ProductRecord,
  ReviewProductRequestPayload,
  UpdateProductRequest,
} from './types';
export type { ReviewProductRequestPayload } from './types';

import { axiosClient } from '@/lib/axios/axios-client';
import { directUploadBatch } from '@/lib/media-upload';

export type ProductApiResponse<T> = IApiResponse<T>;

export interface PaginatedProductsResponse {
  products: ProductRecord[];
  total: number;
  page?: number;
  limit?: number;
  nextCursor?: string;
  hasMore?: boolean;
}

const BASE_PATH = '/products';
/** Uploads ride the shared client but with an extended timeout. */
const _UPLOAD_TIMEOUT_MS = 120_000;

export async function createProduct(
  data: CreateProductRequest,
): Promise<ProductApiResponse<ProductRecord>> {
  const response = await axiosClient.post<ProductApiResponse<ProductRecord>>(BASE_PATH, data);
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

export async function getProductById(id: string): Promise<ProductApiResponse<ProductRecord>> {
  const response = await axiosClient.get<ProductApiResponse<ProductRecord>>(`${BASE_PATH}/${id}`);
  return response.data;
}

export async function updateProduct(
  id: string,
  data: UpdateProductRequest,
): Promise<ProductApiResponse<ProductRecord>> {
  const response = await axiosClient.put<ProductApiResponse<ProductRecord>>(
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
): Promise<ProductApiResponse<ProductRecord>> {
  const response = await axiosClient.post<ProductApiResponse<ProductRecord>>(
    `${BASE_PATH}/${id}/submit-for-review`,
  );
  return response.data;
}

/** Single payload signature — callers pass `{ action: 'approve' }` etc. */
export async function reviewProduct(
  id: string,
  payload: ReviewProductRequestPayload,
): Promise<ProductApiResponse<ProductRecord>> {
  const response = await axiosClient.post<ProductApiResponse<ProductRecord>>(
    `${BASE_PATH}/${id}/review`,
    payload,
  );
  return response.data;
}

export async function archiveProduct(id: string): Promise<ProductApiResponse<ProductRecord>> {
  const response = await axiosClient.post<ProductApiResponse<ProductRecord>>(
    `${BASE_PATH}/${id}/archive`,
  );
  return response.data;
}

export async function toggleProductActivation(
  id: string,
): Promise<ProductApiResponse<ProductRecord>> {
  const response = await axiosClient.post<ProductApiResponse<ProductRecord>>(
    `${BASE_PATH}/${id}/toggle-activation`,
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
};
