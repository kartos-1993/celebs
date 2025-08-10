import mongoose, { Schema, Document } from 'mongoose';

// Interface for Attribute document
export interface IAttribute extends Document {
  categoryId: mongoose.Types.ObjectId;
  name: string;
  type: 'text' | 'select' | 'multiselect' | 'number' | 'boolean';
  values: string[];
  isRequired: boolean;
  group?: 'basic' | 'sale' | 'package' | 'details' | 'termcondition' | 'variant';
  isVariant?: boolean;
  variantType?: 'color' | 'size' | null;
  useStandardOptions?: boolean;
  optionSetId?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

// Schema for Attribute
const AttributeSchema: Schema = new Schema(
  {
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['text', 'select', 'multiselect', 'number', 'boolean'],
      required: true,
    },
    values: [
      {
        type: String,
        required: true,
      },
    ],

    group: {
      type: String,
      enum: ['basic', 'sale', 'package', 'details', 'termcondition', 'variant'],
      default: 'basic',
      index: true,
    },

    isRequired: {
      type: Boolean,
      default: false,
    },
    // Variant support
    isVariant: {
      type: Boolean,
      default: false,
      index: true,
    },
    variantType: {
      type: String,
      enum: ['color', 'size'],
      default: undefined,
    },
    
    useStandardOptions: {
      type: Boolean,
      default: false,
    },
    optionSetId: {
      type: Schema.Types.ObjectId,
      ref: 'OptionSet',
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

// Optimize queries with compound index
AttributeSchema.index({ categoryId: 1, name: 1 });

export const AttributeModel = mongoose.model<IAttribute>(
  'Attribute',
  AttributeSchema,
);
