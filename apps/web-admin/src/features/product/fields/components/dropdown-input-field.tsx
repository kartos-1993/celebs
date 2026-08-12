import React from 'react';
import { useController } from 'react-hook-form';
import { SearchableSelect } from '@celebs/shared-ui/components/searchable-select';
import type { UiProps } from '../ui-registry';
import { LabelWithRequired, FieldError, rulesFrom } from './shared';
import { useOptions } from './use-options';

// eslint-disable-next-line react-refresh/only-export-components
export { useOptions };

export function DropdownInputField({ field, control }: UiProps) {
  const { field: f, fieldState } = useController({
    name: field.name,
    control,
    rules: rulesFrom(field),
  });
  const opts = useOptions(field);
  return (
    <div className="space-y-1">
      <LabelWithRequired required={field.required}>{field.label}</LabelWithRequired>
      <SearchableSelect
        options={opts}
        value={f.value ?? ''}
        onChange={(val) => f.onChange(val)}
        placeholder={`Select ${field.label}`}
      />
      <FieldError message={fieldState.error?.message} />
    </div>
  );
}
