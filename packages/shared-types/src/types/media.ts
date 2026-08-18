import { z } from 'zod';

import {
  batchPresignSchema,
  confirmUploadSchema,
  presignFileSchema,
} from '../validators/media.validator';

export type PresignFileInput = z.infer<typeof presignFileSchema>;
export type BatchPresignInput = z.infer<typeof batchPresignSchema>;
export type ConfirmUploadInput = z.infer<typeof confirmUploadSchema>;

export type MediaScope = 'PRODUCT' | 'BRANDING' | 'KYC' | 'MARKETING';

export interface PresignFileResponse {
  key: string;
  uploadUrl: string;
  publicUrl: string;
  headers: Record<string, string>;
  expiresIn: number;
  originalname: string;
  mimeType: string;
  size: number;
}

export interface MediaDerivatives {
  zoom?: string; // 1500x1500px
  card?: string; // 750x750px
  thumb?: string; // 350x350px
  placeholder?: string; // 30x30px / blur hash
}

export interface MediaFolder {
  id: string;
  vendorId: string;
  name: string;
  parentId?: string | null;
  assetCount?: number;
  subFolders?: MediaFolder[];
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface MediaAsset {
  id?: string;
  vendorId?: string;
  folderId?: string | null;
  folder?: MediaFolder | null;
  originalName?: string;
  key: string;
  url: string;
  mimeType?: string;
  sizeBytes?: number;
  bytes?: number;
  contentType?: string;
  originalname?: string;
  width?: number | null;
  height?: number | null;
  aspectRatio?: number | null;
  hashSha256?: string | null;
  scope?: MediaScope;
  isPrivate?: boolean;
  usageCount?: number;
  derivatives?: MediaDerivatives;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface MediaQuota {
  vendorId: string;
  usedBytes: number;
  maxBytes: number;
  usedPercentage: number;
  tier: 'STARTER' | 'VERIFIED_MALL' | 'STRATEGIC_FLAGSHIP';
  unlinkedAssetCount: number;
  unlinkedSizeBytes: number;
}

export interface MediaPickerItem {
  id: string;
  url: string;
  originalName: string;
  width?: number | null;
  height?: number | null;
  aspectRatio?: number | null;
  sizeBytes: number;
  mimeType: string;
}

export interface UploadedFileResponse {
  url: string;
  publicId: string;
  bytes?: number;
  format?: string;
  originalname?: string;
  derivatives?: MediaDerivatives;
}

// Backward-compatible Aliases
export type MediaAssetDto = MediaAsset;
export type MediaFolderDto = MediaFolder;
export type MediaQuotaDto = MediaQuota;
export type MediaPickerItemDto = MediaPickerItem;
