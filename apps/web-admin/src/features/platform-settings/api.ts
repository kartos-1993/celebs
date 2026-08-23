import { axiosClient } from '@/lib/axios/axios-client';
import { directUploadFile } from '@/lib/media-upload';

import type { SDUIPageLayout } from '@celebs/shared-types';

export interface Banner {
  id?: string;
  imageUrl: string;
  linkType: 'PRODUCT' | 'CATEGORY' | 'EXTERNAL' | 'NONE';
  linkValue?: string;
  title?: string;
  order: number;
  isActive: boolean;
}

export interface SDUI_LAYOUT_META {
  key: string;
  label: string;
}

export const SDUI_LAYOUT_KEYS: Record<string, SDUI_LAYOUT_META> = {
  layout_home: { key: 'layout_home', label: 'Home Page Layout (SDUI)' },
};

export interface PlatformSettingResponse<T = string> {
  success: boolean;
  message: string;
  data: { key: string; value: T; type?: string; updatedAt?: string };
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
   * Upload banner image directly to Cloudflare R2.
   * Uses the 'platform' key prefix (API allowlist) with MARKETING scope,
   * producing keys like platform/marketing/<uuid>-<name>.webp
   */
  static async uploadBannerImage(file: File): Promise<string> {
    return directUploadFile(file, 'platform', 'MARKETING');
  }

  /**
   * Fetch an SDUI page layout setting (e.g. layout_home).
   * Returns null when the layout has never been published.
   */
  static async getLayout(key: string): Promise<SDUIPageLayout | null> {
    try {
      const response = await axiosClient.get<PlatformSettingResponse>(`/settings/${key}`);
      const parsed = JSON.parse(response.data?.data?.value) as SDUIPageLayout;
      return parsed;
    } catch {
      return null;
    }
  }

  /**
   * Publish an SDUI page layout via the platform settings upsert endpoint.
   * Cache invalidation + audit logging happen server-side.
   */
  static async publishLayout(key: string, layout: SDUIPageLayout): Promise<void> {
    await axiosClient.post('/settings', {
      key,
      value: JSON.stringify(layout),
      type: 'JSON',
      group: 'SDUI',
      label: SDUI_LAYOUT_KEYS[key]?.label ?? key,
      isPublic: true,
      reason: `SDUI layout publish for ${key}`,
    });
  }
}
