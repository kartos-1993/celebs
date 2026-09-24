import { Button } from '@celebs/shared-ui/components/button';

import type { UiProps } from '../ui-registry';

import { SizeMeasurementHeader } from './size-measurement-header';
import { SizeMeasurementTable } from './size-measurement-table';
import { useSizeMeasurementsState } from './use-size-measurements-state';

import { cn } from '@/lib/utils';

export function SizeMeasurementsInputField({ field }: UiProps) {
  const state = useSizeMeasurementsState({ field });

  if (state.charts.length === 0) {
    return null;
  }

  if (state.selectedSizes.length === 0) {
    return (
      <div className="mt-4 rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground col-span-full">
        Select product sizes in the section above to enter size chart measurements.
      </div>
    );
  }

  const activeChart = state.charts.find((c) => c.key === state.activeTabKey) || state.charts[0];

  return (
    <div className="col-span-full space-y-4 rounded-xl border bg-card p-4 shadow-2xs">
      <SizeMeasurementHeader unit={state.unit} onUnitToggle={state.handleUnitToggle} />

      {/* Tabs for Multiple Charts */}
      {state.charts.length > 1 && (
        <div className="flex gap-2 border-b">
          {state.charts.map((chart) => {
            const hasError = state.hasErrorsForChartKey(chart.key);
            const isActive = state.activeTabKey === chart.key;
            return (
              <Button
                key={chart.key}
                type="button"
                variant="ghost"
                size="sm"
                data-testid={`measurement-tab-${chart.key}`}
                onClick={() => state.setActiveTabKey(chart.key)}
                className={cn(
                  'h-auto -mb-px gap-1.5 rounded-none border-b-2 px-3 py-2 text-xs font-medium',
                  isActive
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                  hasError && 'text-destructive',
                )}
              >
                {chart.label}
                {hasError && <span className="h-1.5 w-1.5 rounded-full bg-destructive" />}
              </Button>
            );
          })}
        </div>
      )}

      {activeChart && (
        <SizeMeasurementTable
          chart={activeChart}
          selectedSizes={state.selectedSizes}
          unit={state.unit}
        />
      )}
    </div>
  );
}
