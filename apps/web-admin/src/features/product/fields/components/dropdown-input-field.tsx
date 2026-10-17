import React from 'react';
import { useController } from 'react-hook-form';

import { SearchableSelect } from '@celebs/shared-ui/components/searchable-select';

import { useFieldErrorReveal } from '../../hooks/use-submission-state';
import type { UiProps } from '../ui-registry';

import { FieldError, LabelWithRequired, rulesFrom } from './shared';
import { useOptions } from './use-options';

export { useOptions };

export function DropdownInputField({ field, control }: UiProps) {
  const { field: f, fieldState } = useController({
    name: field.name,
    control,
    rules: rulesFrom(field),
  });
  const opts = useOptions(field);
  // Gated on THIS field's path, never on the form: a sibling being worked on
  // is not consent to render this select's error.
  const { revealError } = useFieldErrorReveal(control);
  const visibleError = revealError(field.name) ? fieldState.error : undefined;
  return (
    // SearchableSelect takes a fixed prop set (no name/rest spread), so the
    // field is addressed for `focusFirstError` via `data-field-name`;
    // `tabIndex={-1}` makes this wrapper programmatically focusable without
    // adding a tab stop.
    <div className="space-y-1" data-field-name={field.name} tabIndex={-1}>
      <LabelWithRequired required={field.required}>{field.label}</LabelWithRequired>
      <SearchableSelect
        options={opts}
        value={f.value ?? ''}
        onChange={(val) => f.onChange(val)}
        placeholder={`Select ${field.label}`}
      />
      <FieldError message={visibleError?.message} />
    </div>
  );
}
