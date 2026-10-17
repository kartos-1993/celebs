import type { Control, FieldValues } from 'react-hook-form';
import { useWatch } from 'react-hook-form';

import { uiTypeRegistry } from '../fields/ui-registry';
import type { FieldSpec } from '../types';

interface VariantSelectorCardProps {
  fields: FieldSpec[];
  control: Control<FieldValues>;
}

function VariantFieldSlot({ field, control }: { field: FieldSpec; control: Control<FieldValues> }) {
  const value = useWatch({ name: field.name, control });
  const count = Array.isArray(value)
    ? value.length
    : value !== undefined && value !== null && value !== ''
      ? 1
      : 0;
  const Comp = uiTypeRegistry[field.uiType];
  if (!Comp) return null;
  return (
    <div className="relative">
      <Comp field={field} control={control} />
      {count > 0 ? (
        <span className="absolute right-0 top-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium tabular-nums text-primary">
          {count} selected
        </span>
      ) : null}
    </div>
  );
}

/**
 * Dedicated block for variant definition selects (Color, Size, ...).
 * Stacked in a single narrow column so the pickers read top-to-bottom
 * in a fixed order (color → size → others) and visually drive the
 * swatch rows + SKU matrix rendered after them.
 */
export function VariantSelectorCard({ fields, control }: VariantSelectorCardProps) {
  return (
    <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Variants
      </p>
      <div className="mt-3 grid grid-cols-1 gap-y-4 lg:max-w-xl">
        {fields.map((field) => {
          const Comp = uiTypeRegistry[field.uiType];
          if (!Comp) return null;
          return <VariantFieldSlot key={field.name} field={field} control={control} />;
        })}
      </div>
    </div>
  );
}
