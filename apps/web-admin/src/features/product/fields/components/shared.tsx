/* eslint-disable react-refresh/only-export-components */
import React from 'react';

import { Label } from '@celebs/shared-ui/components/label';
export {
  type ImageValue,
  imageValueKey,
  rulesFrom,
  uploadErrorMessage,
  uploadImageFiles,
  validateFileBasics,
} from './shared-utils';

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
      {required ? <span className="ml-1 text-destructive">*</span> : null}
    </Label>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <div className="text-xs text-destructive mt-1">{message}</div>;
}
