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

import { mediaRepository } from './media.repository';
import {
  confirmUploadedObject,
  createPresignedPut,
  deleteS3Object,
} from './storage.service';

import { actorContext } from '@/common/context/actor-context.middleware';
import { requireStoreState, resolveTargetStoreId } from '@/common/guards/store.guards';
import { assetQueue } from '@/common/services/queue.service';
import { authenticateJWT } from '@/middlewares/auth.middleware';
import { uploadRateLimiter } from '@/middlewares/rate-limiter.middleware';
import { requirePermissions } from '@/middlewares/rbac.middleware';

const router = Router();
router.use(uploadRateLimiter);

// identity → context → lifecycle → permission
// Media uploads must be available BEFORE approval: vendors upload KYC
// documents during onboarding and re-upload them after rejection.
// Only suspended stores are locked out; publishing stays gated by the
// product/brand routers' own requireStoreState(['APPROVED']).
router.use(authenticateJWT);
router.use(asyncHandler(actorContext));
router.use(requireStoreState(['PENDING', 'UNDER_REVIEW', 'REJECTED', 'APPROVED']));

/**
 * GET /api/v1/media/assets
 * Browse, search, and filter vendor or platform digital assets.
 */
router.get(
  '/assets',
  asyncHandler(async (req, res) => {
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

    return res.json({ success: true, data: result });
  }),
);

/**
 * GET /api/v1/media/quota
 * Returns storage quota consumption & tier breakdown.
 */
router.get(
  '/quota',
  asyncHandler(async (req, res) => {
    const vendorId = resolveTargetStoreId(req, 'query');
    const quota = await mediaRepository.getQuota(vendorId);
    return res.json({ success: true, data: quota });
  }),
);

/**
 * GET /api/v1/media/folders
 * List folder tree.
 */
router.get(
  '/folders',
  asyncHandler(async (req, res) => {
    const vendorId = resolveTargetStoreId(req, 'query');
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
    const vendorId = resolveTargetStoreId(req, 'body');
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
    const vendorId = resolveTargetStoreId(req, 'query');
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
    const vendorId = resolveTargetStoreId(req, 'query');
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
 * Atomic contract: every requested ID must resolve to an unused asset inside
 * the caller's scope — otherwise nothing is deleted (no partial S3 orphans).
 */
router.post(
  '/cleanup-unused',
  requirePermissions(Permission.PRODUCT_CREATE),
  asyncHandler(async (req, res) => {
    const vendorId = resolveTargetStoreId(req, 'body');
    const { assetIds } = deleteUnusedMediaSchema.parse(req.body);

    const doomed = await mediaRepository.findUnusedByIds(assetIds, vendorId);
    if (doomed.length !== assetIds.length) {
      throw new NotFoundException(
        'Some assets were not found, are still in use, or belong to another store. Nothing was deleted.',
      );
    }

    await mediaRepository.deleteUnusedAssets(doomed.map((a) => a.id), vendorId);

    const results = await Promise.allSettled(doomed.map((a) => deleteS3Object(a.key)));
    const s3Failures = results.filter((r) => r.status === 'rejected');
    if (s3Failures.length > 0) {
      logger.error(
        { count: s3Failures.length, keys: doomed.map((a) => a.key) },
        'S3 deletion failures during cleanup-unused — objects require reaper reconciliation',
      );
    }

    return res.json({
      success: true,
      data: { deletedCount: doomed.length, storageDeleteFailures: s3Failures.length },
      message: `Cleaned up ${doomed.length} unused assets.`,
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
    const vendorId = resolveTargetStoreId(req, 'body') ?? undefined;
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
    const vendorId = resolveTargetStoreId(req, 'body') ?? undefined;
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
    const vendorId = resolveTargetStoreId(req, 'body');
    const validatedData = confirmUploadSchema.parse(req.body);
    const rawBody = req.body as { folderId?: string; scope?: MediaScope };

    const result = await confirmUploadedObject({
      ...validatedData,
      vendorId: vendorId || undefined,
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
