import { useState } from 'react';

import { Button } from '@celebs/shared-ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@celebs/shared-ui/components/card';
import { Input } from '@celebs/shared-ui/components/input';
import { Label } from '@celebs/shared-ui/components/label';

import type { CommissionScope, SetCommissionRateInput } from '../api';

/**
 * Publishing a new rate.
 *
 * A percentage, typed as an admin thinks about it: "7.5" and "7.50" are the same
 * rate, and neither is asked to be a fraction.
 *
 * The scope selector is here even though only GLOBAL is publishable today. It is
 * inert for the narrower scopes rather than hidden, because a rule that charges
 * electronics and apparel differently is the reason this is a table and not a
 * setting - and an admin who cannot see that the capability exists will ask for it
 * in code instead.
 */

const SCOPE_LABEL: Record<CommissionScope, string> = {
  GLOBAL: 'Whole marketplace',
  CATEGORY: 'By category',
  VENDOR: 'By seller',
};

const SCOPE_HINT: Record<CommissionScope, string> = {
  GLOBAL: 'One rate for every sale. What ships today.',
  CATEGORY: 'A rate for a category whose margins or return rates differ.',
  VENDOR: 'A rate agreed with one seller, used ahead of the category rate.',
};

export interface CommissionRateFormProps {
  currentRatePercent: string;
  maxPercent: string;
  submitting: boolean;
  error: string | null;
  onPublish: (input: SetCommissionRateInput) => void;
}

export function CommissionRateForm({
  currentRatePercent,
  maxPercent,
  submitting,
  error,
  onPublish,
}: CommissionRateFormProps) {
  const [rate, setRate] = useState('');
  const [scope, setScope] = useState<CommissionScope>('GLOBAL');

  // Scope alone is not enough to publish: a category or vendor rule needs to say
  // which. Refused in the form rather than left to a server error the admin has to
  // decode.
  const needsTarget = scope !== 'GLOBAL';
  const canPublish = rate.trim().length > 0 && !submitting;

  const handlePublish = () => {
    onPublish({ scope, ratePercent: rate.trim() });
    setRate('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change the rate</CardTitle>
        <CardDescription>
          Publishing closes the current rate rather than editing it. Orders already placed keep the
          rate they were charged, and the previous rate stays visible below.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="commission-scope">Applies to</Label>
          <select
            id="commission-scope"
            value={scope}
            onChange={(event) => setScope(event.target.value as CommissionScope)}
            className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
          >
            {(Object.keys(SCOPE_LABEL) as CommissionScope[]).map((value) => (
              <option key={value} value={value} disabled={value !== 'GLOBAL'}>
                {SCOPE_LABEL[value]}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">{SCOPE_HINT[scope]}</p>
        </div>

        {needsTarget ? (
          <p className="text-sm text-muted-foreground">
            {SCOPE_LABEL[scope]} rules need to name which{' '}
            {scope === 'CATEGORY' ? 'category' : 'seller'}. Not selectable from here yet.
          </p>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="commission-rate">New rate (%)</Label>
          <Input
            id="commission-rate"
            inputMode="decimal"
            placeholder={currentRatePercent === '0.00' ? '7.5' : currentRatePercent}
            value={rate}
            onChange={(event) => setRate(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Currently {currentRatePercent}%. Must be between 0% and {maxPercent}%.
          </p>
        </div>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <Button onClick={handlePublish} disabled={!canPublish || needsTarget}>
          Publish rate
        </Button>
      </CardContent>
    </Card>
  );
}
