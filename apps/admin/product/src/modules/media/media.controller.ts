import { Request, Response, NextFunction } from 'express';
import { MediaService } from './media.service';
import { CloudinaryService } from './cloudinary.service';
import { HTTPSTATUS } from '../../config/http.config';
import { AppError } from '../../common/utils/AppError';
import { ErrorCode } from '../../common/enums/error-code.enum';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// Configure multer for temporary storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../../../uploads/temp');
    
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// Create file filter
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Accept image files only
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'));
  }
};

// Initialize upload middleware
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

export class MediaController {
  private cloudinaryService: CloudinaryService;

  constructor(private mediaService: MediaService) {
    this.cloudinaryService = new CloudinaryService();
  }

  /**
   * Extract public ID from Cloudinary URL or key
   */
  private extractPublicIdFromUrlOrKey(urlOrKey: string): string {
    // If it's a URL, extract the public ID
    if (urlOrKey.includes('cloudinary.com')) {
      // Extract the public ID from the Cloudinary URL
      const matches = urlOrKey.match(/\/v\d+\/(.+?)\./);
      if (matches && matches[1]) {
        return matches[1];
      }
    }
    
    // If it's a key, assume it's already a public ID
    return urlOrKey;
  }

  /**
   * Upload a single file
   */
  uploadSingleFile = (req: Request, res: Response, next: NextFunction) => {
    const uploadSingle = upload.single('file');

    uploadSingle(req, res, async (err) => {
      if (err instanceof multer.MulterError) {
        // A Multer error occurred when uploading
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(new AppError(
            'File too large. Maximum size is 5MB',
            HTTPSTATUS.BAD_REQUEST,
            ErrorCode.MEDIA_SIZE_EXCEEDED
          ));
        }
        return next(new AppError(
          `Upload error: ${err.message}`,
          HTTPSTATUS.BAD_REQUEST,
          ErrorCode.MEDIA_UPLOAD_FAILED
        ));
      } else if (err) {
        // An unknown error occurred
        return next(new AppError(
          err.message,
          HTTPSTATUS.BAD_REQUEST,
          ErrorCode.MEDIA_UPLOAD_FAILED
        ));
      }

      try {
        if (!req.file) {
          throw new AppError(
            'No file uploaded',
            HTTPSTATUS.BAD_REQUEST,
            ErrorCode.MEDIA_UPLOAD_FAILED
          );
        }

        // Upload to Cloudinary
        const folder = process.env.CLOUDINARY_FOLDER || 'celebs_media';
        const result = await this.cloudinaryService.uploadFile(req.file.path, folder);
        
        // Create media entry
        const mediaData = {
          fileName: req.file.filename,
          originalname: req.file.originalname,
          mimeType: req.file.mimetype,
          size: req.file.size,
          filePath: req.file.path,
          url: result.secureUrl,
          key: result.publicId,
          entityId: req.body.entityId,
          entityType: req.body.entityType,
          createdBy: req.user?.userId || 'system'
        };

        const media = await this.mediaService.createMedia(mediaData);

        // Delete the temporary file
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }

        res.status(HTTPSTATUS.CREATED).json({
          success: true,
          message: 'File uploaded successfully',
          data: media
        });
      } catch (error) {
        // If there's an error, clean up the uploaded file
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        next(error);
      }
    });
  };

  /**
   * Upload multiple files
   */
  uploadMultipleFiles = (req: Request, res: Response, next: NextFunction) => {
    const uploadMultiple = upload.array('files', 10); // Max 10 files

    uploadMultiple(req, res, async (err) => {
      if (err instanceof multer.MulterError) {
        // A Multer error occurred when uploading
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(new AppError(
            'File too large. Maximum size is 5MB',
            HTTPSTATUS.BAD_REQUEST,
            ErrorCode.MEDIA_SIZE_EXCEEDED
          ));
        } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return next(new AppError(
            'Too many files. Maximum is 10 files',
            HTTPSTATUS.BAD_REQUEST,
            ErrorCode.MEDIA_UPLOAD_FAILED
          ));
        }
        return next(new AppError(
          `Upload error: ${err.message}`,
          HTTPSTATUS.BAD_REQUEST,
          ErrorCode.MEDIA_UPLOAD_FAILED
        ));
      } else if (err) {
        // An unknown error occurred
        return next(new AppError(
          err.message,
          HTTPSTATUS.BAD_REQUEST,
          ErrorCode.MEDIA_UPLOAD_FAILED
        ));
      }

      try {
        if (!req.files || req.files.length === 0) {
          throw new AppError(
            'No files uploaded',
            HTTPSTATUS.BAD_REQUEST,
            ErrorCode.MEDIA_UPLOAD_FAILED
          );
        }

        const folder = process.env.CLOUDINARY_FOLDER || 'celebs_media';
        const mediaDataArray = [];
        
        // Upload each file to Cloudinary
        for (const file of req.files as Express.Multer.File[]) {
          const result = await this.cloudinaryService.uploadFile(file.path, folder);
          
          mediaDataArray.push({
            fileName: file.filename,
            originalname: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            filePath: file.path,
            url: result.secureUrl,
            key: result.publicId,
            entityId: req.body.entityId,
            entityType: req.body.entityType,
            createdBy: req.user?.userId || 'system'
          });
          
          // Delete the temporary file
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        }

        const media = await this.mediaService.createMultipleMedia(mediaDataArray);

        res.status(HTTPSTATUS.CREATED).json({
          success: true,
          message: 'Files uploaded successfully',
          data: media
        });
      } catch (error) {
        // If there's an error, clean up the uploaded files
        if (req.files) {
          (req.files as Express.Multer.File[]).forEach(file => {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          });
        }
        next(error);
      }
    });
  };

  /**
   * Get a media by ID
   */
  getMediaById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const media = await this.mediaService.getMediaById(id);

      res.status(HTTPSTATUS.OK).json({
        success: true,
        data: media
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get media for a specific entity
   */
  getMediaForEntity = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { entityId, entityType } = req.params;
      const media = await this.mediaService.getMediaForEntity(entityId, entityType);

      res.status(HTTPSTATUS.OK).json({
        success: true,
        data: media
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete a media
   */
  deleteMedia = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      
      // Get the media to find the publicId before deleting
      const media = await this.mediaService.getMediaById(id);
      
      // Delete from Cloudinary if we have a key/publicId
      if (media.key) {
        const publicId = this.extractPublicIdFromUrlOrKey(media.key);
        await this.cloudinaryService.deleteFile(publicId);
      }
      
      // Delete from database
      const result = await this.mediaService.deleteMedia(id);

      res.status(HTTPSTATUS.OK).json({
        success: true,
        message: 'Media deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete media for an entity
   */
  deleteMediaForEntity = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { entityId, entityType } = req.params;
      
      // Get all media for the entity
      const mediaItems = await this.mediaService.getMediaForEntity(entityId, entityType);
      
      // Delete each media from Cloudinary
      for (const media of mediaItems) {
        if (media.key) {
          const publicId = this.extractPublicIdFromUrlOrKey(media.key);
          await this.cloudinaryService.deleteFile(publicId);
        }
      }
      
      // Delete all from database
      const result = await this.mediaService.deleteMediaForEntity(entityId, entityType);

      res.status(HTTPSTATUS.OK).json({
        success: true,
        message: `${result.count} media items deleted successfully`
      });
    } catch (error) {
      next(error);
    }
  };
}
