import { Card, CardContent } from '@celebs/shared-ui/components/card';
import { formatMoneyAmount } from '@celebs/shared-utils';

import type { EarningsSummary } from '../api';

/**
 * What the seller keeps, and what came off to get there.
 *
 * Commission is a named line rather than a discount folded into the gross. A
 * seller netting 1,665 with no explanation of the missing 135 will not believe
 * the next figure either, so the deduction is shown next to the thing it was
 * deducted from.
 *
 * The net is rendered last and largest: it is the number they came for.
 */

interface SummaryTileProps {
  label: string;
  value: string;
  currency: string;
  emphasis?: boolean;
  tone?: 'default' | 'deduction';
}

function SummaryTile({
  label,
  value,
  currency,
  emphasis = false,
  tone = 'default',
}: SummaryTileProps) {
  const amountClass = tone === 'deduction' ? 'text-destructive' : '';

  return (
    <Card className={emphasis ? 'border-primary' : undefined}>
      <CardContent className="space-y-1 p-3 sm:p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p
          className={`font-mono tabular-nums ${amountClass} ${
            emphasis ? 'text-xl font-semibold' : 'text-sm font-medium'
          }`}
        >
          {formatMoneyAmount(value)}
        </p>
        <p className="text-xs text-muted-foreground">{currency}</p>
      </CardContent>
    </Card>
  );
}

export function EarningsSummaryCards({ summary }: { summary: EarningsSummary }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <SummaryTile
        label="Total Item Sales"
        value={summary.grossSales}
        currency={summary.currency}
      />
      <SummaryTile
        label="Commission & Fees"
        value={summary.commission}
        currency={summary.currency}
        tone="deduction"
      />
      <SummaryTile label="Refunds & Returns" value={summary.refunds} currency={summary.currency} />
      <SummaryTile
        label="Net Payout"
        value={summary.netEarnings}
        currency={summary.currency}
        emphasis
      />
    </div>
  );
}
