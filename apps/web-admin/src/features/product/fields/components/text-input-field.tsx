import React from 'react';
import { useController } from 'react-hook-form';

import { Input } from '@celebs/shared-ui/components/input';

import { useFieldErrorReveal } from '../../hooks/use-submission-state';
import type { UiProps } from '../ui-registry';

import { FieldError, LabelWithRequired, rulesFrom } from './shared';

export function TextInputField({ field, control }: UiProps) {
  const { field: f, fieldState } = useController({
    name: field.name,
    control,
    rules: rulesFrom(field),
  });
  // Gated on THIS field's path, never on the form: a sibling being worked on
  // is not consent to render this input's error.
  const { revealError } = useFieldErrorReveal(control);
  const visibleError = revealError(field.name) ? fieldState.error : undefined;
  return (
    <div className="space-y-1">
      <LabelWithRequired required={field.required}>{field.label}</LabelWithRequired>
      <Input
        {...f}
        placeholder={field.label}
        className={visibleError ? 'border-destructive focus-visible:ring-destructive' : ''}
      />
      <FieldError message={visibleError?.message} />
    </div>
  );
}
