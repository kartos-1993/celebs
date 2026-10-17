import type { Control, FieldValues } from 'react-hook-form';

import { Button } from '@celebs/shared-ui/components/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@celebs/shared-ui/components/collapsible';

import { uiTypeRegistry } from '../fields/ui-registry';
import type { FieldSpec } from '../types';

interface DetailsSectionProps {
  fields: FieldSpec[];
  control: Control<FieldValues>;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DetailsSection({ fields, control, isOpen, onOpenChange }: DetailsSectionProps) {
  const first = fields.slice(0, 6);
  const rest = fields.slice(6);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {first.map((field) => {
          const Comp = uiTypeRegistry[field.uiType];
          if (!Comp) return null;
          return (
            <div key={field.name}>
              <Comp field={field} control={control} />
            </div>
          );
        })}
      </div>
      {rest.length > 0 ? (
        <Collapsible open={isOpen} onOpenChange={onOpenChange}>
          <CollapsibleContent className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-2">
            {rest.map((field) => {
              const Comp = uiTypeRegistry[field.uiType];
              if (!Comp) return null;
              return (
                <div key={field.name}>
                  <Comp field={field} control={control} />
                </div>
              );
            })}
          </CollapsibleContent>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="mt-2 text-xs text-primary">
              {isOpen ? 'Show Less Specifications' : `Show ${rest.length} More Specifications`}
            </Button>
          </CollapsibleTrigger>
        </Collapsible>
      ) : null}
    </div>
  );
}
