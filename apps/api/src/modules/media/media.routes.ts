import { Router } from 'express';

import { Permission } from '@celebs/rbac';
import {
  batchPresignSchema,
  confirmUploadSchema,
  createMediaFolderSchema,
  deleteUnusedMediaSchema,
  idParamSchema,
  mediaAssetFilterSchema,
  MediaScope,
  PresignFileInput,
  presignFileSchema,
} from '@celebs/shared-types';
import { asyncHandler, BadRequestException, logger, NotFoundException } from '@celebs/shared-utils';

import {
  confirmUploadedObject,
  createPresignedPut,
  deleteS3Object,
} from './storage.service';
import { mediaRepository } from './media.repository';

import { assetQueue } from '@/common/services/queue.service';
import { authenticateJWT, requireApprovedVendor } from '@/middlewares/auth.middleware';
import { uploadRateLimiter } from '@/middlewares/rate-limiter.middleware';
import { requirePermissions } from '@/middlewares/rbac.middleware';

const router = Router();
router.use(uploadRateLimiter);

// All media routes require auth + approved vendor
router.use(authenticateJWT);
router.use(requireApprovedVendor);

/**
 * GET /api/v1/media/assets
 * Browse, search, and filter vendor's digital assets.
 */
router.get(
  '/assets',
  asyncHandler(async (req, res) => {
    const vendorId = req.user!.vendorId!;
    const query = mediaAssetFilterSchema.parse(req.query);

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

    return res.json({ success: true, data: result });
  }),
);

/**
 * GET /api/v1/media/quota
 * Returns vendor's current storage quota consumption & tier breakdown.
 */
router.get(
  '/quota',
  asyncHandler(async (req, res) => {
    const vendorId = req.user!.vendorId!;
    const quota = await mediaRepository.getQuota(vendorId);
    return res.json({ success: true, data: quota });
  }),
);

/**
 * GET /api/v1/media/folders
 * List vendor's folder tree.
 */
router.get(
  '/folders',
  asyncHandler(async (req, res) => {
    const vendorId = req.user!.vendorId!;
    const folders = await mediaRepository.findFolders(vendorId);
    return res.json({ success: true, data: folders });
  }),
);

/**
 * POST /api/v1/media/folders
 * Create a new media folder.
 */
router.post(
  '/folders',
  requirePermissions(Permission.PRODUCT_CREATE),
  asyncHandler(async (req, res) => {
    const vendorId = req.user!.vendorId!;
    const { name, parentId } = createMediaFolderSchema.parse(req.body);
    const folder = await mediaRepository.createFolder(vendorId, name, parentId);
    return res.status(201).json({ success: true, data: folder });
  }),
);

/**
 * DELETE /api/v1/media/folders/:id
 * Delete a media folder (assets inside are unassigned).
 */
router.delete(
  '/folders/:id',
  requirePermissions(Permission.PRODUCT_CREATE),
  asyncHandler(async (req, res) => {
    const vendorId = req.user!.vendorId!;
    const { id } = idParamSchema.parse(req.params);
    await mediaRepository.deleteFolder(id, vendorId);
    return res.json({ success: true, message: 'Folder deleted successfully' });
  }),
);

/**
 * DELETE /api/v1/media/assets/:id
 * Safe asset deletion.
 */
router.delete(
  '/assets/:id',
  requirePermissions(Permission.PRODUCT_CREATE),
  asyncHandler(async (req, res) => {
    const vendorId = req.user!.vendorId!;
    const { id } = idParamSchema.parse(req.params);

    const asset = await mediaRepository.findAssetById(id, vendorId);
    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    if (asset.usageCount > 0) {
      throw new BadRequestException(
        `Cannot delete this asset because it is actively used in ${asset.usageCount} products.`,
      );
    }

    await Promise.all([
      mediaRepository.deleteAsset(id, vendorId),
      deleteS3Object(asset.key),
    ]);

    return res.json({ success: true, message: 'Asset deleted successfully' });
  }),
);

/**
 * POST /api/v1/media/cleanup-unused
 * Bulk delete unlinked draft assets (strictly manual seller opt-in).
 */
router.post(
  '/cleanup-unused',
  requirePermissions(Permission.PRODUCT_CREATE),
  asyncHandler(async (req, res) => {
    const vendorId = req.user!.vendorId!;
    const { assetIds } = deleteUnusedMediaSchema.parse(req.body);

    const assets = await mediaRepository.findAssets({
      vendorId,
      unusedOnly: true,
      page: 1,
      limit: 100,
    });

    const matchingAssets = assets.items.filter((a) => assetIds.includes(a.id));
    const keysToDelete = matchingAssets.map((a) => a.key);

    await Promise.all([
      mediaRepository.deleteUnusedAssets(assetIds, vendorId),
      ...keysToDelete.map((k) => deleteS3Object(k)),
    ]);

    return res.json({
      success: true,
      data: { deletedCount: matchingAssets.length },
      message: `Cleaned up ${matchingAssets.length} unused assets.`,
    });
  }),
);

/**
 * POST /api/v1/media/presign
 * Generates a single presigned PUT URL for direct browser → Cloudflare R2 / S3 upload.
 */
router.post(
  '/presign',
  requirePermissions(Permission.PRODUCT_CREATE),
  asyncHandler(async (req, res) => {
    const vendorId = req.user!.vendorId!;
    const validatedData = presignFileSchema.parse(req.body);
    const result = await createPresignedPut({
      ...validatedData,
      vendorId,
    });
    return res.json({ success: true, data: result });
  }),
);

/**
 * POST /api/v1/media/batch-presign
 * Generates multiple presigned PUT URLs for batch image uploads.
 */
router.post(
  '/batch-presign',
  requirePermissions(Permission.PRODUCT_CREATE),
  asyncHandler(async (req, res) => {
    const vendorId = req.user!.vendorId!;
    const { files } = batchPresignSchema.parse(req.body);
    const results = await Promise.all(
      files.map((file: PresignFileInput) => createPresignedPut({ ...file, vendorId })),
    );
    return res.json({ success: true, data: results });
  }),
);

/**
 * POST /api/v1/media/confirm
 * Confirms uploaded object on Cloudflare R2 / S3 and catalogs in MediaAsset table.
 */
router.post(
  '/confirm',
  requirePermissions(Permission.PRODUCT_CREATE),
  asyncHandler(async (req, res) => {
    const vendorId = req.user!.vendorId!;
    const validatedData = confirmUploadSchema.parse(req.body);
    const rawBody = req.body as { folderId?: string; scope?: MediaScope };

    const result = await confirmUploadedObject({
      ...validatedData,
      vendorId,
      folderId: rawBody.folderId || null,
      scope: rawBody.scope || 'PRODUCT',
    });

    // Enqueue BullMQ optimization job asynchronously
    assetQueue
      .add('optimize', {
        key: result.key,
        originalname: result.originalname,
        mimeType: result.contentType,
      })
      .catch((err) => {
        logger.warn({ error: err.message, key: result.key }, 'Failed to enqueue asset optimization job');
      });

    return res.json({ success: true, data: result });
  }),
);

export default router;
