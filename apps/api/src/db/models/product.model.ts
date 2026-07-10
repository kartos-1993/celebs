import mongoose, { Schema, Document } from 'mongoose';

// Interface for product measurement
interface IProductMeasurement {
  name: string;
  value: string;
  unit: string;
}

// Interface for body measurement
interface IBodyMeasurement {
  name: string;
  value: string;
  unit: string;
}

// Interface for Size
interface ISize {
  name: string;
  productMeasurements: IProductMeasurement[];
  bodyMeasurements: IBodyMeasurement[];
}

// Interface for Stock
interface IStock {
  size: string; // Reference to size name
  quantity: number;
}

// Interface for ColorVariant
interface IColorVariant {
  name: string;
  colorCode: string;
  images: string[];
  stocks: IStock[];
}

// Interface for Product document
export interface IProduct extends Document {
  name: string;
  brand?: string;
  slug: string;
  description: string;
  price: number;
  discountedPrice?: number;
  category: mongoose.Types.ObjectId;
  subcategory: mongoose.Types.ObjectId;

  sizes: ISize[];
  colorVariants: IColorVariant[];
  mainImages: string[];
  dynamicData?: Record<string, unknown>;
  tags: string[];
  featured: boolean;
  status: 'draft' | 'pending_review' | 'published' | 'rejected' | 'deactivated' | 'archived';
  vendorId?: string;
  vendorName?: string;
  reviewNote?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Schema for Product
const ProductSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    brand: {
      type: String,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    discountedPrice: {
      type: Number,
      min: 0,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    subcategory: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    sizes: [
      {
        name: {
          type: String,
          required: true,
        },
        productMeasurements: [
          {
            name: { type: String, required: true },
            value: { type: String, required: true },
            unit: { type: String, required: true },
          },
        ],
        bodyMeasurements: [
          {
            name: { type: String, required: true },
            value: { type: String, required: true },
            unit: { type: String, required: true },
          },
        ],
      },
    ],
    colorVariants: [
      {
        name: {
          type: String,
          required: true,
        },
        colorCode: {
          type: String,
          required: true,
        },
        images: [
          {
            type: String,
          },
        ],
        stocks: [
          {
            size: {
              type: String,
              required: true,
            },
            quantity: {
              type: Number,
              required: true,
              min: 0,
              default: 0,
            },
          },
        ],
      },
    ],
    mainImages: [
      {
        type: String,
      },
    ],
    dynamicData: {
      type: Schema.Types.Mixed,
      default: {},
    },
    tags: [
      {
        type: String,
      },
    ],
    featured: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['draft', 'pending_review', 'published', 'rejected', 'deactivated', 'archived'],
      default: 'draft',
      index: true,
    },
    vendorId: {
      type: String,
      index: true,
      default: null,
    },
    vendorName: {
      type: String,
      trim: true,
    },
    reviewNote: {
      type: String,
      trim: true,
    },
    reviewedBy: {
      type: String,
    },
    reviewedAt: {
      type: Date,
    },
    createdBy: {
      type: String,
      required: true,
    },
    updatedBy: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
ProductSchema.index({ status: 1, createdAt: -1 });
ProductSchema.index({ name: 'text', tags: 'text' });

// Add pre-save hook to generate slug if not provided
ProductSchema.pre<IProduct>('save', function (next) {
  if (!this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]+/g, '');

    // Add a timestamp to ensure uniqueness
    this.slug = `${this.slug}-${Date.now().toString().slice(-6)}`;
  }
  next();
});

export const ProductModel = mongoose.model<IProduct>('Product', ProductSchema);
