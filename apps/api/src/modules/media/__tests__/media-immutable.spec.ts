import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { Readable } from 'node:stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// In-memory fake R2 backing the mocked S3 client below (hoisted: the mock
// factory runs before any top-level variable initializes).
const { fakeObjects, fakeS3 } = vi.hoisted(() => {
  const fakeObjects = new Map<string, Buffer>();
  const fakeS3 = {
    send: vi.fn(async (command: unknown) => {
      const name = (command as { constructor: { name: string } }).constructor.name;
      const input = (command as { input: Record<string, unknown> }).input;
      if (name === 'HeadObjectCommand') {
        const buf = fakeObjects.get(input.Key as string);
        if (!buf) throw new Error('NotFound');
        return { ContentLength: buf.length, ContentType: 'image/webp' };
      }
      if (name === 'GetObjectCommand') {
        const buf = fakeObjects.get(input.Key as string);
        if (!buf) throw new Error('NotFound');
        return { Body: Readable.from([buf]) };
      }
      if (name === 'CopyObjectCommand') {
        const [bucket, ...keyParts] = String(input.CopySource).split('/');
        void bucket;
        const src = fakeObjects.get(keyParts.join('/'));
        if (!src) throw new Error('NotFound');
        fakeObjects.set(input.Key as string, Buffer.from(src));
        return {};
      }
      if (name === 'DeleteObjectCommand') {
        fakeObjects.delete(input.Key as string);
        return {};
      }
      throw new Error(`Unexpected command in fake R2: ${name}`);
    }),
  };
  return { fakeObjects, fakeS3 };
});

vi.mock('@/common/utils/s3.client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/common/utils/s3.client')>();
  return { ...actual, s3Client: fakeS3 };
});

// Touch the command classes so tree-shaking/import-lint keeps them referenced.
void CopyObjectCommand;
void DeleteObjectCommand;
void GetObjectCommand;
void HeadObjectCommand;

import prisma from '@/config/db.prisma';
import { mediaRepository } from '@/modules/media/media.repository';
import { confirmUploadedObject } from '@/modules/media/storage.service';

const putTemp = (key: string, content: string) => {
  fakeObjects.set(key, Buffer.from(content));
};

