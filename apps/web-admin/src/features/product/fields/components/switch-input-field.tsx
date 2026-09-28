import React from 'react';
import { useController } from 'react-hook-form';

import { Checkbox } from '@celebs/shared-ui/components/checkbox';

import { useFieldErrorReveal } from '../../hooks/use-submission-state';
import type { UiProps } from '../ui-registry';

import { FieldError, LabelWithRequired, rulesFrom } from './shared';

export function SwitchInputField({ field, control }: UiProps) {
  const { field: f, fieldState } = useController({
    name: field.name,
    control,
    rules: rulesFrom(field),
  });
  // Gated on THIS field's path, never on the form: a sibling being worked on
  // is not consent to render this switch's error.
  const { revealError } = useFieldErrorReveal(control);
  const visibleError = revealError(field.name) ? fieldState.error : undefined;
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        {/* Radix Checkbox reroutes a `name` prop to a hidden form-control input
            (only rendered inside a form and not focusable), so the focusable
            button itself carries `data-field-name` for `focusFirstError`. */}
        <Checkbox
          id={`field-${field.name}`}
          data-field-name={field.name}
          checked={!!f.value}
          onCheckedChange={(val) => f.onChange(!!val)}
        />
        <LabelWithRequired required={field.required} htmlFor={`field-${field.name}`}>
          {field.label}
        </LabelWithRequired>
      </div>
      <FieldError message={visibleError?.message} />
    </div>
  );
}
