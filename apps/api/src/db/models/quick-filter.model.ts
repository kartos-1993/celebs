import mongoose, { Schema, Document } from 'mongoose';

export type QuickFilterType = 'subcategory' | 'attribute' | 'tag' | 'collection';
export type QuickFilterDisplayAs = 'avatar_scroll' | 'chip_list' | 'color_swatch';

export interface IQuickFilterItem {
  name: string;
  image?: string | null;
  slug?: string | null;
  filterValue?: string | null;
  displayOrder: number;
}

export interface IQuickFilter extends Document {
  categoryId: mongoose.Types.ObjectId;
  type: QuickFilterType;
  attributeId?: mongoose.Types.ObjectId | null;
  displayAs: QuickFilterDisplayAs;
  items: IQuickFilterItem[];
  autoPopulate: boolean;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const QuickFilterItemSchema = new Schema({
  name: { type: String, required: true, trim: true },
  image: { type: String, default: null },
  slug: { type: String, default: null },
  filterValue: { type: String, default: null },
  displayOrder: { type: Number, default: 0 },
});

const QuickFilterSchema = new Schema(
  {
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['subcategory', 'attribute', 'tag', 'collection'],
      required: true,
      default: 'subcategory',
    },
    attributeId: {
      type: Schema.Types.ObjectId,
      ref: 'Attribute',
      default: null,
    },
    displayAs: {
      type: String,
      enum: ['avatar_scroll', 'chip_list', 'color_swatch'],
      required: true,
      default: 'avatar_scroll',
    },
    items: [QuickFilterItemSchema],
    autoPopulate: {
      type: Boolean,
      default: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

QuickFilterSchema.index({ categoryId: 1, displayOrder: 1 });

export const QuickFilterModel = mongoose.model<IQuickFilter>('QuickFilter', QuickFilterSchema);
