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

export interface ErrorLike {
  message?: string;
  type?: string;
}

/**
 * React Hook Form stores errors as a NESTED tree (`errors.a.b.c.message`),
 * while fields registered under dynamic paths (e.g. `variants.colorMeta.Red.images`)
 * only know their dotted path. Resolve the path segment by segment.
 */
export function getPathError(errors: unknown, path: string): ErrorLike | undefined {
  if (!errors || typeof errors !== 'object') return undefined;
  const resolved = path.split('.').reduce<unknown>((acc, key) => {
    if (acc === null || acc === undefined || typeof acc !== 'object') return undefined;
    return (acc as Record<string, unknown>)[key];
  }, errors);
  if (resolved && typeof resolved === 'object' && 'message' in (resolved as ErrorLike)) {
    return resolved as ErrorLike;
  }
  return undefined;
}
