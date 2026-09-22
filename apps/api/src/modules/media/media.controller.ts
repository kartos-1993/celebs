import { Request, Response } from 'express';

import {
  batchPresignSchema,
  confirmUploadSchema,
  createMediaFolderSchema,
  deleteUnusedMediaSchema,
  idParamSchema,
  mediaAssetFilterSchema,
  moveMediaSchema,
  PresignFileInput,
  presignFileSchema,
} from '@celebs/shared-types';
import { BadRequestException, NotFoundException } from '@celebs/shared-utils';

import { mediaRepository } from './media.repository';
import {
  confirmUploadedObject,
  createPresignedPut,
  deleteS3Object,
  getS3ObjectStream,
} from './storage.service';

import { resolveTargetStoreId } from '@/common/guards/store.guards';
import { assetQueue } from '@/common/services/queue.service';
import { sendCreated, sendSuccess } from '@/common/utils/response.util';
import { config } from '@/config/app.config';

export class MediaController {
  /**
   * GET /api/v1/media/assets
   */
  async getAssets(req: Request, res: Response): Promise<void> {
    const query = mediaAssetFilterSchema.parse(req.query);
    const vendorId = resolveTargetStoreId(req, 'query');

    const result = await mediaRepository.findAssets({
      vendorId,
      folderId: query.folderId || null,
      scope: query.scope,
      search: query.search,
      unusedOnly: query.unusedOnly,
      mimeType: query.mimeType,
      page: query.page,
      limit: query.limit,
    });

    sendSuccess(
      res,
      {
        items: result.items,
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.pages,
        pages: result.pages,
      },
      'Media assets retrieved successfully',
    );
  }

  /**
   * GET /api/v1/media/quota
   */
  async getQuota(req: Request, res: Response): Promise<void> {
    const vendorId = resolveTargetStoreId(req, 'query');
    if (!vendorId) {
      sendSuccess(
        res,
        {
          usedBytes: 0,
          maxBytes: 10 * 1024 * 1024 * 1024,
          percentUsed: 0,
          remainingBytes: 10 * 1024 * 1024 * 1024,
          assetCount: 0,
        },
        'Media quota retrieved successfully',
      );
      return;
    }

    const quota = await mediaRepository.getQuota(vendorId);
    sendSuccess(res, quota, 'Media quota retrieved successfully');
  }

  /**
   * GET /api/v1/media/folders
   */
  async getFolders(req: Request, res: Response): Promise<void> {
    const vendorId = resolveTargetStoreId(req, 'query');
    const parentId = typeof req.query.parentId === 'string' ? req.query.parentId : undefined;
    const folders = await mediaRepository.findFolders(vendorId, parentId);
    sendSuccess(res, folders, 'Media folders retrieved successfully');
  }

  /**
   * POST /api/v1/media/folders
   */
  async createFolder(req: Request, res: Response): Promise<void> {
    const vendorId = resolveTargetStoreId(req, 'body');
    const { name, parentId } = createMediaFolderSchema.parse(req.body);
    const folder = await mediaRepository.createFolder(vendorId, name, parentId);
    sendCreated(res, folder, 'Media folder created successfully');
  }

  /**
   * POST /api/v1/media/presign
   */
  async presign(req: Request, res: Response): Promise<void> {
    const body = presignFileSchema.parse(req.body);
    const vendorId = resolveTargetStoreId(req, 'body');

    const result = await createPresignedPut({
      ...body,
      vendorId: vendorId ?? undefined,
    });

    sendCreated(res, result, 'Presigned URL generated successfully');
  }

  /**
   * POST /api/v1/media/presign-batch
   */
  async presignBatch(req: Request, res: Response): Promise<void> {
    const raw = Array.isArray(req.body) ? { files: req.body } : req.body;
    const { files } = batchPresignSchema.parse(raw);
    const vendorId = resolveTargetStoreId(req, 'body');

    if (vendorId) {
      const totalBatchBytes = files.reduce((sum, f) => sum + Number(f.size || 0), 0);
      const quota = await mediaRepository.getQuota(vendorId);
      if (quota.usedBytes + totalBatchBytes > quota.maxBytes) {
        throw new BadRequestException(
          `Storage quota exceeded. Used: ${(quota.usedBytes / 1024 / 1024).toFixed(1)}MB, Batch: ${(totalBatchBytes / 1024 / 1024).toFixed(1)}MB / ${(quota.maxBytes / 1024 / 1024 / 1024).toFixed(0)}GB. Please delete unused assets.`,
        );
      }
    }

    const results = await Promise.all(
      files.map((file: PresignFileInput) =>
        createPresignedPut({
          ...file,
          vendorId: vendorId ?? undefined,
        }),
      ),
    );

    sendCreated(res, results, 'Batch presigned URLs generated successfully');
  }

