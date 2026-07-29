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

export class ProductApiService {
  private static readonly BASE_PATH = '/products';

  static async createProduct(data: CreateProductRequest): Promise<ApiResponse<ProductRecord>> {
    const response = await ProductAPI.post<ApiResponse<ProductRecord>>(
      ProductApiService.BASE_PATH,
      data,
    );
    return response.data;
  }

  static async getProducts(filters?: ProductFilterRequest): Promise<ApiResponse<PaginatedProductsResponse>> {
    const response = await ProductAPI.get<ApiResponse<PaginatedProductsResponse>>(
      ProductApiService.BASE_PATH,
      { params: filters }
    );
    return response.data;
  }

  static async getProductById(id: string): Promise<ApiResponse<ProductRecord>> {
    const response = await ProductAPI.get<ApiResponse<ProductRecord>>(
      `${ProductApiService.BASE_PATH}/${id}`
    );
    return response.data;
  }

  static async getProductReviewQueue(page = 1, limit = 10): Promise<ApiResponse<PaginatedProductsResponse>> {
    const response = await ProductAPI.get<ApiResponse<PaginatedProductsResponse>>(
      `${ProductApiService.BASE_PATH}/review-product-queue`,
      { params: { page, limit } }
    );
    return response.data;
  }

  static async submitProductForReview(id: string): Promise<ApiResponse<ProductRecord>> {
    const response = await ProductAPI.post<ApiResponse<ProductRecord>>(
      `${ProductApiService.BASE_PATH}/${id}/submit-for-review`
    );
    return response.data;
  }

  static async reviewProduct(
    id: string,
    payload: ReviewProductRequestPayload | 'approve' | 'reject',
    note?: string
  ): Promise<ApiResponse<ProductRecord>> {
    const body = typeof payload === 'object' ? payload : { action: payload, note };
    const response = await ProductAPI.post<ApiResponse<ProductRecord>>(
      `${ProductApiService.BASE_PATH}/${id}/review`,
      body
    );
    return response.data;
  }

  static async archiveProduct(id: string): Promise<ApiResponse<ProductRecord>> {
    const response = await ProductAPI.post<ApiResponse<ProductRecord>>(
      `${ProductApiService.BASE_PATH}/${id}/archive`
    );
    return response.data;
  }

  static async toggleProductActivation(id: string): Promise<ApiResponse<ProductRecord>> {
    const response = await ProductAPI.post<ApiResponse<ProductRecord>>(
      `${ProductApiService.BASE_PATH}/${id}/toggle-activation`
    );
    return response.data;
  }

  static async updateProduct(id: string, data: UpdateProductRequest): Promise<ApiResponse<ProductRecord>> {
    const response = await ProductAPI.put<ApiResponse<ProductRecord>>(
      `${ProductApiService.BASE_PATH}/${id}`,
      data
    );
    return response.data;
  }

  static async uploadFiles(files: Array<File | string | null | undefined>): Promise<string[]> {
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
}
