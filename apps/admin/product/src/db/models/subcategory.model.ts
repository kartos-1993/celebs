import mongoose, { Schema, Document } from 'mongoose';

// Interface for Attribute
interface IAttribute {
  name: string;
}

// Interface for Subcategory document
export interface ISubcategory extends Document {
  name: string;
  slug: string;
  category: mongoose.Types.ObjectId;
  attributes: IAttribute[];
  createdAt: Date;
  updatedAt: Date;
}

// Schema for Subcategory
const SubcategorySchema: Schema = new Schema(
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
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    attributes: [
      {
        name: {
          type: String,
          required: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  },
);

// Add pre-save hook to generate slug if not provided
SubcategorySchema.pre<ISubcategory>('save', function (next) {
  if (!this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]+/g, '');
  }
  next();
});

export const SubcategoryModel = mongoose.model<ISubcategory>(
  'Subcategory',
  SubcategorySchema,
);
