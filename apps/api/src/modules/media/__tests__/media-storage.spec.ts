import { describe, expect, it } from 'vitest';

import {
  ALLOWED_IMAGE_MIME,
  assertUploadMeta,
  buildVendorObjectKey,
  CONTENT_HASH_LENGTH,
  contentHashKey,
  detectMimeFromMagicBytes,
  MAX_UPLOAD_BYTES,
  PRESIGN_EXPIRES_IN,
  validateImageMagicBytes,
  validateObjectKey,
} from '../storage.service';

describe('storage.service pure parts', () => {
  describe('pipeline constants', () => {
    it('pins the absolute ceiling, presign TTL, allowed MIME set, and hash length', () => {
      expect(MAX_UPLOAD_BYTES).toBe(10 * 1024 * 1024);
      expect(PRESIGN_EXPIRES_IN).toBe(15 * 60);
      expect(CONTENT_HASH_LENGTH).toBe(24);
      expect([...ALLOWED_IMAGE_MIME].sort()).toEqual(
        ['application/pdf', 'image/avif', 'image/jpeg', 'image/png', 'image/webp'].sort(),
      );
    });
  });

  describe('buildVendorObjectKey', () => {
    it('namespaces vendor uploads under vendors/<id>/<scope>/ with a uuid stamp', () => {
      const key = buildVendorObjectKey({
        vendorId: 'v1',
        scope: 'PRODUCT',
        originalname: 'a.jpg',
      });
      expect(key).toMatch(/^vendors\/v1\/product\/[0-9a-f-]{36}-a\.jpg$/);
    });

    it('falls back to a trimmed custom folder and sanitizes hostile names', () => {
      const key = buildVendorObjectKey({
        scope: 'PRODUCT',
        originalname: '../../evil?.jpg',
        folder: '/celebs/products/',
      });
      expect(key.startsWith('celebs/products/product/')).toBe(true);
      expect(key).not.toContain('..');
      expect(key).not.toContain('?');
      expect(key.endsWith('-evil_.jpg')).toBe(true);
    });

    it('mints unique keys per call (uuid suffix)', () => {
      const params = { scope: 'PRODUCT' as const, originalname: 'a.jpg' };
      expect(buildVendorObjectKey(params)).not.toBe(buildVendorObjectKey(params));
    });
  });

  describe('contentHashKey', () => {
    it('rebases the temp key directory onto the content hash', () => {
      expect(contentHashKey('celebs/products/tmp-uuid-a.jpg', 'abc123', 'a.jpg')).toBe(
        'celebs/products/abc123-a.jpg',
      );
    });

    it('defaults key-less temp keys to the platform prefix', () => {
      expect(contentHashKey('tmp-uuid-a.jpg', 'abc123', 'a.jpg')).toBe('platform/abc123-a.jpg');
    });
  });

  describe('validateObjectKey', () => {
    it('passes allowed prefixes through (trimmed)', () => {
      expect(validateObjectKey('  celebs/products/a.jpg ')).toBe('celebs/products/a.jpg');
      expect(validateObjectKey('vendors/v1/product/a.jpg')).toBe('vendors/v1/product/a.jpg');
    });

    it('rejects blank, traversal, absolute, and foreign-prefix keys', () => {
      expect(() => validateObjectKey('')).toThrow('Invalid object key');
      expect(() => validateObjectKey('../../etc/passwd')).toThrow('Invalid object key');
      expect(() => validateObjectKey('/celebs/products/a.jpg')).toThrow('Invalid object key');
      expect(() => validateObjectKey('celebs/secrets/a.jpg')).toThrow('Invalid object key prefix');
    });
  });

  describe('assertUploadMeta', () => {
    it('normalizes mime case and defaults the original name', () => {
      expect(assertUploadMeta({ mimeType: 'IMAGE/JPEG', size: 100, scope: 'PRODUCT' })).toEqual({
        originalname: 'image',
        mimeType: 'image/jpeg',
        size: 100,
      });
    });

    it('rejects bad mime, blank names, and non-positive sizes', () => {
      expect(() =>
        assertUploadMeta({ originalname: 'a.jpg', mimeType: 'image/gif', size: 100 }),
      ).toThrow('Invalid file type');
      expect(() =>
        assertUploadMeta({ originalname: '   ', mimeType: 'image/jpeg', size: 1 }),
      ).toThrow('originalname is required');
      expect(() =>
        assertUploadMeta({ originalname: 'a.jpg', mimeType: 'image/jpeg', size: 0 }),
      ).toThrow('size must be a positive number');
    });

    it('enforces per-scope ceilings (PRODUCT 5MB, KYC 2MB)', () => {
      expect(() =>
        assertUploadMeta({
          originalname: 'a.jpg',
          mimeType: 'image/jpeg',
          size: 5 * 1024 * 1024 + 1,
          scope: 'PRODUCT',
        }),
      ).toThrow('PRODUCT files must be <= 5MB');
      expect(() =>
        assertUploadMeta({
          originalname: 'a.jpg',
          mimeType: 'application/pdf',
          size: 2 * 1024 * 1024 + 1,
          scope: 'KYC',
        }),
      ).toThrow('KYC files must be <= 2MB');
    });
  });

  describe('detectMimeFromMagicBytes', () => {
    it('sniffs jpeg, png, webp, avif, and pdf headers', () => {
      expect(detectMimeFromMagicBytes(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
      expect(detectMimeFromMagicBytes(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]))).toBe(
        'image/png',
      );
      expect(
        detectMimeFromMagicBytes(
          Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]),
        ),
      ).toBe('image/webp');
      expect(
        detectMimeFromMagicBytes(
          Buffer.from([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66]),
        ),
      ).toBe('image/avif');
      expect(detectMimeFromMagicBytes(Buffer.from([0x25, 0x50, 0x44, 0x46]))).toBe(
        'application/pdf',
      );
    });

    it('returns null for short, empty, and unknown binaries', () => {
      expect(detectMimeFromMagicBytes(Buffer.from([0xff]))).toBe(null);
      expect(detectMimeFromMagicBytes(Buffer.alloc(0))).toBe(null);
      expect(detectMimeFromMagicBytes(Buffer.from([0x4d, 0x5a, 0x90, 0x00]))).toBe(null);
    });
  });

  describe('validateImageMagicBytes', () => {
    it('mirrors detection: true for images, false otherwise', () => {
      expect(validateImageMagicBytes(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe(true);
      expect(validateImageMagicBytes(Buffer.from('#!/bin/bash'))).toBe(false);
    });
  });
});
