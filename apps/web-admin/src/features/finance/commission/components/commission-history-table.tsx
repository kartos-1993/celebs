import { Badge } from '@celebs/shared-ui/components/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@celebs/shared-ui/components/table';

import type { CommissionRule } from '../api';

/**
 * Every rate that has ever applied.
 *
 * Oldest first, so it reads as a story: the rate went from 7.5 to 9 on this date,
 * and anything sold before it was charged the earlier one. An admin who cannot
 * answer "what was the rate when this seller complained" cannot defend the charge.
 */

function formatDate(value: string | null): string {
  if (!value) return '—';

  return new Date(value).toLocaleDateString('en-NP', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function scopeLabel(rule: CommissionRule): string {
  if (rule.scope === 'GLOBAL') return 'Whole marketplace';
  if (rule.scope === 'CATEGORY') return 'Category';
  return 'Seller';
}

export function CommissionHistoryTable({ rules }: { rules: CommissionRule[] }) {
  if (rules.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No rate has been set yet. Nothing is deducted from a seller until one is.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Applies to</TableHead>
          <TableHead className="text-right">Rate</TableHead>
          <TableHead>From</TableHead>
          <TableHead>To</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rules.map((rule) => (
          <TableRow key={rule.id}>
            <TableCell className="font-medium">{scopeLabel(rule)}</TableCell>
            <TableCell className="text-right font-mono text-xs tabular-nums">
              {rule.ratePercent}%
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {formatDate(rule.effectiveFrom)}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {formatDate(rule.effectiveTo)}
            </TableCell>
            <TableCell>
              <Badge variant={rule.effectiveTo === null ? 'default' : 'secondary'}>
                {rule.effectiveTo === null ? 'Current' : 'Superseded'}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
