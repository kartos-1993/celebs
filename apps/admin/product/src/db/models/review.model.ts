import mongoose, { Schema, Document } from 'mongoose';

// Interface for Review document
export interface IReview extends Document {
  product: mongoose.Types.ObjectId;
  user: string; // User ID from auth service
  userName: string;
  rating: number;
  title: string;
  comment: string;
  images: string[];
  verified: boolean; // if the user actually purchased the product
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

// Schema for Review
const ReviewSchema: Schema = new Schema(
  {
    product: { 
      type: Schema.Types.ObjectId, 
      ref: 'Product', 
      required: true 
    },
    user: { 
      type: String,
      required: true 
    },
    userName: { 
      type: String,
      required: true 
    },
    rating: { 
      type: Number, 
      required: true,
      min: 1,
      max: 5 
    },
    title: { 
      type: String, 
      required: true 
    },
    comment: { 
      type: String, 
      required: true 
    },
    images: [{ 
      type: String 
    }],
    verified: { 
      type: Boolean, 
      default: false 
    },
    status: { 
      type: String, 
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    }
  },
  { 
    timestamps: true 
  }
);

// Index for efficient queries
ReviewSchema.index({ product: 1, user: 1 }, { unique: true });

export const ReviewModel = mongoose.model<IReview>('Review', ReviewSchema);
