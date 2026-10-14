import { Request, Response } from 'express';
import { PassThrough, Readable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest';

import { Permission } from '@celebs/rbac';
import { NotFoundException } from '@celebs/shared-utils';

import { MediaController } from '../media.controller';
import { mediaRepository } from '../media.repository';
import * as storageService from '../storage.service';

type MediaAssetRecord = Awaited<ReturnType<typeof mediaRepository.findAssetByKey>>;

describe('Media Proxy KYC Access Control and Cache-Control Headers Contract', () => {
  let controller: MediaController;
  let findAssetByKeySpy: MockInstance;
  let getS3ObjectStreamSpy: MockInstance;

  beforeEach(() => {
    controller = new MediaController();
    findAssetByKeySpy = vi.spyOn(mediaRepository, 'findAssetByKey');
    getS3ObjectStreamSpy = vi.spyOn(storageService, 'getS3ObjectStream').mockResolvedValue({
      stream: Readable.from([Buffer.from('fake-image-bytes')]) as unknown as NodeJS.ReadableStream,
      contentType: 'image/jpeg',
      contentLength: 1024,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createMockResponse() {
    const res = new PassThrough() as unknown as Response & {
      headers: Record<string, string | number>;
    };
    const headers: Record<string, string | number> = {};
    res.headers = headers;
    res.setHeader = vi.fn((key: string, value: string | number) => {
      headers[key.toLowerCase()] = value;
      return res;
    }) as unknown as Response['setHeader'];
    res.getHeader = vi.fn(
      (key: string) => headers[key.toLowerCase()],
    ) as unknown as Response['getHeader'];
    res.status = vi.fn().mockReturnThis() as unknown as Response['status'];
    res.json = vi.fn() as unknown as Response['json'];
    return res;
  }

  it('permits vendor owner to view their own KYC document with strict private no-store headers', async () => {
    const kycKey = 'vendors/store-1/kyc/citizenship.jpg';
    findAssetByKeySpy.mockResolvedValue({
      id: 'asset-1',
      key: kycKey,
      vendorId: 'store-1',
      scope: 'KYC',
      isPrivate: true,
    } as unknown as MediaAssetRecord);

    const req = {
      query: { key: kycKey },
      actor: { role: 'VENDOR' },
      store: { id: 'store-1', isOwner: true },
    } as unknown as Request;

    const res = createMockResponse();

    await controller.proxyMedia(req, res);

    expect(getS3ObjectStreamSpy).toHaveBeenCalledWith(kycKey);
    expect(res.headers['cache-control']).toBe('private, no-store, no-cache, must-revalidate');
    expect(res.headers['pragma']).toBe('no-cache');
  });

  it('permits platform admin with VENDOR_MANAGE permission to view vendor KYC document with no-store headers', async () => {
    const kycKey = 'vendors/store-1/kyc/pan.jpg';
    findAssetByKeySpy.mockResolvedValue({
      id: 'asset-2',
      key: kycKey,
      vendorId: 'store-1',
      scope: 'KYC',
      isPrivate: true,
    } as unknown as MediaAssetRecord);

    const req = {
      query: { key: kycKey },
      actor: { role: 'ADMIN', permissions: [Permission.VENDOR_MANAGE] },
      store: null,
    } as unknown as Request;

    const res = createMockResponse();

    await controller.proxyMedia(req, res);

    expect(getS3ObjectStreamSpy).toHaveBeenCalledWith(kycKey);
    expect(res.headers['cache-control']).toBe('private, no-store, no-cache, must-revalidate');
    expect(res.headers['pragma']).toBe('no-cache');
  });

  it('denies store staff employee from accessing the store owner personal KYC document', async () => {
    const kycKey = 'vendors/store-1/kyc/citizenship.jpg';
    findAssetByKeySpy.mockResolvedValue({
      id: 'asset-1',
      key: kycKey,
      vendorId: 'store-1',
      scope: 'KYC',
      isPrivate: true,
    } as unknown as MediaAssetRecord);

    const req = {
      query: { key: kycKey },
      actor: { role: 'STAFF', permissions: [Permission.PRODUCT_VIEW, Permission.MEDIA_VIEW] },
      store: { id: 'store-1', isOwner: false },
    } as unknown as Request;

    const res = createMockResponse();

    await expect(controller.proxyMedia(req, res)).rejects.toThrow(NotFoundException);
  });

  it('denies a peer vendor from accessing another store KYC document', async () => {
    const kycKey = 'vendors/store-1/kyc/citizenship.jpg';
    findAssetByKeySpy.mockResolvedValue({
      id: 'asset-1',
      key: kycKey,
      vendorId: 'store-1',
      scope: 'KYC',
      isPrivate: true,
    } as unknown as MediaAssetRecord);

    const req = {
      query: { key: kycKey },
      actor: { role: 'VENDOR' },
      store: { id: 'store-peer-2', isOwner: true },
    } as unknown as Request;

    const res = createMockResponse();

    await expect(controller.proxyMedia(req, res)).rejects.toThrow(NotFoundException);
  });

  it('rejects unindexed key containing kyc path segment with 404', async () => {
    const unindexedKey = 'vendors/store-1/kyc/unindexed-doc.jpg';
    findAssetByKeySpy.mockResolvedValue(null);

    const req = {
      query: { key: unindexedKey },
      actor: { role: 'ADMIN' },
      store: null,
    } as unknown as Request;

    const res = createMockResponse();

    await expect(controller.proxyMedia(req, res)).rejects.toThrow(NotFoundException);
  });

  it('serves standard public catalog image with public edge cache headers', async () => {
    const publicKey = 'celebs/products/denim-jacket-cover.webp';
    findAssetByKeySpy.mockResolvedValue({
      id: 'asset-public',
      key: publicKey,
      vendorId: 'store-1',
      scope: 'PRODUCT',
      isPrivate: false,
    } as unknown as MediaAssetRecord);

    const req = {
      query: { key: publicKey },
      actor: { role: 'VENDOR' },
      store: { id: 'store-1', isOwner: true },
    } as unknown as Request;

    const res = createMockResponse();

    await controller.proxyMedia(req, res);

    expect(res.headers['cache-control']).toBe('public, max-age=86400');
  });
});
