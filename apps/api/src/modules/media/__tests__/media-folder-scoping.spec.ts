import { Request, Response } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MediaController } from '../media.controller';
import { mediaRepository } from '../media.repository';
import { confirmUploadedObject } from '../storage.service';

import { hashValue } from '@/common/utils/bcrypt';
import prisma from '@/config/db.prisma';

describe('Media folder scoping and cross-tenant isolation', () => {
  let vendorAUserId: string;
  let vendorAProfileId: string;
  let vendorBUserId: string;
  let vendorBProfileId: string;
  let folderAVendorAId: string;

  beforeEach(async () => {
    // Vendor A
    const userA = await prisma.user.create({
      data: {
        name: 'Vendor A User',
        email: `vendor_a_${Date.now()}_${Math.random()}@test.com`,
        password: await hashValue('pass123'),
        role: 'VENDOR',
        isEmailVerified: true,
      },
    });
    vendorAUserId = userA.id;

    const profileA = await prisma.vendorProfile.create({
      data: {
        userId: vendorAUserId,
        shopName: `Shop_A_${Date.now()}`,
        phoneNumber: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
        panNumber: `${Math.floor(100000000 + Math.random() * 900000000)}`,
        citizenshipNumber: `12-${Math.floor(10000000 + Math.random() * 90000000)}`,
        status: 'APPROVED',
      },
    });
    vendorAProfileId = profileA.id;

    // Vendor B
    const userB = await prisma.user.create({
      data: {
        name: 'Vendor B User',
        email: `vendor_b_${Date.now()}_${Math.random()}@test.com`,
        password: await hashValue('pass123'),
        role: 'VENDOR',
        isEmailVerified: true,
      },
    });
    vendorBUserId = userB.id;

    const profileB = await prisma.vendorProfile.create({
      data: {
        userId: vendorBUserId,
        shopName: `Shop_B_${Date.now()}`,
        phoneNumber: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
        panNumber: `${Math.floor(100000000 + Math.random() * 900000000)}`,
        citizenshipNumber: `12-${Math.floor(10000000 + Math.random() * 90000000)}`,
        status: 'APPROVED',
      },
    });
    vendorBProfileId = profileB.id;

    // Create a folder owned by Vendor A
    const folderA = await mediaRepository.createFolder(vendorAProfileId, 'Vendor A Root Folder');
    folderAVendorAId = folderA.id;
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await prisma.mediaAsset.deleteMany({
      where: { vendorId: { in: [vendorAProfileId, vendorBProfileId] } },
    });
    await prisma.mediaFolder.deleteMany({
      where: { vendorId: { in: [vendorAProfileId, vendorBProfileId] } },
    });
    await prisma.vendorProfile.deleteMany({
      where: { id: { in: [vendorAProfileId, vendorBProfileId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [vendorAUserId, vendorBUserId] } },
    });
  });

  it('rejects creating a subfolder under a parent folder belonging to another vendor', async () => {
    const controller = new MediaController();
    const req = {
      body: {
        name: 'Malicious Nested Subfolder',
        parentId: folderAVendorAId,
      },
      actor: {
        type: 'STORE',
        storeId: vendorBProfileId,
        role: 'VENDOR',
      },
      store: {
        id: vendorBProfileId,
        status: 'APPROVED',
      },
    } as unknown as Request;

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;

    await expect(controller.createFolder(req, res)).rejects.toThrow(
      /Parent folder not found or does not belong to this store/,
    );
  });

  it('allows creating a subfolder under a parent folder belonging to the same vendor', async () => {
    const controller = new MediaController();
    const req = {
      body: {
        name: 'Vendor A Valid Child Folder',
        parentId: folderAVendorAId,
      },
      actor: {
        type: 'STORE',
        storeId: vendorAProfileId,
        role: 'VENDOR',
      },
      store: {
        id: vendorAProfileId,
        status: 'APPROVED',
      },
    } as unknown as Request;

    let createdFolder:
      | { name?: string; parentId?: string | null; vendorId?: string | null }
      | undefined;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(
        (data: { data: { name?: string; parentId?: string | null; vendorId?: string | null } }) => {
          createdFolder = data.data;
          return data;
        },
      ),
    } as unknown as Response;

    await controller.createFolder(req, res);

    expect(createdFolder).toBeDefined();
    expect(createdFolder.name).toBe('Vendor A Valid Child Folder');
    expect(createdFolder.parentId).toBe(folderAVendorAId);
    expect(createdFolder.vendorId).toBe(vendorAProfileId);
  });

  it('rejects confirming an upload into a folder owned by another vendor', async () => {
    // Vendor B attempts to confirm an upload using Vendor A's folder ID
    await expect(
      confirmUploadedObject({
        key: `vendors/${vendorBProfileId}/product/test-file.jpg`,
        originalname: 'test-file.jpg',
        mimeType: 'image/jpeg',
        vendorId: vendorBProfileId,
        folderId: folderAVendorAId, // belongs to Vendor A
        scope: 'PRODUCT',
      }),
    ).rejects.toThrow(/Target folder not found or does not belong to this store/);
  });

  it('rejects moving assets that do not belong to the requesting vendor', async () => {
    // Vendor A creates an asset
    const assetA = await mediaRepository.createAsset({
      vendorId: vendorAProfileId,
      folderId: folderAVendorAId,
      originalName: 'asset-a.jpg',
      key: `vendors/${vendorAProfileId}/product/asset-a.jpg`,
      url: 'https://cdn.example.com/asset-a.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 1024,
      scope: 'PRODUCT',
    });

    // Vendor B creates a folder
    const folderB = await mediaRepository.createFolder(vendorBProfileId, 'Vendor B Folder');

    // Vendor B attempts to move Vendor A's asset into Vendor B's folder
    await expect(
      mediaRepository.moveAssets({
        assetIds: [assetA.id],
        vendorId: vendorBProfileId,
        targetFolderId: folderB.id,
      }),
    ).rejects.toThrow(/One or more assets not found or not owned by this store/);

    // Verify Asset A was NOT moved
    const refreshedAssetA = await prisma.mediaAsset.findUniqueOrThrow({
      where: { id: assetA.id },
    });
    expect(refreshedAssetA.folderId).toBe(folderAVendorAId);
    expect(refreshedAssetA.vendorId).toBe(vendorAProfileId);
  });
});
