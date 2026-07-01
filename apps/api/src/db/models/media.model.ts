import mongoose, { Schema, Document } from 'mongoose';

// Interface for Media document
export interface IMedia extends Document {
  fileName: string;
  originalname: string;
  mimeType: string;
  size: number;
  url: string;
  filePath: string; // Local file path
  key: string; // S3 key
  productId?: mongoose.Types.ObjectId; // Optional, as media can be uploaded without associating
  entityId?: string; // Generic entity ID (could be a product, review, etc.)
  entityType?: string; // Type of the entity (product, review, etc.)
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Schema for Media
const MediaSchema: Schema = new Schema(
  {
    fileName: { 
      type: String, 
      required: true 
    },
    originalname: { 
      type: String, 
      required: true 
    },
    mimeType: { 
      type: String, 
      required: true 
    },
    size: { 
      type: Number, 
      required: true 
    },
    url: { 
      type: String, 
      required: true 
    },
    filePath: {
      type: String,
      required: true
    },
    key: { 
      type: String, 
      required: true 
    },
    productId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Product'
    },
    entityId: {
      type: String
    },
    entityType: {
      type: String
    },
    createdBy: { 
      type: String, 
      required: true 
    }
  },
  { 
    timestamps: true 
  }
);

export const MediaModel = mongoose.model<IMedia>('Media', MediaSchema);
