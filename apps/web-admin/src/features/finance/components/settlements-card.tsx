import { Button } from '@celebs/shared-ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@celebs/shared-ui/components/card';
import { EmptyState } from '@celebs/shared-ui/components/empty-state';

import type { SettlementBatch } from '../api';

import { SettlementsTable } from './settlements-table';

interface SettlementsCardProps {
  batches: SettlementBatch[];
  courierFilter?: string;
  onCourierFilterChange: (courier?: string) => void;
  onOpenBatch: () => void;
  onRecordStatement: (batch: SettlementBatch) => void;
  onReconcile: (batch: SettlementBatch) => void;
  onPay: (batch: SettlementBatch) => void;
}

export function SettlementsCard({
  batches,
  courierFilter,
  onCourierFilterChange,
  onOpenBatch,
  onRecordStatement,
  onReconcile,
  onPay,
}: SettlementsCardProps) {
  const isEmpty = batches.length === 0;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Settlements</CardTitle>
          <CardDescription>
            One batch per courier per period. The variance is what the two sides disagree on.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={courierFilter ?? ''}
            onChange={(e) => onCourierFilterChange(e.target.value ? e.target.value : undefined)}
          >
            <option value="">All couriers</option>
            <option value="PATHAO">Pathao</option>
          </select>
          <Button size="sm" onClick={onOpenBatch}>
            Open batch
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEmpty ? (
          <EmptyState
            title="No settlements yet"
            description="Open a period to begin reconciling."
            action={
              <Button variant="outline" size="sm" className="mt-2" onClick={onOpenBatch}>
                Open batch
              </Button>
            }
          />
        ) : (
          <SettlementsTable
            batches={batches}
            onRecordStatement={onRecordStatement}
            onReconcile={onReconcile}
            onPay={onPay}
          />
        )}
      </CardContent>
    </Card>
  );
}
