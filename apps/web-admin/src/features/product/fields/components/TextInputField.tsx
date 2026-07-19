import React from 'react';
import { useController } from 'react-hook-form';
import { Input } from '@celebs/shared-ui/components/input';
import type { UiProps } from '../UiRegistry';
import { LabelWithRequired, FieldError, rulesFrom } from './shared';

export function TextInputField({ field, control }: UiProps) {
  const { field: f, fieldState } = useController({
    name: field.name,
    control,
    rules: rulesFrom(field),
  });
  return (
    <div className="space-y-1">
      <LabelWithRequired required={field.required}>
        {field.label}
      </LabelWithRequired>
      <Input
        {...f}
        placeholder={field.label}
        className={
          fieldState.error ? 'border-red-500 focus-visible:ring-red-500' : ''
        }
      />
      <FieldError message={fieldState.error?.message} />
    </div>
  );
}
