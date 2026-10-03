import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@celebs/shared-ui/components/table';

import type { LedgerEntry } from '../api';
import { formatMoney } from '../lib/money';

/**
 * The append-only book.
 *
 * Direction is spelled out rather than signed, because "IN" on its own does not
 * say whether money arrived or left; and a negative amount is always paired with
 * its direction so the two never have to be read together to be understood.
 */

const TYPE_LABEL: Record<string, string> = {
  REVENUE: 'Sale revenue',
  COURIER_DELIVERY_FEE: 'Courier delivery fee',
  PLATFORM_FEE: 'Platform fee',
  COD_RECEIVED: 'Cash collected',
  REFUND: 'Refund',
  DELIVERY_ABSORBED: 'Delivery absorbed',
  DELIVERY_RETURN: 'Delivery return',
};

function formatWhen(occurredAt: string): string {
  return new Date(occurredAt).toLocaleDateString('en-NP', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

interface LedgerTableProps {
  entries: LedgerEntry[];
}

export function LedgerTable({ entries }: LedgerTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>When</TableHead>
          <TableHead>What</TableHead>
          <TableHead>Courier</TableHead>
          <TableHead>Direction</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => (
          <TableRow key={entry.id}>
            <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
              {formatWhen(entry.occurredAt)}
            </TableCell>
            <TableCell className="font-medium">
              {TYPE_LABEL[entry.type] ?? entry.type}
              {entry.memo ? (
                <span className="block text-xs text-muted-foreground">{entry.memo}</span>
              ) : null}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">{entry.courier ?? '—'}</TableCell>
            <TableCell className="text-sm">
              {entry.direction === 'IN' ? 'Received' : 'Paid out'}
            </TableCell>
            <TableCell className="text-right font-mono text-xs tabular-nums">
              {formatMoney(entry.amount, entry.currency)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
