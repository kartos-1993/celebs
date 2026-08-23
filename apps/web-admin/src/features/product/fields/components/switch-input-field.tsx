import React from 'react';
import { useController } from 'react-hook-form';
import { Checkbox } from '@celebs/shared-ui/components/checkbox';
import type { UiProps } from '../ui-registry';

import { FieldError, LabelWithRequired, rulesFrom } from './shared';

export function SwitchInputField({ field, control }: UiProps) {
  const { field: f, fieldState } = useController({
    name: field.name,
    control,
    rules: rulesFrom(field),
  });
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Checkbox
          id={`field-${field.name}`}
          checked={!!f.value}
          onCheckedChange={(val) => f.onChange(!!val)}
        />
        <LabelWithRequired required={field.required} htmlFor={`field-${field.name}`}>
          {field.label}
        </LabelWithRequired>
      </div>
      <FieldError message={fieldState.error?.message} />
    </div>
  );
}
