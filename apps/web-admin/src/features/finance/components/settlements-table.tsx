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
}

export function SettlementsTable({ batches }: SettlementsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Courier</TableHead>
          <TableHead>Period</TableHead>
          <TableHead className="text-right">We expected</TableHead>
          <TableHead className="text-right">Courier declared</TableHead>
          <TableHead>Variance</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {batches.map((batch) => (
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
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
