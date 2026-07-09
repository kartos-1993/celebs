import { ProductAPI } from '@/lib/axios-client';

export interface CreateProductRequest {
  name: string;
  brand?: string;
  description: string;
  price: number;
  discountedPrice?: number;
  categoryId: string;
  subcategoryId: string;
  sizes: Array<{
    name: string;
    productMeasurements: Array<{ name: string; value: string; unit: string }>;
    bodyMeasurements: Array<{ name: string; value: string; unit: string }>;
  }>;
  colorVariants: Array<{
    name: string;
    colorCode: string;
    images: string[];
    stocks: Array<{ size: string; quantity: number }>;
  }>;
  mainImages: string[];
  dynamicData?: Record<string, unknown>;
  tags?: string[];
  featured?: boolean;
  status: 'draft' | 'pending_review' | 'published' | 'rejected' | 'deactivated' | 'archived';
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

export class ProductApiService {
  private static readonly BASE_PATH = '/products';

  static async createProduct(data: CreateProductRequest) {
    const response = await ProductAPI.post<ApiResponse<unknown>>(
      ProductApiService.BASE_PATH,
      data,
    );
    return response.data;
  }

  static async getProducts(filters?: Record<string, any>) {
    const response = await ProductAPI.get<ApiResponse<any>>(
      ProductApiService.BASE_PATH,
      { params: filters }
    );
    return response.data;
  }

  static async getProductById(id: string) {
    const response = await ProductAPI.get<ApiResponse<any>>(
      `${ProductApiService.BASE_PATH}/${id}`
    );
    return response.data;
  }

  static async getProductReviewQueue(page = 1, limit = 10) {
    const response = await ProductAPI.get<ApiResponse<any>>(
      `${ProductApiService.BASE_PATH}/review-product-queue`,
      { params: { page, limit } }
    );
    return response.data;
  }

  static async submitProductForReview(id: string) {
    const response = await ProductAPI.post<ApiResponse<any>>(
      `${ProductApiService.BASE_PATH}/${id}/submit-for-review`
    );
    return response.data;
  }

  static async reviewProduct(id: string, action: 'approve' | 'reject', note?: string) {
    const response = await ProductAPI.post<ApiResponse<any>>(
      `${ProductApiService.BASE_PATH}/${id}/review`,
      { action, note }
    );
    return response.data;
  }

  static async archiveProduct(id: string) {
    const response = await ProductAPI.post<ApiResponse<any>>(
      `${ProductApiService.BASE_PATH}/${id}/archive`
    );
    return response.data;
  }

  static async toggleProductActivation(id: string) {
    const response = await ProductAPI.post<ApiResponse<any>>(
      `${ProductApiService.BASE_PATH}/${id}/toggle-activation`
    );
    return response.data;
  }

  static async updateProduct(id: string, data: any) {
    const response = await ProductAPI.put<ApiResponse<any>>(
      `${ProductApiService.BASE_PATH}/${id}`,
      data
    );
    return response.data;
  }

  static async uploadFiles(files: Array<File | string | null | undefined>) {
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
