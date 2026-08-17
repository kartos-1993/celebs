import { z } from 'zod';

import {
  batchPresignSchema,
  confirmUploadSchema,
  presignFileSchema,
} from '../validators/media.validator';

export type PresignFileInput = z.infer<typeof presignFileSchema>;
export type BatchPresignInput = z.infer<typeof batchPresignSchema>;
export type ConfirmUploadInput = z.infer<typeof confirmUploadSchema>;

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

export interface MediaAsset {
  key: string;
  url: string;
  bytes: number;
  contentType: string;
  originalname: string;
  derivatives?: MediaDerivatives;
}

export interface UploadedFileResponse {
  url: string;
  publicId: string;
  bytes?: number;
  format?: string;
  originalname?: string;
  derivatives?: MediaDerivatives;
}
