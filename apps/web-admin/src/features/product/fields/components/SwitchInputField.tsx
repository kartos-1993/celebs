import React from 'react';
import { useController } from 'react-hook-form';
import { Checkbox } from '@celebs/shared-ui/components/checkbox';
import type { UiProps } from '../UiRegistry';

export function SwitchInputField({ field, control }: UiProps) {
  const { field: f } = useController({ name: field.name, control });
  return (
    <label className="flex items-center gap-2">
      <Checkbox
        checked={!!f.value}
        onCheckedChange={(val) => f.onChange(!!val)}
      />
      <span className="text-sm">{field.label}</span>
    </label>
  );
}
