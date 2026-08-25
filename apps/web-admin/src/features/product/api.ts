import type { IApiResponse } from '@celebs/shared-types';

import type {
  CreateProductRequest,
  ProductFilterRequest,
  ProductRecord,
  UpdateProductRequest,
} from './types';

import { axiosClient } from '@/lib/axios/axios-client';
import { directUploadBatch } from '@/lib/media-upload';

// Public type aliases — required by manage-product, use-product-queries, add-product
export type {
  CreateProductRequest,
  ProductFilterRequest,
  ProductRecord,
  UpdateProductRequest,
} from './types';
export type ProductApiResponse<T> = IApiResponse<T>;

export interface PaginatedProductsResponse {
  products: ProductRecord[];
  total: number;
  page?: number;
  limit?: number;
  nextCursor?: string;
  hasMore?: boolean;
}

export interface ReviewProductRequestPayload {
  action: 'approve' | 'reject';
  note?: string;
  rejectionCategory?: string;
  rejectionSubcategories?: string[];
  rejectionFields?: string[];
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
};
