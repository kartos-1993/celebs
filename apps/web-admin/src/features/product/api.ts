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
  status: 'draft' | 'published' | 'archived';
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
