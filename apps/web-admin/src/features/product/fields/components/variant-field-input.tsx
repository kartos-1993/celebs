import React from 'react';
import { useController, useFormContext } from 'react-hook-form';
import { Lock } from 'lucide-react';

import { Checkbox } from '@celebs/shared-ui/components/checkbox';
import { Input } from '@celebs/shared-ui/components/input';
import { NumberInput } from '@celebs/shared-ui/components/number-input';

import { FieldError } from './shared';

export function VariantFieldInput({
  name,
  type,
  required,
  isLocked,
}: {
  name: string;
  type?: 'number';
  required?: boolean;
  isLocked?: boolean;
}) {
  const { control, getValues } = useFormContext();
  const isPriceField = name.endsWith('.price');
  const isSpecialPriceField = name.endsWith('.specialPrice');
  const isNonNegativeField = name.endsWith('.stock') || name.endsWith('.freeItems');
  const { field, fieldState } = useController({
    name,
    control,
    // Mount controlled from the first render: without a default the input
    // flips uncontrolled→controlled on the first typed or bulk-filled value.
    defaultValue: '',
    rules:
      type === 'number'
        ? {
            validate: (value: unknown) => {
              const raw = String(value ?? '').trim();
              if (!raw) {
                if (!required) return true;
                if (name.endsWith('.stock')) return 'Stock is required';
                if (isPriceField) return 'Price is required';
                return 'This field is required';
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
        <div className="relative">
          <Input
            required={required}
            readOnly={isLocked}
            tabIndex={isLocked ? -1 : undefined}
            placeholder=""
            title={
              isLocked
                ? `SKU is locked for live products to maintain warehouse barcodes: ${String(field.value ?? '')}`
                : String(field.value ?? '')
            }
            className={`font-mono text-xs px-1.5 h-7 sm:h-8 ${
              isLocked ? 'bg-muted/60 text-muted-foreground cursor-not-allowed pr-6 select-all' : ''
            } ${fieldState.error ? 'border-destructive focus-visible:ring-destructive' : ''}`}
            {...field}
          />
          {isLocked && (
            <div
              className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none"
              title="Locked for published product"
            >
              <Lock className="h-3 w-3 text-muted-foreground/70" />
            </div>
          )}
        </div>
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
