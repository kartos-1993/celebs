import { UploadApiOptions, UploadApiResponse } from 'cloudinary';
import cloudinary from '../../config/cloudinary.config';
import { Readable } from 'stream';
import { AppError } from '../../common/utils/AppError';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { HTTPSTATUS } from '../../config/http.config';

export interface CloudinaryUploadResult {
  url: string;
  secureUrl: string;
  publicId: string;
  format: string;
  width: number;
  height: number;
  resourceType: string;
}

export class CloudinaryService {
  /**
   * Upload a file buffer to Cloudinary
   */
  async uploadBuffer(
    buffer: Buffer,
    folder: string = process.env.CLOUDINARY_FOLDER || 'celebs_media',
    options: UploadApiOptions = {}
  ): Promise<CloudinaryUploadResult> {
    try {
      // Convert buffer to readable stream
      const readableStream = new Readable({
        read() {
          this.push(buffer);
          this.push(null);
        }
      });

      // Set up upload options
      const uploadOptions: UploadApiOptions = {
        folder,
        resource_type: 'auto',
        ...options
      };

      // Upload to Cloudinary using stream upload
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) {
              reject(
                new AppError(
                  `Cloudinary upload failed: ${error.message}`,
                  HTTPSTATUS.INTERNAL_SERVER_ERROR,
                  ErrorCode.MEDIA_UPLOAD_FAILED
                )
              );
              return;
            }

            if (!result) {
              reject(
                new AppError(
                  'Cloudinary upload failed: No result returned',
                  HTTPSTATUS.INTERNAL_SERVER_ERROR,
                  ErrorCode.MEDIA_UPLOAD_FAILED
                )
              );
              return;
            }

            resolve({
              url: result.url,
              secureUrl: result.secure_url,
              publicId: result.public_id,
              format: result.format,
              width: result.width,
              height: result.height,
              resourceType: result.resource_type
            });
          }
        );

        readableStream.pipe(uploadStream);
      });
    } catch (error) {
      throw new AppError(
        `Cloudinary upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HTTPSTATUS.INTERNAL_SERVER_ERROR,
        ErrorCode.MEDIA_UPLOAD_FAILED
      );
    }
  }

  /**
   * Upload a file to Cloudinary from a file path
   */
  async uploadFile(
    filePath: string,
    folder: string = process.env.CLOUDINARY_FOLDER || 'celebs_media',
    options: UploadApiOptions = {}
  ): Promise<CloudinaryUploadResult> {
    try {
      // Set up upload options
      const uploadOptions: UploadApiOptions = {
        folder,
        resource_type: 'auto',
        ...options
      };

      // Upload to Cloudinary using file upload
      const result = await cloudinary.uploader.upload(filePath, uploadOptions);

      return {
        url: result.url,
        secureUrl: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        width: result.width,
        height: result.height,
        resourceType: result.resource_type
      };
    } catch (error) {
      throw new AppError(
        `Cloudinary upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HTTPSTATUS.INTERNAL_SERVER_ERROR,
        ErrorCode.MEDIA_UPLOAD_FAILED
      );
    }
  }

  /**
   * Delete a file from Cloudinary by public ID
   */
  async deleteFile(publicId: string, resourceType: string = 'image'): Promise<{ result: string }> {
    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType as any
      });

      if (result.result !== 'ok') {
        throw new AppError(
          `Cloudinary deletion failed: ${result.result}`,
          HTTPSTATUS.INTERNAL_SERVER_ERROR,
          ErrorCode.MEDIA_DELETE_FAILED
        );
      }

      return { result: result.result };
    } catch (error) {
      throw new AppError(
        `Cloudinary deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HTTPSTATUS.INTERNAL_SERVER_ERROR,
        ErrorCode.MEDIA_DELETE_FAILED
      );
    }
  }
}
