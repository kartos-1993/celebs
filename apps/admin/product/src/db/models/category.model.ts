import mongoose, { Schema, Document } from 'mongoose';
import { IAttribute } from './attribute.model';

// Interface for Category document
export interface ICategory extends Document {
  name: string;
  slug: string;
  level: number;
  parent: mongoose.Types.ObjectId | null;
  path: string[];
  attributes?: IAttribute[];
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
      unique: true,
      index: true,
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
    parent: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
      index: true,
    },
    path: [{ type: String }],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Virtual field for attributes
CategorySchema.virtual('attributes', {
  ref: 'Attribute',
  localField: '_id',
  foreignField: 'categoryId',
  options: { sort: { displayOrder: 1 } },
});

// Add indexes
CategorySchema.index({ slug: 1 });
CategorySchema.index({ path: 1 });

export const CategoryModel = mongoose.model<ICategory>(
  'Category',
  CategorySchema,
);
