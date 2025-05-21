import { AppError } from '../../common/utils/AppError';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { HTTPSTATUS } from '../../config/http.config';
import { MediaModel, IMedia } from '../../db/models/media.model';
import { Types } from 'mongoose';

export class MediaService {
  /**
   * Create a new media entry
   */
  async createMedia(mediaData: Partial<IMedia>): Promise<IMedia> {
    const media = new MediaModel(mediaData);
    await media.save();
    return media;
  }
  /**
   * Create multiple media entries
   */
  async createMultipleMedia(mediaDataArray: Partial<IMedia>[]): Promise<IMedia[]> {
    // Using create method to ensure proper typing
    const createdMediaPromises = mediaDataArray.map(mediaData => 
      MediaModel.create(mediaData)
    );
    
    const mediaArray = await Promise.all(createdMediaPromises);
    return mediaArray;
  }

  /**
   * Get a media by ID
   */
  async getMediaById(mediaId: string): Promise<IMedia> {
    if (!Types.ObjectId.isValid(mediaId)) {
      throw new AppError('Invalid media ID', HTTPSTATUS.BAD_REQUEST, ErrorCode.INVALID_REQUEST);
    }

    const media = await MediaModel.findById(mediaId);
    if (!media) {
      throw new AppError(
        'Media not found',
        HTTPSTATUS.NOT_FOUND,
        ErrorCode.MEDIA_NOT_FOUND
      );
    }

    return media;
  }

  /**
   * Get media for a specific entity (product, review, etc.)
   */
  async getMediaForEntity(entityId: string, entityType: string): Promise<IMedia[]> {
    if (!Types.ObjectId.isValid(entityId)) {
      throw new AppError('Invalid entity ID', HTTPSTATUS.BAD_REQUEST, ErrorCode.INVALID_REQUEST);
    }

    const media = await MediaModel.find({
      entityId,
      entityType
    });

    return media;
  }

  /**
   * Update a media
   */
  async updateMedia(mediaId: string, updateData: Partial<IMedia>): Promise<IMedia> {
    if (!Types.ObjectId.isValid(mediaId)) {
      throw new AppError('Invalid media ID', HTTPSTATUS.BAD_REQUEST, ErrorCode.INVALID_REQUEST);
    }

    const media = await MediaModel.findByIdAndUpdate(
      mediaId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!media) {
      throw new AppError(
        'Media not found',
        HTTPSTATUS.NOT_FOUND,
        ErrorCode.MEDIA_NOT_FOUND
      );
    }

    return media;
  }

  /**
   * Delete a media
   */
  async deleteMedia(mediaId: string): Promise<{ success: boolean }> {
    if (!Types.ObjectId.isValid(mediaId)) {
      throw new AppError('Invalid media ID', HTTPSTATUS.BAD_REQUEST, ErrorCode.INVALID_REQUEST);
    }

    const media = await MediaModel.findById(mediaId);
    if (!media) {
      throw new AppError(
        'Media not found',
        HTTPSTATUS.NOT_FOUND,
        ErrorCode.MEDIA_NOT_FOUND
      );
    }

    // TODO: Delete the actual file from storage (S3, local, etc.)
    // This would depend on the storage solution used

    await MediaModel.findByIdAndDelete(mediaId);
    return { success: true };
  }

  /**
   * Delete media for a specific entity
   */
  async deleteMediaForEntity(entityId: string, entityType: string): Promise<{ success: boolean, count: number }> {
    if (!Types.ObjectId.isValid(entityId)) {
      throw new AppError('Invalid entity ID', HTTPSTATUS.BAD_REQUEST, ErrorCode.INVALID_REQUEST);
    }

    // Find all media for the entity
    const mediaItems = await MediaModel.find({ entityId, entityType });
    
    // TODO: Delete the actual files from storage (S3, local, etc.)
    // This would depend on the storage solution used

    // Delete all media records for the entity
    const result = await MediaModel.deleteMany({ entityId, entityType });
    
    return { 
      success: true,
      count: result.deletedCount || 0
    };
  }
}
