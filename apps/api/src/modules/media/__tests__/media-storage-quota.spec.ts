import { Request, Response } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MediaController } from '../media.controller';
import { mediaRepository } from '../media.repository';

import { hashValue } from '@/common/utils/bcrypt';
import prisma from '@/config/db.prisma';

describe('Media cumulative storage quota and batch limits', () => {
  let vendorUserId: string;
  let vendorProfileId: string;

  beforeEach(async () => {
    const user = await prisma.user.create({
      data: {
        name: 'Quota Test Vendor User',
        email: `quota_vendor_${Date.now()}_${Math.random()}@test.com`,
        password: await hashValue('pass123'),
        role: 'VENDOR',
        isEmailVerified: true,
      },
    });
    vendorUserId = user.id;

    const profile = await prisma.vendorProfile.create({
      data: {
        userId: vendorUserId,
        shopName: `Quota_Shop_${Date.now()}`,
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

  it('rejects batch presign when cumulative batch size exceeds remaining vendor storage quota', async () => {
    const controller = new MediaController();

    // Mock vendor quota to have only 10MB remaining out of 5GB
    const maxBytes = 5 * 1024 * 1024 * 1024;
    const remainingBytes = 10 * 1024 * 1024; // 10MB left
    const usedBytes = maxBytes - remainingBytes;

    vi.spyOn(mediaRepository, 'getQuota').mockResolvedValue({
      vendorId: vendorProfileId,
      usedBytes,
      maxBytes,
      usedPercentage: 99,
      tier: 'STARTER',
      totalAssetCount: 50,
      unlinkedAssetCount: 0,
      unlinkedSizeBytes: 0,
    });

    // Batch contains 3 files of 4MB each (cumulative 12MB > 10MB remaining)
    // Individually, each file (4MB) is within the 5MB product limit, but together they exceed the quota!
    const req = {
      body: {
        files: [
          { originalname: 'pic1.jpg', mimeType: 'image/jpeg', size: 4 * 1024 * 1024 },
          { originalname: 'pic2.jpg', mimeType: 'image/jpeg', size: 4 * 1024 * 1024 },
          { originalname: 'pic3.jpg', mimeType: 'image/jpeg', size: 4 * 1024 * 1024 },
        ],
      },
      actor: {
        type: 'STORE',
        storeId: vendorProfileId,
        role: 'VENDOR',
      },
      store: {
        id: vendorProfileId,
        status: 'APPROVED',
      },
    } as unknown as Request;

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;

    await expect(controller.presignBatch(req, res)).rejects.toThrow(/Storage quota exceeded/);
  });

  it('allows batch presign when cumulative batch size fits comfortably within remaining quota', async () => {
    const controller = new MediaController();

    // Mock vendor quota to have 50MB remaining out of 5GB
    const maxBytes = 5 * 1024 * 1024 * 1024;
    const usedBytes = maxBytes - 50 * 1024 * 1024; // 50MB left

    vi.spyOn(mediaRepository, 'getQuota').mockResolvedValue({
      vendorId: vendorProfileId,
      usedBytes,
      maxBytes,
      usedPercentage: 95,
      tier: 'STARTER',
      totalAssetCount: 40,
      unlinkedAssetCount: 0,
      unlinkedSizeBytes: 0,
    });

    // Batch contains 2 files of 4MB each (cumulative 8MB <= 50MB remaining)
    const req = {
      body: {
        files: [
          { originalname: 'pic1.jpg', mimeType: 'image/jpeg', size: 4 * 1024 * 1024 },
          { originalname: 'pic2.jpg', mimeType: 'image/jpeg', size: 4 * 1024 * 1024 },
        ],
      },
      actor: {
        type: 'STORE',
        storeId: vendorProfileId,
        role: 'VENDOR',
      },
      store: {
        id: vendorProfileId,
        status: 'APPROVED',
      },
    } as unknown as Request;

    let responseData: { data: Array<{ uploadUrl: string }> } | undefined;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn((data: { data: Array<{ uploadUrl: string }> }) => {
        responseData = data;
        return data;
      }),
    } as unknown as Response;

    await controller.presignBatch(req, res);

    expect(responseData).toBeDefined();
    expect(responseData?.data.length).toBe(2);
    expect(responseData?.data[0].uploadUrl).toBeDefined();
    expect(responseData?.data[1].uploadUrl).toBeDefined();
  });

  it('rejects batch presign when batch item count exceeds 12 files', async () => {
    const controller = new MediaController();

    // 13 files in the batch
    const files = Array.from({ length: 13 }, (_, i) => ({
      originalname: `img_${i}.jpg`,
      mimeType: 'image/jpeg',
      size: 1024,
    }));

    const req = {
      body: { files },
      actor: {
        type: 'STORE',
        storeId: vendorProfileId,
        role: 'VENDOR',
      },
      store: {
        id: vendorProfileId,
        status: 'APPROVED',
      },
    } as unknown as Request;

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;

    await expect(controller.presignBatch(req, res)).rejects.toThrow(/Maximum 12 files at once/);
  });
});
