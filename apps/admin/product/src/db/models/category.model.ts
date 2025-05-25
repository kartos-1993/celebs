import mongoose, { Schema, Document } from 'mongoose';

// Interface for Category document
export interface ICategory extends Document {
  name: string;
  slug: string;
  parent: mongoose.Types.ObjectId | null;
  subcategories: mongoose.Types.ObjectId[];
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
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    parent: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },
    subcategories: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Category',
      },
    ],
  },
  {
    timestamps: true,
  },
);

export const CategoryModel = mongoose.model<ICategory>(
  'Category',
  CategorySchema,
);
