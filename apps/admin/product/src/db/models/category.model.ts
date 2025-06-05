import mongoose, { Schema, Document } from 'mongoose';

// Interface for Category document
interface CategoryAttribute {
  name: string;
  type: 'text' | 'select' | 'multiselect' | 'number' | 'boolean';
  values: string[];
  isRequired: boolean;
}

export interface ICategory extends Document {
  name: string;
  slug: string;
  level: number;
  parent: mongoose.Types.ObjectId | null;
  path: mongoose.Types.ObjectId[];
  attributes: CategoryAttribute[];
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
    attributes: [
      {
        name: { type: String, required: true },
        type: {
          type: String,
          enum: ['text', 'select', 'multiselect', 'number', 'boolean'],
          required: true,
        },
        values: [{ type: String }],
        isRequired: { type: Boolean, default: false },
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
