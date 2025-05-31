import mongoose, { Schema, Document } from 'mongoose';

// Interface for Category document
export interface ICategory extends Document {
  name: string;
  slug: string;
  level: number;
  parent: mongoose.Types.ObjectId | null;
  path: mongoose.Types.ObjectId[];

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
  },
);

export const CategoryModel = mongoose.model<ICategory>(
  'Category',
  CategorySchema,
);
