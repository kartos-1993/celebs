import mongoose, { Schema, Document } from 'mongoose';

export interface IBanner extends Document {
  imageUrl: string;
  linkType: 'PRODUCT' | 'CATEGORY' | 'EXTERNAL' | 'NONE';
  linkValue?: string;
  title?: string;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BannerSchema: Schema = new Schema(
  {
    imageUrl: {
      type: String,
      required: true,
      trim: true,
    },
    linkType: {
      type: String,
      enum: ['PRODUCT', 'CATEGORY', 'EXTERNAL', 'NONE'],
      default: 'NONE',
    },
    linkValue: {
      type: String,
      trim: true,
      default: '',
    },
    title: {
      type: String,
      trim: true,
      default: '',
    },
    order: {
      type: Number,
      required: true,
      default: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index on order
BannerSchema.index({ order: 1 });

export const BannerModel = mongoose.model<IBanner>('Banner', BannerSchema);
