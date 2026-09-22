import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { confirmUploadedObject } from '../storage.service';

import { hashValue } from '@/common/utils/bcrypt';
import { s3Client } from '@/common/utils/s3.client';
import prisma from '@/config/db.prisma';

describe('Media binary magic-byte inspection on upload confirmation', () => {
  let vendorUserId: string;
  let vendorProfileId: string;

  beforeEach(async () => {
    const user = await prisma.user.create({
      data: {
        name: 'Magic Byte Vendor User',
        email: `magic_${Date.now()}_${Math.random()}@test.com`,
        password: await hashValue('pass123'),
        role: 'VENDOR',
        isEmailVerified: true,
      },
    });
    vendorUserId = user.id;

    const profile = await prisma.vendorProfile.create({
      data: {
        userId: vendorUserId,
        shopName: `Magic_Shop_${Date.now()}`,
        phoneNumber: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
        panNumber: `${Math.floor(100000000 + Math.random() * 900000000)}`,
        citizenshipNumber: `12-${Math.floor(10000000 + Math.random() * 90000000)}`,
        status: 'APPROVED',
      },
    });
    vendorProfileId = profile.id;
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await prisma.mediaAsset.deleteMany({ where: { vendorId: vendorProfileId } });
    await prisma.vendorProfile.deleteMany({ where: { id: vendorProfileId } });
    await prisma.user.deleteMany({ where: { id: vendorUserId } });
  });

  function createStream(buffer: Buffer): Readable {
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);
    return stream;
  }

  it('rejects confirmation and deletes S3 object when uploaded file contains executable binary bytes', async () => {
    // Malicious Windows executable bytes with .jpg extension
    const exeBuffer = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00]);
    const testKey = `vendors/${vendorProfileId}/product/trojan.jpg`;

    let deleteCalled = false;
    vi.spyOn(s3Client, 'send').mockImplementation(async (command: unknown) => {
      if (command instanceof HeadObjectCommand) {
        return {
          ContentLength: exeBuffer.length,
          ContentType: 'image/jpeg',
        } as unknown as never;
      }
      if (command instanceof GetObjectCommand) {
        return {
          Body: createStream(exeBuffer),
        } as unknown as never;
      }
      if (command instanceof DeleteObjectCommand) {
        deleteCalled = true;
        return {} as unknown as never;
      }
      return {} as unknown as never;
    });

    await expect(
      confirmUploadedObject({
        key: testKey,
        originalname: 'trojan.jpg',
        mimeType: 'image/jpeg',
        vendorId: vendorProfileId,
        scope: 'PRODUCT',
      }),
    ).rejects.toThrow(/binary magic byte inspection/);

    // Verify DeleteObjectCommand was sent to purge the dangerous object
    expect(deleteCalled).toBe(true);
  });

  it('rejects confirmation when detected binary magic bytes do not match the declared MIME type', async () => {
    // Valid PDF header bytes claiming to be image/jpeg
    const pdfBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x35, 0x0a]);
    const testKey = `vendors/${vendorProfileId}/product/spoofed.jpg`;

    let deleteCalled = false;
    vi.spyOn(s3Client, 'send').mockImplementation(async (command: unknown) => {
      if (command instanceof HeadObjectCommand) {
        return {
          ContentLength: pdfBuffer.length,
          ContentType: 'image/jpeg',
        } as unknown as never;
      }
      if (command instanceof GetObjectCommand) {
        return {
          Body: createStream(pdfBuffer),
        } as unknown as never;
      }
      if (command instanceof DeleteObjectCommand) {
        deleteCalled = true;
        return {} as unknown as never;
      }
      return {} as unknown as never;
    });

    await expect(
      confirmUploadedObject({
        key: testKey,
        originalname: 'spoofed.jpg',
        mimeType: 'image/jpeg',
        vendorId: vendorProfileId,
        scope: 'PRODUCT',
      }),
    ).rejects.toThrow(/File MIME mismatch/);

    expect(deleteCalled).toBe(true);
  });

  it('allows confirmation when binary magic bytes match the declared image MIME type', async () => {
    // Valid PNG header bytes
    const pngBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    ]);
    const testKey = `vendors/${vendorProfileId}/product/valid-photo.png`;

    vi.spyOn(s3Client, 'send').mockImplementation(async (command: unknown) => {
      if (command instanceof HeadObjectCommand) {
        return {
          ContentLength: pngBuffer.length,
          ContentType: 'image/png',
        } as unknown as never;
      }
      if (command instanceof GetObjectCommand) {
        return {
          Body: createStream(pngBuffer),
        } as unknown as never;
      }
      return {} as unknown as never;
    });

    const result = await confirmUploadedObject({
      key: testKey,
      originalname: 'valid-photo.png',
      mimeType: 'image/png',
      vendorId: vendorProfileId,
      scope: 'PRODUCT',
    });

    expect(result.key).toBeDefined();
    expect(result.url).toBeDefined();
    expect(result.contentType).toBe('image/png');
  });
});
