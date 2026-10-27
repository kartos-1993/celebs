import { Card, CardContent } from '@celebs/shared-ui/components/card';
import { formatMoneyAmount } from '@celebs/shared-utils';

import type { PlatformOverview } from '../api';

interface OverviewTileProps {
  label: string;
  value: string;
  subtext?: string;
  tone?: 'default' | 'highlight' | 'deduction' | 'success';
}

function OverviewTile({ label, value, subtext, tone = 'default' }: OverviewTileProps) {
  const colorMap = {
    default: 'text-foreground',
    highlight: 'text-blue-600 dark:text-blue-400 font-bold',
    deduction: 'text-rose-600 dark:text-rose-400',
    success: 'text-emerald-600 dark:text-emerald-400',
  };

  return (
    <Card className={tone === 'highlight' ? 'border-primary/50 shadow-sm' : undefined}>
      <CardContent className="space-y-1.5 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className={`font-mono text-xl tabular-nums ${colorMap[tone]}`}>
          {formatMoneyAmount(value)}
        </p>
        {subtext ? <p className="text-xs text-muted-foreground">{subtext}</p> : null}
      </CardContent>
    </Card>
  );
}

export function MarketplaceOverviewCards({ overview }: { overview: PlatformOverview }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        <OverviewTile
          label="Marketplace GMV"
          value={overview.totalGmv}
          subtext={`Gross across ${overview.activeSellersCount} active sellers`}
        />
        <OverviewTile
          label="Platform Commission"
          value={overview.totalPlatformCommission}
          subtext="Net platform revenue before tax"
        />
        <OverviewTile
          label="13% Nepal VAT"
          value={overview.totalVatCollected}
          subtext="Statutory VAT on commission"
        />
        <OverviewTile
          label="Customer Refunds"
          value={overview.totalRefunds}
          subtext="Returned & reversed volume"
          tone="deduction"
        />
        <OverviewTile
          label="Settled Disbursements"
          value={overview.totalSettledPayouts}
          subtext="Cleared to sellers' accounts"
          tone="success"
        />
        <OverviewTile
          label="Pending Escrow Settlement"
          value={overview.pendingSettlementBalance}
          subtext="Held in bank escrow pool"
          tone="highlight"
        />
      </div>
    </div>
  );
}
