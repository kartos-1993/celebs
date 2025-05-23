import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../../config/cloudinary.config';
import { v4 as uuidv4 } from 'uuid';

// Configure Cloudinary storage for Multer
export const cloudinaryStorage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => ({
    folder: process.env.CLOUDINARY_FOLDER || 'celebs_media',
    resource_type: 'auto',
    public_id: (() => {
      const uniqueSuffix = uuidv4();
      const fileNameWithoutExt = file.originalname.split('.')[0];
      return `${fileNameWithoutExt}-${uniqueSuffix}`;
    })(),
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'], // Add other formats as needed
  }),
});
