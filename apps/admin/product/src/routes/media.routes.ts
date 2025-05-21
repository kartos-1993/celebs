import express from 'express';
import { MediaController } from '../modules/media/media.controller';
import { MediaService } from '../modules/media/media.service';
import { asyncHandler } from '../middlewares/asyncHandler';
import { authenticateJWT } from '../middlewares/auth.middleware';

const router = express.Router();
const mediaService = new MediaService();
const mediaController = new MediaController(mediaService);

// Apply authentication middleware to all media routes
router.use(authenticateJWT);

// Upload a single file
router.post('/upload', mediaController.uploadSingleFile);

// Upload multiple files
router.post('/upload/multiple', mediaController.uploadMultipleFiles);

// Get a single media by ID
router.get('/:id', asyncHandler(mediaController.getMediaById));

// Get all media for a specific entity
router.get('/entity/:entityType/:entityId', asyncHandler(mediaController.getMediaForEntity));

// Delete a media
router.delete('/:id', asyncHandler(mediaController.deleteMedia));

// Delete all media for a specific entity
router.delete('/entity/:entityType/:entityId', asyncHandler(mediaController.deleteMediaForEntity));

export default router;