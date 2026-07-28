import mongoose, { Schema, Document } from 'mongoose';
import { IAttribute } from './attribute.model';

// Interface for Category document
export interface ICategory extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  level: number;
  parentCategory: mongoose.Types.ObjectId | null;
  path: string[];
  attributes?: IAttribute[];
  sizeChartColumns?: string[];
  imageUrl?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Schema for Category
const CategorySchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    level: {
      type: Number,
      required: true,
      default: 1,
    },
    parentCategory: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
      index: true,
    },
    path: [{ type: String }],
    sizeChartColumns: [{ type: String }],
    imageUrl: { type: String, default: null },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

CategorySchema.virtual('parent')
  .get(function(this: any) {
    return this.parentCategory;
  })
  .set(function(this: any, val: any) {
    this.parentCategory = val;
  });

// Add indexes
CategorySchema.index({ path: 1 });
CategorySchema.index({ name: 1, parentCategory: 1 }, { unique: true });


export const CategoryModel = mongoose.model<ICategory>(
  'Category',
  CategorySchema,
);
