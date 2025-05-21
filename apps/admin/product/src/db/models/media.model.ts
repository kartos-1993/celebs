import mongoose, { Schema, Document } from 'mongoose';

// Interface for Media document
export interface IMedia extends Document {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
  url: string;
  key: string; // S3 key
  productId?: mongoose.Types.ObjectId; // Optional, as media can be uploaded without associating
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Schema for Media
const MediaSchema: Schema = new Schema(
  {
    filename: { 
      type: String, 
      required: true 
    },
    originalname: { 
      type: String, 
      required: true 
    },
    mimetype: { 
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
    key: { 
      type: String, 
      required: true 
    },
    productId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Product'
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
