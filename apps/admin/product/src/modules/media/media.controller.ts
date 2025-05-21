import { Request, Response, NextFunction } from 'express';
import { MediaService } from './media.service';
import { HTTPSTATUS } from '../../config/http.config';
import { AppError } from '../../common/utils/AppError';
import { ErrorCode } from '../../common/enums/error-code.enum';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../../../uploads');
    
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
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
  constructor(private mediaService: MediaService) {}

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
        }        // Create media entry
        const mediaData = {
          fileName: req.file.filename,
          originalname: req.file.originalname,
          mimeType: req.file.mimetype,
          size: req.file.size,
          filePath: req.file.path,
          url: `/uploads/${req.file.filename}`,
          key: req.file.filename,
          entityId: req.body.entityId,
          entityType: req.body.entityType,
          createdBy: req.user?.userId || 'system'
        };

        const media = await this.mediaService.createMedia(mediaData);

        res.status(HTTPSTATUS.CREATED).json({
          success: true,
          message: 'File uploaded successfully',
          data: media
        });
      } catch (error) {
        // If there's an error, clean up the uploaded file
        if (req.file) {
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
        }        // Create media entries for each file
        const mediaDataArray = (req.files as Express.Multer.File[]).map(file => ({
          fileName: file.filename,
          originalname: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          filePath: file.path,
          url: `/uploads/${file.filename}`,
          key: file.filename,
          entityId: req.body.entityId,
          entityType: req.body.entityType,
          createdBy: req.user?.userId || 'system'
        }));

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
            fs.unlinkSync(file.path);
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
      
      return res.status(HTTPSTATUS.OK).json({
        success: true,
        message: 'Media retrieved successfully',
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
      
      return res.status(HTTPSTATUS.OK).json({
        success: true,
        message: 'Media retrieved successfully',
        data: media
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete a media by ID
   */
  deleteMedia = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      
      // Get the media first to get the file path
      const media = await this.mediaService.getMediaById(id);
      
      // Delete the actual file
      if (media.filePath && fs.existsSync(media.filePath)) {
        fs.unlinkSync(media.filePath);
      }
      
      await this.mediaService.deleteMedia(id);
      
      return res.status(HTTPSTATUS.NO_CONTENT).send();
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete all media for a specific entity
   */
  deleteMediaForEntity = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { entityId, entityType } = req.params;
      
      // Get all media for the entity first to get the file paths
      const mediaItems = await this.mediaService.getMediaForEntity(entityId, entityType);
      
      // Delete all the actual files
      mediaItems.forEach(media => {
        if (media.filePath && fs.existsSync(media.filePath)) {
          fs.unlinkSync(media.filePath);
        }
      });
      
      const result = await this.mediaService.deleteMediaForEntity(entityId, entityType);
      
      return res.status(HTTPSTATUS.OK).json({
        success: true,
        message: `Deleted ${result.count} media files`,
        data: result
      });
    } catch (error) {
      next(error);
    }
  };
}