describe('Immutable content-addressed uploads', () => {
  beforeEach(() => {
    fakeObjects.clear();
  });

  it('should promote a temp upload to a hash key with a clean stamp-free URL', async () => {
    const uid = Math.random().toString(36).substring(2, 8);
    const tempKey = `celebs/products/product/tmp-${uid}.webp`;
    putTemp(tempKey, 'red-tshirt-bytes');

    const result = await confirmUploadedObject({
      key: tempKey,
      originalname: 'red-tshirt.webp',
      mimeType: 'image/webp',
      size: 16,
      scope: 'PRODUCT',
    });

    expect(result.url).not.toContain('?v=');
    expect(result.key).toMatch(/^celebs\/products\/product\/[0-9a-f]{24}-red-tshirt\.webp$/);
    expect(result.key).not.toBe(tempKey);
    // Temp upload removed, promoted object present.
    expect(fakeObjects.has(tempKey)).toBe(false);
    expect(fakeObjects.has(result.key)).toBe(true);

    const row = await mediaRepository.findAssetByKey(result.key);
    expect(row).not.toBeNull();
    expect(row?.url).toBe(result.url);
    expect(row?.hashSha256).toMatch(/^[0-9a-f]{24}$/);
  });

  it('should treat re-confirm of identical bytes as an idempotent no-op', async () => {
    const uid = Math.random().toString(36).substring(2, 8);
    const first = `celebs/products/product/tmp-a-${uid}.webp`;
    const second = `celebs/products/product/tmp-b-${uid}.webp`;
    putTemp(first, 'same-bytes');
    putTemp(second, 'same-bytes');

    const r1 = await confirmUploadedObject({
      key: first,
      originalname: 'photo.webp',
      mimeType: 'image/webp',
      size: 10,
      scope: 'PRODUCT',
    });
    const r2 = await confirmUploadedObject({
      key: second,
      originalname: 'photo.webp',
      mimeType: 'image/webp',
      size: 10,
      scope: 'PRODUCT',
    });

    expect(r2.key).toBe(r1.key);
    expect(r2.url).toBe(r1.url);
    const count = await prisma.mediaAsset.count({ where: { key: r1.key } });
    expect(count).toBe(1);
  });

  it('should mint different keys for different bytes', async () => {
    const uid = Math.random().toString(36).substring(2, 8);
    const first = `celebs/products/product/tmp-c-${uid}.webp`;
    const second = `celebs/products/product/tmp-d-${uid}.webp`;
    putTemp(first, 'bytes-one');
    putTemp(second, 'bytes-two');

    const r1 = await confirmUploadedObject({
      key: first,
      originalname: 'photo.webp',
      mimeType: 'image/webp',
      size: 9,
      scope: 'PRODUCT',
    });
    const r2 = await confirmUploadedObject({
      key: second,
      originalname: 'photo.webp',
      mimeType: 'image/webp',
      size: 9,
      scope: 'PRODUCT',
    });

    expect(r2.key).not.toBe(r1.key);
  });

  it('should refuse overwriting a key that holds different bytes', async () => {
    await expect(
      mediaRepository.createAsset({
        key: 'vendors/v1/product/aaaa-photo.webp',
        url: 'https://cdn/x/vendors/v1/product/aaaa-photo.webp',
        originalName: 'photo.webp',
        mimeType: 'image/webp',
        sizeBytes: 10,
        hashSha256: 'aaaaaaaaaaaaaaaaaaaaaaaa',
        scope: 'PRODUCT',
      }),
    ).resolves.toBeDefined();

    await expect(
      mediaRepository.createAsset({
        key: 'vendors/v1/product/aaaa-photo.webp',
        url: 'https://cdn/x/vendors/v1/product/aaaa-photo.webp',
        originalName: 'photo.webp',
        mimeType: 'image/webp',
        sizeBytes: 10,
        hashSha256: 'bbbbbbbbbbbbbbbbbbbbbbbb',
        scope: 'PRODUCT',
      }),
    ).rejects.toThrow(/key collision/i);
  });

  it('should claim unowned same-vendor assets but never steal owned ones', async () => {
    const uid = Math.random().toString(36).substring(2, 8);
    const mk = (suffix: string) => `https://cdn/x/lib-${uid}-${suffix}.webp`;
    const freeUrl = mk('free');
    const ownedUrl = mk('owned');
    const foreignUrl = mk('foreign');

    const user = await prisma.user.create({
      data: {
        name: 'Claim Test User',
        email: `claim-${Date.now()}-${uid}@example.com`,
        password: 'hashedpassword',
        role: 'VENDOR',
      },
    });
    const vendor = await prisma.vendorProfile.create({
      data: {
        userId: user.id,
        shopName: `Claim Shop ${uid}`,
        phoneNumber: `98${Math.floor(10000000 + Math.random() * 89999999)}`,
        panNumber: `PAN-CL-${Date.now()}-${uid}`,
        citizenshipNumber: `CIT-CL-${Date.now()}-${uid}`,
      },
    });
    const foreignUser = await prisma.user.create({
      data: {
        name: 'Foreign Vendor User',
        email: `foreign-${Date.now()}-${uid}@example.com`,
        password: 'hashedpassword',
        role: 'VENDOR',
      },
    });
    const foreignVendor = await prisma.vendorProfile.create({
      data: {
        userId: foreignUser.id,
        shopName: `Foreign Shop ${uid}`,
        phoneNumber: `97${Math.floor(10000000 + Math.random() * 89999999)}`,
        panNumber: `PAN-FO-${Date.now()}-${uid}`,
        citizenshipNumber: `CIT-FO-${Date.now()}-${uid}`,
      },
    });

    await prisma.mediaAsset.createMany({
      data: [
        {
          key: `k-${uid}-1`,
          url: freeUrl,
          originalName: 'f',
          mimeType: 'image/webp',
          sizeBytes: 1,
          vendorId: vendor.id,
        },
        {
          key: `k-${uid}-2`,
          url: ownedUrl,
          originalName: 'o',
          mimeType: 'image/webp',
          sizeBytes: 1,
          vendorId: vendor.id,
          productId: 'other-product',
        },
        {
          key: `k-${uid}-3`,
          url: foreignUrl,
          originalName: 'x',
          mimeType: 'image/webp',
          sizeBytes: 1,
          vendorId: foreignVendor.id,
        },
      ],
    });

    await mediaRepository.claimProductOwner([freeUrl, ownedUrl, foreignUrl], 'p1', vendor.id);

    expect((await prisma.mediaAsset.findUnique({ where: { key: `k-${uid}-1` } }))?.productId).toBe(
      'p1',
    );
    expect((await prisma.mediaAsset.findUnique({ where: { key: `k-${uid}-2` } }))?.productId).toBe(
      'other-product',
    );
    expect(
      (await prisma.mediaAsset.findUnique({ where: { key: `k-${uid}-3` } }))?.productId,
    ).toBeNull();
  });

  it('should collapse 100 concurrent confirms of identical bytes into one asset row', async () => {
    const uid = Math.random().toString(36).substring(2, 8);
    const N = 100;
    const temps = Array.from(
      { length: N },
      (_, i) => `celebs/products/product/load-${uid}-${i}.webp`,
    );
    for (const temp of temps) putTemp(temp, 'flash-sale-bytes');

    const startedAt = Date.now();
    const results = await Promise.all(
      temps.map((temp) =>
        confirmUploadedObject({
          key: temp,
          originalname: 'flash.webp',
          mimeType: 'image/webp',
          size: 16,
          scope: 'PRODUCT',
        }),
      ),
    );
    const elapsedMs = Date.now() - startedAt;

    const keys = new Set(results.map((r) => r.key));
    expect(keys.size).toBe(1);
    expect(results.every((r) => !r.url.includes('?v='))).toBe(true);
    const count = await prisma.mediaAsset.count({ where: { key: results[0]?.key } });
    expect(count).toBe(1);
    expect(elapsedMs).toBeLessThan(60000);
  });
});
