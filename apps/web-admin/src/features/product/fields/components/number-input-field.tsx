import React from 'react';
import { useController } from 'react-hook-form';

import { Input } from '@celebs/shared-ui/components/input';

import type { UiProps } from '../ui-registry';

import { FieldError, LabelWithRequired, rulesFrom } from './shared';

export function NumberInputField({ field, control }: UiProps) {
  const { field: f, fieldState } = useController({
    name: field.name,
    control,
    rules: rulesFrom(field),
  });
  return (
    <div className="space-y-1">
      <LabelWithRequired required={field.required}>{field.label}</LabelWithRequired>
      <Input
        type="number"
        {...f}
        placeholder={field.label}
        className={fieldState.error ? 'border-destructive focus-visible:ring-destructive' : ''}
      />
      <FieldError message={fieldState.error?.message} />
    </div>
  );
}
