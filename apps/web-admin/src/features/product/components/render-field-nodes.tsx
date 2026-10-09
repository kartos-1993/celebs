import type { Control, FieldValues } from 'react-hook-form';

import { uiTypeRegistry } from '../fields/ui-registry';
import type { FieldSpec } from '../types';

export function renderFieldNodes(list: FieldSpec[], control: Control<FieldValues>) {
  return list.map((field) => {
    const Comp = uiTypeRegistry[field.uiType];
    if (!Comp) return null;
    const isWide =
      field.uiType === 'ColorMeta' ||
      field.uiType === 'ColorInline' ||
      field.uiType === 'SizeMeasurementsTable';
    return (
      <div key={field.name} className={isWide ? 'col-span-full' : undefined}>
        <Comp field={field} control={control} />
      </div>
    );
  });
}
