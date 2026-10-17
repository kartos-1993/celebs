import React from 'react';
import { useController, useFormContext } from 'react-hook-form';
import { Lock } from 'lucide-react';

import { Checkbox } from '@celebs/shared-ui/components/checkbox';
import { Input } from '@celebs/shared-ui/components/input';
import { NumberInput } from '@celebs/shared-ui/components/number-input';

import { useFieldErrorReveal } from '../../hooks/use-submission-state';

import { FieldErrorCompact } from './shared';

import { cn } from '@/lib/utils';

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
  // ONE gate for all three render sites below. The SKU cell is addressed by its
  // OWN path (`sku.variants.Color.Red.price`), so editing a Red price never
  // lights up the Blue cell sitting next to it.
  const { revealError } = useFieldErrorReveal(control);
  const isPriceField = name.endsWith('.price');
  const isSpecialPriceField = name.endsWith('.specialPrice');
  const isNonNegativeField = name.endsWith('.stock');
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
  const visibleError = revealError(name) ? fieldState.error : undefined;
  const errorMessage = visibleError?.message;
  // The cell is a grid track, not a stacked field: the message rides the
  // control's `title` instead of a block under it, so a failing cell never
  // grows the row. Sighted hover and screen readers both get the text.
  const lockedNote = isLocked
    ? `SKU is locked for live products to maintain warehouse barcodes: ${String(field.value ?? '')}`
    : String(field.value ?? '');

  return (
    <>
      {type === 'number' ? (
        // `size="sm"` sizes BOTH the wrapper and the inner input. The old
        // `h-7 sm:h-8` on the wrapper alone left the primitive's hardcoded
        // inner `h-9` overflowing the border and taller than its row siblings.
        <NumberInput
          required={required}
          placeholder="0"
          size="sm"
          invalid={!!visibleError}
          aria-invalid={!!visibleError}
          title={errorMessage}
          className="px-1 text-xs"
          {...field}
        />
      ) : (
        <div className="relative">
          <Input
            required={required}
            readOnly={isLocked}
            tabIndex={isLocked ? -1 : undefined}
            placeholder=""
            title={errorMessage ?? lockedNote}
            aria-invalid={!!visibleError}
            className={cn(
              // `h-8` (was `h-7 sm:h-8`) so every cell in the row shares one
              // height and the checkbox below them cannot drift.
              'h-8 px-1.5 font-mono text-xs',
              isLocked && 'cursor-not-allowed select-all bg-muted/60 pr-6 text-muted-foreground',
              !!errorMessage && 'border-destructive focus-visible:ring-destructive',
            )}
            {...field}
          />

          {isLocked && (
            <div
              className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2"
              title="Locked for published product"
            >
              <Lock className="h-3 w-3 text-muted-foreground/70" />
            </div>
          )}
        </div>
      )}
      <FieldErrorCompact message={errorMessage} />
    </>
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
