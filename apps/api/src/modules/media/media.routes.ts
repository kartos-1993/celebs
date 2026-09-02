import { Router } from 'express';

import { Permission } from '@celebs/rbac';
import { asyncHandler } from '@celebs/shared-utils';

import { mediaController } from './media.controller';

import { actorContext } from '@/common/context/actor-context.middleware';
import { requireStoreState } from '@/common/guards/store.guards';
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
  requirePermissions(Permission.MEDIA_VIEW),
  asyncHandler((req, res) => mediaController.getAssets(req, res)),
);

/**
 * GET /api/v1/media/quota
 * Real-time storage consumption vs 10GB tier quota.
 */
router.get(
  '/quota',
  requirePermissions(Permission.MEDIA_VIEW),
  asyncHandler((req, res) => mediaController.getQuota(req, res)),
);

/**
 * GET /api/v1/media/folders
 * List media folders.
 */
router.get(
  '/folders',
  requirePermissions(Permission.MEDIA_VIEW),
  asyncHandler((req, res) => mediaController.getFolders(req, res)),
);

/**
 * POST /api/v1/media/folders
 * Create a new folder for media asset organization.
 */
router.post(
  '/folders',
  requirePermissions(Permission.MEDIA_MANAGE),
  asyncHandler((req, res) => mediaController.createFolder(req, res)),
);

/**
 * POST /api/v1/media/presign
 * Generate a single presigned PUT URL for Cloudflare R2 / S3 direct browser upload.
 */
router.post(
  '/presign',
  requirePermissions(Permission.MEDIA_MANAGE),
  asyncHandler((req, res) => mediaController.presign(req, res)),
);

/**
 * POST /api/v1/media/batch-presign & /presign-batch
 * Presign multiple files in a single network round-trip.
 */
router.post(
  ['/batch-presign', '/presign-batch'],
  requirePermissions(Permission.MEDIA_MANAGE),
  asyncHandler((req, res) => mediaController.presignBatch(req, res)),
);

/**
 * POST /api/v1/media/confirm
 * Verifies S3 upload, extracts metadata, saves to database, and queues background thumbnail worker.
 */
router.post(
  '/confirm',
  requirePermissions(Permission.MEDIA_MANAGE),
  asyncHandler((req, res) => mediaController.confirmUpload(req, res)),
);

/**
 * POST /api/v1/media/assets/move
 * Move media assets to a folder or unassign them.
 */
router.post(
  '/assets/move',
  requirePermissions(Permission.MEDIA_MANAGE),
  asyncHandler((req, res) => mediaController.moveAssets(req, res)),
);

/**
 * GET /api/v1/media/proxy
 * Proxies media assets with CORS headers for canvas and crop operations.
 */
router.get(
  '/proxy',
  asyncHandler((req, res) => mediaController.proxyMedia(req, res)),
);

/**
 * DELETE /api/v1/media/assets/:id
 * Safe asset deletion.
 */
router.delete(
  '/assets/:id',
  requirePermissions(Permission.MEDIA_MANAGE),
  asyncHandler((req, res) => mediaController.deleteAsset(req, res)),
);

/**
 * POST /api/v1/media/cleanup-unused
 * Bulk delete unlinked draft assets (strictly manual seller opt-in).
 */
router.post(
  '/cleanup-unused',
  requirePermissions(Permission.MEDIA_MANAGE),
  asyncHandler((req, res) => mediaController.cleanupUnused(req, res)),
);

export default router;
