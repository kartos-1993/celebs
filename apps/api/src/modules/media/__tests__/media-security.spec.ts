import { describe, it, expect } from 'vitest';
import {
  validateImageMagicBytes,
  confirmUploadedObject,
  assertUploadMeta,
  MAX_UPLOAD_BYTES,
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
        }),
      ).rejects.toThrow('Invalid object key');
    });

    it('should reject backslash or absolute root path traversal in key', async () => {
      await expect(
        confirmUploadedObject({
          key: '\\Windows\\System32\\cmd.exe',
          originalname: 'hack.jpg',
          mimeType: 'image/jpeg',
        }),
      ).rejects.toThrow('Invalid object key');
    });

    it('should reject object keys outside allowed prefixes (celebs/products & celebs/kyc)', async () => {
      await expect(
        confirmUploadedObject({
          key: 'celebs/secrets/admin.jpg',
          originalname: 'admin.jpg',
          mimeType: 'image/jpeg',
        }),
      ).rejects.toThrow('Invalid object key prefix');
    });
  });

  describe('File Size & MIME Meta Validation', () => {
    it('should reject files exceeding 5MB limit', () => {
      expect(() =>
        assertUploadMeta({
          originalname: 'big.jpg',
          mimeType: 'image/jpeg',
          size: MAX_UPLOAD_BYTES + 1,
        }),
      ).toThrow('Each image must be <= 5MB');
    });

    it('should reject non-image MIME types (including PDF)', () => {
      expect(() =>
        assertUploadMeta({
          originalname: 'document.pdf',
          mimeType: 'application/pdf',
          size: 1024,
        }),
      ).toThrow('Invalid file type. Allowed: jpeg, png, webp, avif');
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
});