  /**
   * POST /api/v1/media/confirm
   */
  async confirmUpload(req: Request, res: Response): Promise<void> {
    const body = confirmUploadSchema.parse(req.body);
    const vendorId = resolveTargetStoreId(req, 'body');

    const asset = await confirmUploadedObject({
      ...body,
      vendorId: vendorId ?? undefined,
    });

    if (asset.scope === 'PRODUCT') {
      await assetQueue.add('generate-thumbnails', {
        assetId: asset.id,
        key: asset.key,
        mimeType: asset.mimeType,
      });
    }

    sendCreated(res, asset, 'Media upload confirmed successfully');
  }

  /**
   * POST /api/v1/media/assets/move
   */
  async moveAssets(req: Request, res: Response): Promise<void> {
    const vendorId = resolveTargetStoreId(req, 'body');
    const { assetIds, targetFolderId } = moveMediaSchema.parse(req.body);
    const result = await mediaRepository.moveAssets({
      assetIds,
      vendorId: vendorId ?? null,
      targetFolderId: targetFolderId ?? null,
    });
    sendSuccess(res, { movedCount: result.count }, 'Media assets moved successfully');
  }

  /**
   * GET /api/v1/media/proxy
   */
  async proxyMedia(req: Request, res: Response): Promise<void> {
    const key = req.query.key as string;
    const url = req.query.url as string;
    let targetKey = key;
    if (!targetKey && url) {
      try {
        const decoded = decodeURIComponent(url);
        const parsed = new URL(decoded, 'http://localhost');
        const parts = parsed.pathname.split('/').filter(Boolean);
        const bucket = config.S3.BUCKET_NAME;
        if (parts[0] === bucket) {
          targetKey = parts.slice(1).join('/');
        } else {
          targetKey = parts.join('/');
        }
      } catch {
        // Legacy stamped URLs (?v=) must resolve to their bare key.
        targetKey = url.replace(/^https?:\/\/[^/]+\//, '').split('?')[0] ?? '';
      }
    }
    if (targetKey) {
      targetKey = (targetKey.split('?')[0] ?? '').replace(/^\/+/, '');
    }
    if (!targetKey) {
      throw new BadRequestException('key or url query parameter is required');
    }

    const { stream, contentType, contentLength } = await getS3ObjectStream(targetKey);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }
    if (stream) {
      (stream as NodeJS.ReadableStream).pipe(res);
    } else {
      throw new NotFoundException('Media object stream not found');
    }
  }

  /**
   * DELETE /api/v1/media/assets/:id
   */
  async deleteAsset(req: Request, res: Response): Promise<void> {
    const { id } = idParamSchema.parse(req.params);
    const vendorId = resolveTargetStoreId(req);

    const asset = await mediaRepository.findAssetById(id, vendorId);
    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    if (asset.usageCount > 0) {
      throw new BadRequestException(
        `Cannot delete this asset because it is actively used in ${asset.usageCount} products.`,
      );
    }

    await Promise.all([mediaRepository.deleteAsset(id, vendorId), deleteS3Object(asset.key)]);

    sendSuccess(res, null, 'Asset deleted successfully');
  }

  /**
   * POST /api/v1/media/cleanup-unused
   */
  async cleanupUnused(req: Request, res: Response): Promise<void> {
    const vendorId = resolveTargetStoreId(req, 'body');
    const { assetIds } = deleteUnusedMediaSchema.parse(req.body);

    const unusedAssets = await mediaRepository.findUnusedByIds(assetIds, vendorId);
    if (unusedAssets.length !== assetIds.length) {
      throw new BadRequestException(
        'Some selected assets are actively linked to products or do not exist in your catalog.',
      );
    }

    const keysToDelete = unusedAssets.map((a: { key: string }) => a.key);
    await Promise.all([
      mediaRepository.deleteUnusedAssets(assetIds, vendorId),
      Promise.all(keysToDelete.map((key: string) => deleteS3Object(key))),
    ]);

    sendSuccess(
      res,
      { deletedCount: assetIds.length },
      `Cleaned up ${assetIds.length} unused assets.`,
    );
  }
}

export const mediaController = new MediaController();
