import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@celebs/shared-ui/components/table';
import { formatMoneyAmount } from '@celebs/shared-utils';

import type { EarningsEntry } from '../api';
import { entryDirectionLabel, entryLabel, formatEntryDate } from '../lib/labels';

/**
 * One line of a seller's ledger.
 *
 * The direction is spelled out rather than shown as a signed number: "IN" on its
 * own does not say whether money arrived, and a seller looking at a figure with a
 * minus in front of it has no way to tell a cost from an error.
 *
 * Monospaced and tabular so the paisa lines up between rows - a column of
 * hand-aligned digits is how a two-paisa difference goes unnoticed.
 */

export function EarningsTable({ entries }: { entries: EarningsEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nothing recorded yet. Entries appear as your orders are processed.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>When</TableHead>
          <TableHead>What</TableHead>
          <TableHead>Direction</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => (
          <TableRow key={entry.id}>
            <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
              {formatEntryDate(entry.occurredAt)}
            </TableCell>
            <TableCell className="font-medium">
              {entryLabel(entry)}
              {entry.memo ? (
                <span className="block text-xs text-muted-foreground">{entry.memo}</span>
              ) : null}
            </TableCell>
            <TableCell className="text-sm">{entryDirectionLabel(entry)}</TableCell>
            <TableCell className="text-right font-mono text-xs tabular-nums">
              {formatMoneyAmount(entry.amount)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
