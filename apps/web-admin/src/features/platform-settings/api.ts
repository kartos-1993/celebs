import { axiosClient } from '@/lib/axios/axios-client';

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
   * Upload banner image
   */
  static async uploadBannerImage(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('files', file);

    const response = await axiosClient.post('/media/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    const urls = (response.data?.data ?? []).map((f: { url: string }) => f.url);
    if (urls.length > 0) {
      return urls[0];
    }
    throw new Error('Image upload failed');
  }
}
