import React from 'react';
import { useController, useFormContext } from 'react-hook-form';

import { Checkbox } from '@celebs/shared-ui/components/checkbox';
import { Input } from '@celebs/shared-ui/components/input';
import { NumberInput } from '@celebs/shared-ui/components/number-input';

import { FieldError } from './shared';

export function VariantFieldInput({
  name,
  type,
  required,
}: {
  name: string;
  type?: 'number';
  required?: boolean;
}) {
  const { control, getValues } = useFormContext();
  const isPriceField = name.endsWith('.price');
  const isSpecialPriceField = name.endsWith('.specialPrice');
  const isNonNegativeField = name.endsWith('.stock') || name.endsWith('.freeItems');
  const { field, fieldState } = useController({
    name,
    control,
    rules:
      type === 'number'
        ? {
            validate: (value: unknown) => {
              const raw = String(value ?? '').trim();
              if (!raw) {
                return required ? 'This field is required' : true;
              }
              const numeric = Number(raw);
              if (!Number.isFinite(numeric)) {
                return 'Enter a valid number';
              }
              if ((isPriceField || isSpecialPriceField) && numeric <= 0) {
                return 'Must be greater than 0';
              }
              if (isNonNegativeField && numeric < 0) {
                return 'Cannot be negative';
              }
              if (isSpecialPriceField) {
                const basePrice = Number(getValues(name.replace(/\.specialPrice$/, '.price')));
                if (Number.isFinite(basePrice) && numeric >= basePrice) {
                  return 'Must be lower than price';
                }
              }
              return true;
            },
          }
        : required
          ? { required: 'This field is required' }
          : undefined,
  });

  return (
    <div className="space-y-1">
      {type === 'number' ? (
        <NumberInput
          required={required}
          placeholder="0"
          invalid={!!fieldState.error}
          className="text-xs px-1 h-7 sm:h-8"
          {...field}
        />
      ) : (
        <Input
          required={required}
          placeholder=""
          title={String(field.value ?? '')}
          className={`font-mono text-xs px-1.5 h-7 sm:h-8 ${
            fieldState.error ? 'border-destructive focus-visible:ring-destructive' : ''
          }`}
          {...field}
        />
      )}
      <FieldError message={fieldState.error?.message} />
    </div>
  );
}

export function VariantAvailability({ name }: { name: string }) {
  const { control } = useFormContext();
  const { field } = useController({ name, control });
  return (
    <div className="flex justify-center items-center">
      <Checkbox checked={!!field.value} onCheckedChange={(v) => field.onChange(!!v)} />
    </div>
  );
}
