import mongoose, { Schema, Document } from 'mongoose';

export interface ICategoryFilter extends Document {
  categoryId: mongoose.Types.ObjectId;
  attributeId: mongoose.Types.ObjectId;
  displayName: string;
  uiType: 'checkbox' | 'color_swatch' | 'size_box' | 'range_slider';
  displayOrder: number;
  isMultiSelect: boolean;
  isSearchable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CategoryFilterSchema: Schema = new Schema(
  {
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      index: true,
    },
    attributeId: {
      type: Schema.Types.ObjectId,
      ref: 'Attribute',
      required: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    uiType: {
      type: String,
      enum: ['checkbox', 'color_swatch', 'size_box', 'range_slider'],
      default: 'checkbox',
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    isMultiSelect: {
      type: Boolean,
      default: true,
    },
    isSearchable: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

// Compound index for efficient querying
CategoryFilterSchema.index({ categoryId: 1, displayOrder: 1 });

export const CategoryFilterModel = mongoose.model<ICategoryFilter>(
  'CategoryFilter',
  CategoryFilterSchema,
);
