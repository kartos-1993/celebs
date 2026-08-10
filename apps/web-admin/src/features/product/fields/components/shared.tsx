import React from 'react';
import { Label } from '@celebs/shared-ui/components/label';
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
  const rules: any = {};
  if (field.required) {
    rules.required = `${field.label} is required`;
  }
  if (field.uiType === 'number') {
    if (field.rule?.min != null)
      rules.min = { value: field.rule.min, message: `Min ${field.rule.min}` };
    if (field.rule?.max != null)
      rules.max = { value: field.rule.max, message: `Max ${field.rule.max}` };
  }
  if (field.uiType === 'multiselect') {
    rules.validate = (v: any) =>
      !field.required || (Array.isArray(v) && v.length > 0) || `${field.label} is required`;
  }
  if (field.uiType === 'VariantList') {
    rules.validate = (v: any) =>
      !field.required || (Array.isArray(v) && v.length > 0) || `${field.label} is required`;
  }
  return rules;
}

export function LabelWithRequired({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <Label className="font-medium">
      <span>{children}</span>
      {required ? <span className="ml-1 text-red-500">*</span> : null}
    </Label>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <div className="text-xs text-red-500 mt-1">{message}</div>;
}
