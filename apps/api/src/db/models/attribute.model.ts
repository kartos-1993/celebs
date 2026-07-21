import mongoose, { Schema, Document } from 'mongoose';

export type AttributeType =
  | 'text'
  | 'select'
  | 'multiselect'
  | 'number'
  | 'boolean'
  | 'richText'
  | 'image'
  | 'video'
  | 'marketImages'
  | 'mainImage'
  | 'customEditor'
  | 'translateInput'
  | 'listEditor'
  | 'packageWeight'
  | 'packageVolume'
  | 'color-with-image'
  | 'measurement-group'
  | 'size-guide';

// Interface for Attribute document
export interface IAttribute extends Document {
  categoryId: mongoose.Types.ObjectId;
  name: string;
  type: AttributeType;
  values: string[];
  isRequired: boolean;
  label?: string;
  placeholder?: string;
  info?: {
    help?: string;
    top?: string;
  };
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
      enum: [
        'text',
        'select',
        'multiselect',
        'number',
        'boolean',
        'richText',
        'image',
        'video',
        'marketImages',
        'mainImage',
        'customEditor',
        'translateInput',
        'listEditor',
        'packageWeight',
        'packageVolume',
        'color-with-image',
        'measurement-group',
        'size-guide',
      ],
      required: true,
    },
    values: [
      {
        type: String,
        required: true,
      },
    ],
    label: {
      type: String,
      trim: true,
    },
    placeholder: {
      type: String,
      trim: true,
    },
    info: {
      help: { type: String, trim: true },
      top: { type: String, trim: true },
    },

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
