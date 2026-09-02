import { describe, expect, it } from 'vitest';

import {
  assertUploadMeta,
  confirmUploadedObject,
  MAX_UPLOAD_BYTES,
  validateImageMagicBytes,
} from '../storage.service';

describe('Media Upload Security Unit & Integration Rules', () => {
  describe('validateImageMagicBytes Header Inspection', () => {
    it('should pass valid JPEG header bytes', () => {
      const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
      expect(validateImageMagicBytes(jpegBuffer)).toBe(true);
    });

    it('should pass valid PNG header bytes', () => {
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      expect(validateImageMagicBytes(pngBuffer)).toBe(true);
    });

    it('should reject executable file header bytes (spoofed .exe renamed to .jpg)', () => {
      // Windows MZ executable header
      const exeBuffer = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00]);
      expect(validateImageMagicBytes(exeBuffer)).toBe(false);
    });

    it('should reject plain text or shell script headers', () => {
      const scriptBuffer = Buffer.from('#!/bin/bash\necho hack');
      expect(validateImageMagicBytes(scriptBuffer)).toBe(false);
    });
  });

  describe('Path Traversal & S3 Object Key Validation', () => {
    it('should reject relative path traversal in object key', async () => {
      await expect(
        confirmUploadedObject({
          key: '../../etc/passwd',
          originalname: 'hack.jpg',
          mimeType: 'image/jpeg',
          scope: 'PRODUCT',
        }),
      ).rejects.toThrow('Invalid object key');
    });

    it('should reject backslash or absolute root path traversal in key', async () => {
      await expect(
        confirmUploadedObject({
          key: '\\Windows\\System32\\cmd.exe',
          originalname: 'hack.jpg',
          mimeType: 'image/jpeg',
          scope: 'PRODUCT',
        }),
      ).rejects.toThrow('Invalid object key');
    });

    it('should reject object keys outside allowed prefixes (celebs/products & celebs/kyc)', async () => {
      await expect(
        confirmUploadedObject({
          key: 'celebs/secrets/admin.jpg',
          originalname: 'admin.jpg',
          mimeType: 'image/jpeg',
          scope: 'PRODUCT',
        }),
      ).rejects.toThrow('Invalid object key prefix');
    });
  });

  describe('File Size & MIME Meta Validation', () => {
    it('should reject files exceeding upload limit', () => {
      expect(() =>
        assertUploadMeta({
          originalname: 'big.jpg',
          mimeType: 'image/jpeg',
          size: MAX_UPLOAD_BYTES + 1,
        }),
      ).toThrow(/must be <=/);
      // Scope-specific limits
      expect(() =>
        assertUploadMeta({
          originalname: 'kyc.pdf',
          mimeType: 'application/pdf',
          size: 3 * 1024 * 1024,
          scope: 'KYC',
        }),
      ).toThrow('KYC files must be <= 2MB');
      expect(() =>
        assertUploadMeta({
          originalname: 'product.jpg',
          mimeType: 'image/jpeg',
          size: 6 * 1024 * 1024,
          scope: 'PRODUCT',
        }),
      ).toThrow('PRODUCT files must be <= 5MB');
    });

    it('should reject unaccepted MIME types', () => {
      expect(() =>
        assertUploadMeta({
          originalname: 'video.mp4',
          mimeType: 'video/mp4',
          size: 1024,
        }),
      ).toThrow('Invalid file type');
    });

    it('should accept valid image MIME types', () => {
      const meta = assertUploadMeta({
        originalname: 'photo.png',
        mimeType: 'image/png',
        size: 1024,
      });
      expect(meta.originalname).toBe('photo.png');
      expect(meta.mimeType).toBe('image/png');
    });
  });

  describe('Presigned PUT URL Generation & Schema Validation', () => {
    it('should create valid presigned PUT object metadata', async () => {
      const { createPresignedPut } = await import('../storage.service');
      const presign = await createPresignedPut({
        originalname: 'summer_dress.webp',
        mimeType: 'image/webp',
        size: 204800,
        scope: 'PRODUCT',
        folder: 'celebs/products',
      });

      expect(presign).toBeDefined();
      expect(presign.key).toContain('celebs/products/');
      expect(presign.key).toContain('summer_dress.webp');
      expect(presign.uploadUrl).toBeDefined();
      expect(presign.publicUrl).toBeDefined();
      expect(presign.headers['Content-Type']).toBe('image/webp');
      expect(presign.expiresIn).toBe(900);
    });

    it('should validate schemas from @celebs/shared-types', async () => {
      const { presignFileSchema, confirmUploadSchema } = await import('@celebs/shared-types');

      const validPresign = presignFileSchema.safeParse({
        originalname: 'test.jpg',
        mimeType: 'image/jpeg',
        size: 1000,
      });
      expect(validPresign.success).toBe(true);

      const invalidMime = presignFileSchema.safeParse({
        originalname: 'test.exe',
        mimeType: 'application/octet-stream',
        size: 1000,
      });
      expect(invalidMime.success).toBe(false);

      const validConfirm = confirmUploadSchema.safeParse({
        key: 'celebs/products/test.webp',
        originalname: 'test.webp',
        mimeType: 'image/webp',
        size: 5000,
      });
      expect(validConfirm.success).toBe(true);
    });
  });
});
