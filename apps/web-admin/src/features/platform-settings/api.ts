import { axiosClient } from '@/lib/axios/axios-client';
import { directUploadFile } from '@/lib/media-upload';

export interface Banner {
  id?: string;
  imageUrl: string;
  linkType: 'PRODUCT' | 'CATEGORY' | 'EXTERNAL' | 'NONE';
  linkValue?: string;
  title?: string;
  order: number;
  isActive: boolean;
}

export class PlatformSettingsApiService {
  /**
   * Fetch all banners for admin (including inactive ones)
   */
  static async getBanners(): Promise<Banner[]> {
    const response = await axiosClient.get('/banners/all');
    return response.data?.data || [];
  }

  /**
   * Bulk update banners
   */
  static async updateBanners(banners: Banner[]): Promise<Banner[]> {
    const response = await axiosClient.put('/banners', { banners });
    return response.data?.data || [];
  }

  /**
   * Upload banner image directly to Cloudflare R2
   */
  static async uploadBannerImage(file: File): Promise<string> {
    return directUploadFile(file, 'celebs/banners');
  }
}
