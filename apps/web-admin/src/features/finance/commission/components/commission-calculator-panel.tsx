import { useState } from 'react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@celebs/shared-ui/components/card';
import { Input } from '@celebs/shared-ui/components/input';
import { Label } from '@celebs/shared-ui/components/label';
import { formatMoneyAmount } from '@celebs/shared-utils';

import { useCommissionQuote, useCurrentCommissionRate } from '../hooks';

/**
 * The seller's side of commission.
 *
 * A seller thinks in what they keep, not in what we take. "List at 972.97 and you
 * keep 900" is a sentence they can act on; "7.5%" is a rule they have to trust.
 *
 * Placed in the product form rather than behind a report, because the moment it is
 * useful is while deciding a price - not after a sale has already been made.
 *
 * The three figures reconcile by subtraction, which is the only way they can: the
 * commission shown is the difference between the list price and what is left.
 */

function FigureRow({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string | null;
  emphasis?: boolean;
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={`font-mono tabular-nums ${
          emphasis ? 'text-lg font-semibold' : 'text-sm font-medium'
        }`}
      >
        {value ?? '—'}
      </p>
    </div>
  );
}

export function CommissionCalculatorPanel() {
  const [desiredNet, setDesiredNet] = useState('');

  const rate = useCurrentCommissionRate();
  const quote = useCommissionQuote(desiredNet);

  const ratePercent = rate.data?.ratePercent ?? null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>What you keep</CardTitle>
        <CardDescription>
          {ratePercent === null
            ? 'Enter what you want to earn and the price to list at.'
            : `Enter what you want to earn. Commission is ${formatMoneyAmount(ratePercent)}% of the listed price.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="desired-net">Amount you want to keep</Label>
          <Input
            id="desired-net"
            inputMode="decimal"
            placeholder="900.00"
            value={desiredNet}
            onChange={(event) => setDesiredNet(event.target.value)}
          />
        </div>

        <div className="space-y-3 border-t pt-3">
          <FigureRow
            label="List the product at"
            value={quote.data ? formatMoneyAmount(quote.data.listPrice) : null}
          />
          <FigureRow
            label="Commission deducted"
            value={quote.data ? formatMoneyAmount(quote.data.commission) : null}
          />
          <FigureRow
            label="You keep"
            value={quote.data ? formatMoneyAmount(quote.data.sellerNet) : null}
            emphasis
          />
        </div>

        {quote.isFetching && desiredNet.length > 0 ? (
          <p className="text-xs text-muted-foreground">Working it out…</p>
        ) : null}

        {quote.isError && desiredNet.length > 0 ? (
          <p className="text-sm text-destructive" role="alert">
            Could not work that out. Check the amount and try again.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
