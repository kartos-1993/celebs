import { ConfirmDialog } from '@celebs/shared-ui/components/confirm-dialog';

import type { useSettlementWorkflow } from '../hooks/use-settlement-workflow';

import { StatementDialog } from './statement-dialog';

type Workflow = ReturnType<typeof useSettlementWorkflow>;

interface SettlementDialogsProps {
  workflow: Workflow;
}

/**
 * The two dialogs the settlements table can raise.
 *
 * Grouped so the page reads as layout only. Both are driven entirely by the
 * workflow hook: it decides what is open, what the button says, and what the
 * confirmation warns about.
 */
export function SettlementDialogs({ workflow }: SettlementDialogsProps) {
  return (
    <>
      <StatementDialog
        batch={workflow.editing}
        onClose={workflow.dismiss}
        onSubmit={workflow.saveStatement}
        submitting={workflow.submitting}
        error={workflow.error}
      />

      <ConfirmDialog
        open={workflow.pending !== null}
        onOpenChange={(open) => (open ? null : workflow.dismiss())}
        title={workflow.confirmTitle}
        description={workflow.confirmBody}
        confirmLabel="Confirm"
        onConfirm={workflow.advance}
      />
    </>
  );
}
