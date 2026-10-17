import { useState } from 'react';

import type { SettlementBatch } from '../api';
import type { StatementSubmission } from '../components/statement-fields';
import { confirmBody, confirmTitle, type SettlementIntent } from '../lib/confirm-copy';

import { useUpdateSettlement } from './use-settlement-mutations';

import { useToast } from '@/hooks/use-toast';

/**
 * The three things you can do to a settlement, and the confirmation each deserves.
 *
 * Held here rather than in the page so the page is only layout: which row is
 * being edited, what has been confirmed, and what the toast says are decisions
 * about money, and they do not belong in a render.
 *
 * A statement and a transition are kept as separate intents even though both end
 * in one request, because they are different acts: one records what a third party
 * claims, the other records what we accept.
 */

interface Pending {
  batch: SettlementBatch;
  intent: SettlementIntent;
}

export function useSettlementWorkflow() {
  const { toast } = useToast();
  const update = useUpdateSettlement();
  const [editing, setEditing] = useState<SettlementBatch | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);

  const saveStatement = (submission: StatementSubmission) => {
    if (!editing) return;

    update.mutate(
      {
        id: editing.id,
        payload: {
          declaredCollected: submission.declaredCollected,
          declaredFees: submission.declaredFees,
          ...(submission.reference ? { reference: submission.reference } : {}),
          ...(submission.notes ? { notes: submission.notes } : {}),
        },
      },
      { onSuccess: () => setEditing(null) },
    );
  };

  const advance = () => {
    if (!pending) return;

    const { batch, intent } = pending;

    update.mutate(
      { id: batch.id, payload: { status: intent } },
      {
        onSuccess: () => {
          toast({ title: intent === 'PAID' ? 'Marked paid' : 'Marked reconciled' });
        },
        onSettled: () => setPending(null),
      },
    );
  };

  return {
    editing,
    pending,
    submitting: update.isPending,
    error: update.error instanceof Error ? update.error.message : null,
    requestStatement: setEditing,
    requestAdvance: (batch: SettlementBatch, intent: SettlementIntent) =>
      setPending({ batch, intent }),
    dismiss: () => {
      setEditing(null);
      setPending(null);
    },
    saveStatement,
    advance,
    confirmTitle: pending === null ? '' : confirmTitle(pending.intent),
    confirmBody: pending === null ? undefined : confirmBody(pending.batch, pending.intent),
  };
}
