import React from 'react';

import { Button } from '@celebs/shared-ui/components/button';

import { cn } from '@/lib/utils';

interface SizeMeasurementHeaderProps {
  unit: 'CM' | 'IN';
  onUnitToggle: (unit: 'CM' | 'IN') => void;
}

export function SizeMeasurementHeader({ unit, onUnitToggle }: SizeMeasurementHeaderProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b pb-3">
      <div>
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium text-foreground">Size Chart & Measurements</h4>
          <span className="rounded-md bg-muted px-2 py-0.5 text-3xs font-medium text-muted-foreground uppercase tracking-wider">
            Optional
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Provide measurements for each active size to help buyers choose the right fit.
        </p>
      </div>
      <div className="flex items-center gap-1 rounded-lg border bg-muted p-1 self-start sm:self-auto">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          data-testid="measurement-unit-cm"
          onClick={() => onUnitToggle('CM')}
          className={cn(
            'h-auto rounded-md px-2.5 py-1 text-xs font-semibold',
            unit === 'CM'
              ? 'bg-background text-foreground shadow-2xs hover:bg-background hover:text-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          CM
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          data-testid="measurement-unit-in"
          onClick={() => onUnitToggle('IN')}
          className={cn(
            'h-auto rounded-md px-2.5 py-1 text-xs font-semibold',
            unit === 'IN'
              ? 'bg-background text-foreground shadow-2xs hover:bg-background hover:text-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          IN
        </Button>
      </div>
    </div>
  );
}
