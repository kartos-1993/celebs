import { Input } from '@celebs/shared-ui/components/input';
import { Label } from '@celebs/shared-ui/components/label';

import { formatMoney, isShortfall, netFromDeclared } from '../lib/money';

/**
 * The two figures a courier always states together, and what they come to.
 *
 * Split out of the dialog so the arithmetic and its tests live in one place and
 * the dialog stays a thin shell around them.
 */

/** What is in the inputs: characters, because that is what a keypad produces. */
export interface StatementDraft {
  declaredCollected: string;
  declaredFees: string;
  reference: string;
  notes: string;
}

/**
 * What goes over the wire.
 *
 * Separate from the draft because the inputs hold characters and the API takes
 * numbers, and conflating them is how a half-typed "18." ends up submitted as 18.
 * The conversion happens once, in the dialog, only when both figures parse.
 */
export interface StatementSubmission {
  declaredCollected: number;
  declaredFees: number;
  reference?: string;
  notes?: string;
}

interface StatementFieldsProps {
  draft: StatementDraft;
  onChange: (draft: StatementDraft) => void;
}

export function StatementFields({ draft, onChange }: StatementFieldsProps) {
  const net = netFromDeclared(draft.declaredCollected, draft.declaredFees);

  const update = (key: keyof StatementDraft, value: string) => onChange({ ...draft, [key]: value });

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="declared-collected">Collected</Label>
        <Input
          id="declared-collected"
          inputMode="decimal"
          placeholder="1800.00"
          value={draft.declaredCollected}
          onChange={(event) => update('declaredCollected', event.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="declared-fees">Fees they charged</Label>
        <Input
          id="declared-fees"
          inputMode="decimal"
          placeholder="200.00"
          value={draft.declaredFees}
          onChange={(event) => update('declaredFees', event.target.value)}
        />
      </div>

      {net === null ? null : (
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Net, once their fees are taken off
          </p>
          <p className={isShortfall(net) ? 'font-semibold text-destructive' : 'font-medium'}>
            {formatMoney(net)}
          </p>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="declared-reference">Their reference</Label>
        <Input
          id="declared-reference"
          placeholder="PATHAO-STMT-09"
          value={draft.reference}
          onChange={(event) => update('reference', event.target.value)}
        />
      </div>
    </div>
  );
}
