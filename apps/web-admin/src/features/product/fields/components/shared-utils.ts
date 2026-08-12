import { ProductApiService } from '../../api';
import type { FieldSpec } from '../ui-registry';

export type ImageValue = File | string;

export const imageValueKey = (value: ImageValue) =>
  typeof value === 'string' ? value : `${value.name}-${value.size}-${value.lastModified}`;

export const uploadImageFiles = async (files: File[]) => {
  if (files.length === 0) return [];
  const urls = await ProductApiService.uploadFiles(files);
  if (urls.length < files.length) {
    throw new Error('Image upload did not return a URL. Try again.');
  }
  return urls;
};

export const uploadErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Image upload failed. Try again.';

export const validateFileBasics = (
  file: File,
  options: { accept?: string[]; maxSize?: number },
) => {
  if (typeof options.maxSize === 'number' && file.size > options.maxSize) {
    return `Each image must be <= ${Math.round(options.maxSize / 1024 / 1024)}MB`;
  }
  if (Array.isArray(options.accept) && !options.accept.includes(file.type)) {
    return 'Invalid file type';
  }
  return null;
};

export function rulesFrom(field: FieldSpec) {
  const rules: Record<string, unknown> = {};
  if (field.required) {
    rules.required = `${field.label} is required`;
  }
  if (field.uiType === 'number') {
    if (field.rule?.min != null)
      rules.min = { value: field.rule.min, message: `Min ${field.rule.min}` };
    if (field.rule?.max != null)
      rules.max = { value: field.rule.max, message: `Max ${field.rule.max}` };
  }
  if (field.uiType === 'multiselect' || field.uiType === 'VariantList') {
    rules.validate = (v: unknown) =>
      !field.required || (Array.isArray(v) && v.length > 0) || `${field.label} is required`;
  }
  return rules;
}
