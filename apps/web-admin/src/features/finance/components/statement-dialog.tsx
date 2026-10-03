import { useEffect, useState } from 'react';

import { Button } from '@celebs/shared-ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@celebs/shared-ui/components/dialog';

import type { SettlementBatch } from '../api';
import { formatMoney, netFromDeclared } from '../lib/money';

import { type StatementDraft, StatementFields, type StatementSubmission } from './statement-fields';

/**
 * Typing a courier's statement in.
 *
 * Half a statement is not offered. The API rejects declaredCollected without
 * declaredFees, and offering one field here would only produce an error the
 * operator has to read; both are required because a courier always states both.
 *
 * The variance is shown live as they type, before saving, because the whole point
 * of recording the statement is to see where the two sides differ - finding out
 * only after a save puts a needless step between noticing a shortfall and
 * reacting to it.
 */

const EMPTY_DRAFT: StatementDraft = {
  declaredCollected: '',
  declaredFees: '',
  reference: '',
  notes: '',
};

interface StatementDialogProps {
  batch: SettlementBatch | null;
  onClose: () => void;
  onSubmit: (submission: StatementSubmission) => void;
  submitting: boolean;
  error: string | null;
}

export function StatementDialog({
  batch,
  onClose,
  onSubmit,
  submitting,
  error,
}: StatementDialogProps) {
  const [draft, setDraft] = useState<StatementDraft>(EMPTY_DRAFT);

  // Re-seed per batch, so reopening a different one never shows the last figures.
  useEffect(() => {
    setDraft(EMPTY_DRAFT);
  }, [batch?.id]);

  if (!batch) return null;

  const readyToSave = netFromDeclared(draft.declaredCollected, draft.declaredFees) !== null;

  const handleSubmit = () => {
    onSubmit({
      ...draft,
      declaredCollected: Number(draft.declaredCollected),
      declaredFees: Number(draft.declaredFees),
    });
  };

  return (
    <Dialog open onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record {batch.courier}&#39;s statement</DialogTitle>
          <DialogDescription>
            We worked out {formatMoney(batch.expectedCollected)} should have been collected, less{' '}
            {formatMoney(batch.expectedFees)} in fees. Enter what their statement says.
          </DialogDescription>
        </DialogHeader>

        <StatementFields draft={draft} onChange={setDraft} />

        {error === null ? null : (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !readyToSave}>
            Save statement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
