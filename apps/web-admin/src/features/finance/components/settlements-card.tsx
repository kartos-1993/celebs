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
  onRecordStatement: (batch: SettlementBatch) => void;
  onReconcile: (batch: SettlementBatch) => void;
  onPay: (batch: SettlementBatch) => void;
}

export function SettlementsCard({
  batches,
  onRecordStatement,
  onReconcile,
  onPay,
}: SettlementsCardProps) {
  const isEmpty = batches.length === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Settlements</CardTitle>
        <CardDescription>
          One batch per courier per period. The variance is what the two sides disagree on.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEmpty ? (
          <EmptyState
            title="No settlements yet"
            description="Open a period to begin reconciling."
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
