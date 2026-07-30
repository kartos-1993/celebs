import { ProductAPI } from '@/lib/axios-client';
import type { CreateProductType, UpdateProductType, ProductFilterType, ProductType } from '@celebs/shared-types';

export type CreateProductRequest = CreateProductType;
export type UpdateProductRequest = UpdateProductType;
export type ProductFilterRequest = ProductFilterType;
export type ProductRecord = ProductType;

export interface PaginatedProductsResponse {
  products: ProductRecord[];
  total: number;
  nextCursor?: string;
  hasMore?: boolean;
}

interface ApiResponse<T> {
  success?: boolean;
  message?: string;
  data: T;
}

interface UploadedFileResponse {
  url: string;
  publicId?: string;
  bytes?: number;
  format?: string;
  originalname?: string;
}

export interface ReviewProductRequestPayload {
  action: 'approve' | 'reject';
  note?: string;
  rejectionCategory?: string;
  rejectionSubcategories?: string[];
  rejectionFields?: string[];
}

const BASE_PATH = '/products';

export async function createProduct(data: CreateProductRequest): Promise<ApiResponse<ProductRecord>> {
  const response = await ProductAPI.post<ApiResponse<ProductRecord>>(
    BASE_PATH,
    data,
  );
  return response.data;
}

export async function getProducts(filters?: ProductFilterRequest): Promise<ApiResponse<PaginatedProductsResponse>> {
  const response = await ProductAPI.get<ApiResponse<PaginatedProductsResponse>>(
    BASE_PATH,
    { params: filters }
  );
  return response.data;
}

export async function getProductById(id: string): Promise<ApiResponse<ProductRecord>> {
  const response = await ProductAPI.get<ApiResponse<ProductRecord>>(
    `${BASE_PATH}/${id}`
  );
  return response.data;
}

export async function getProductReviewQueue(page = 1, limit = 10): Promise<ApiResponse<PaginatedProductsResponse>> {
  const response = await ProductAPI.get<ApiResponse<PaginatedProductsResponse>>(
    `${BASE_PATH}/review-product-queue`,
    { params: { page, limit } }
  );
  return response.data;
}

export async function submitProductForReview(id: string): Promise<ApiResponse<ProductRecord>> {
  const response = await ProductAPI.post<ApiResponse<ProductRecord>>(
    `${BASE_PATH}/${id}/submit-for-review`
  );
  return response.data;
}

export async function reviewProduct(
  id: string,
  payload: ReviewProductRequestPayload | 'approve' | 'reject',
  note?: string
): Promise<ApiResponse<ProductRecord>> {
  const body = typeof payload === 'object' ? payload : { action: payload, note };
  const response = await ProductAPI.post<ApiResponse<ProductRecord>>(
    `${BASE_PATH}/${id}/review`,
    body
  );
  return response.data;
}

export async function archiveProduct(id: string): Promise<ApiResponse<ProductRecord>> {
  const response = await ProductAPI.post<ApiResponse<ProductRecord>>(
    `${BASE_PATH}/${id}/archive`
  );
  return response.data;
}

export async function toggleProductActivation(id: string): Promise<ApiResponse<ProductRecord>> {
  const response = await ProductAPI.post<ApiResponse<ProductRecord>>(
    `${BASE_PATH}/${id}/toggle-activation`
  );
  return response.data;
}

export async function updateProduct(id: string, data: UpdateProductRequest): Promise<ApiResponse<ProductRecord>> {
  const response = await ProductAPI.put<ApiResponse<ProductRecord>>(
    `${BASE_PATH}/${id}`,
    data
  );
  return response.data;
}

export async function uploadFiles(files: Array<File | string | null | undefined>): Promise<string[]> {
  const existingUrls = files.filter(
    (file): file is string => typeof file === 'string' && file.length > 0,
  );
  const pendingFiles = files.filter(
    (file): file is File => file instanceof File,
  );

  if (pendingFiles.length === 0) {
    return existingUrls;
  }

  const formData = new FormData();
  pendingFiles.forEach((file) => formData.append('files', file));

  const response = await ProductAPI.post<ApiResponse<UploadedFileResponse[]>>(
    '/media/upload',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );

  const uploadedUrls = (response.data?.data ?? [])
    .map((file) => file.url)
    .filter(Boolean);

  return [...existingUrls, ...uploadedUrls];
}

export const ProductApiService = {
  createProduct,
  getProducts,
  getProductById,
  getProductReviewQueue,
  submitProductForReview,
  reviewProduct,
  archiveProduct,
  toggleProductActivation,
  updateProduct,
  uploadFiles,
};



