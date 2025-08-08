import mongoose, { Schema, Document } from 'mongoose';

export interface IOptionSet extends Document {
  name: string;
  type: 'color' | 'size';
  values: string[];
  createdAt: Date;
  updatedAt: Date;
}

const OptionSetSchema: Schema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    type: { type: String, enum: ['color', 'size'], required: true, index: true },
    values: [{ type: String, required: true }],
  },
  { timestamps: true }
);

export const OptionSetModel = mongoose.model<IOptionSet>('OptionSet', OptionSetSchema);
