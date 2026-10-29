import { Badge } from '@celebs/shared-ui/components/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@celebs/shared-ui/components/table';

import type { SettlementBatch } from '../api';
import { formatMoney, formatSignedVariance, isShortfall } from '../lib/money';
import { actionsFor } from '../lib/settlement-actions';

import { RowActionsMenu } from '@/components/row-actions-menu';

/**
 * What a courier owes us, and what they say they owe.
 *
 * Both columns are shown rather than only the difference. A variance with nothing
 * beside it cannot be argued about, and this table exists to be argued with.
 *
 * The money is monospaced and tabular so the paisa lines up between columns -
 * a column of hand-aligned digits is how a two-paisa difference gets missed.
 */

const STATUS_LABEL: Record<SettlementBatch['status'], string> = {
  OPEN: 'Open',
  RECONCILED: 'Reconciled',
  PAID: 'Paid',
};

function formatPeriod(batch: SettlementBatch): string {
  const start = new Date(batch.periodStart);
  const end = new Date(batch.periodEnd);
  const month = (date: Date) =>
    date.toLocaleDateString('en-NP', { month: 'short', year: 'numeric', timeZone: 'UTC' });

  return `${month(start)} - ${month(end)}`;
}

function VarianceCell({ variance }: { variance: string }) {
  const shortfall = isShortfall(variance);

  return (
    <span className={shortfall ? 'font-semibold text-destructive' : 'font-medium'}>
      {formatSignedVariance(variance)}
    </span>
  );
}

interface SettlementsTableProps {
  batches: SettlementBatch[];
  onRecordStatement: (batch: SettlementBatch) => void;
  onReconcile: (batch: SettlementBatch) => void;
  onPay: (batch: SettlementBatch) => void;
}

export function SettlementsTable({
  batches,
  onRecordStatement,
  onReconcile,
  onPay,
}: SettlementsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Courier</TableHead>
          <TableHead>Period</TableHead>
          <TableHead className="text-right">Expected COD Collection</TableHead>
          <TableHead className="text-right">Remitted by Courier</TableHead>
          <TableHead>Variance / Discrepancy</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-10">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {batches.map((batch) => {
          const actions = actionsFor(batch);

          const menu = [
            actions.canRecordStatement && {
              label: 'Record statement',
              onSelect: () => onRecordStatement(batch),
            },
            actions.canReconcile && {
              label: 'Mark reconciled',
              onSelect: () => onReconcile(batch),
            },
            actions.canPay && {
              label: 'Mark paid',
              onSelect: () => onPay(batch),
            },
          ].filter((item): item is { label: string; onSelect: () => void } => item !== false);

          return (
            <TableRow key={batch.id}>
              <TableCell className="font-medium">{batch.courier}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{formatPeriod(batch)}</TableCell>
              <TableCell className="text-right font-mono text-xs tabular-nums">
                {formatMoney(batch.expectedCollected)}
              </TableCell>
              <TableCell className="text-right font-mono text-xs tabular-nums">
                {formatMoney(batch.declaredCollected)}
              </TableCell>
              <TableCell>
                <VarianceCell variance={batch.variance} />
              </TableCell>
              <TableCell>
                <Badge variant={batch.status === 'PAID' ? 'default' : 'secondary'}>
                  {STATUS_LABEL[batch.status]}
                </Badge>
              </TableCell>
              <TableCell>
                {menu.length === 0 ? null : (
                  <RowActionsMenu items={menu} label={`Actions for ${batch.courier}`} />
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
