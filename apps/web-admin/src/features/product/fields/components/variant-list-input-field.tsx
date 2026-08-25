import React from 'react';
import { useController, useFormContext } from 'react-hook-form';

import { Multiselect } from '@celebs/shared-ui/components/multiselect';

import type { UiProps } from '../ui-registry';

import { useOptions } from './dropdown-input-field';
import { FieldError, LabelWithRequired, rulesFrom } from './shared';

export function VariantListInputField({ field, control }: UiProps) {
  const { setValue } = useFormContext();
  const { field: f, fieldState } = useController({
    name: field.name,
    control,
    rules: rulesFrom(field),
  });
  const opts = useOptions(field);
  const selected = Array.isArray(f.value) ? f.value : [];
  return (
    <div className="space-y-1">
      <LabelWithRequired required={field.required}>{field.label}</LabelWithRequired>
      <Multiselect
        options={opts}
        value={selected}
        onChange={(next) => {
          setValue(field.name, next, {
            shouldDirty: true,
            shouldValidate: true,
          });
        }}
        placeholder={`Select ${field.label}`}
      />
      <FieldError message={fieldState.error?.message} />
    </div>
  );
}
