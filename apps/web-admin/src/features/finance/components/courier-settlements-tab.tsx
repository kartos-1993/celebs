import { useState } from 'react';

import { Button } from '@celebs/shared-ui/components/button';

import { useLedgerEntries, useSettlementBatches } from '../hooks/use-finance-queries';
import { useSettlementWorkflow } from '../hooks/use-settlement-workflow';

import { LedgerCard } from './ledger-card';
import { OpenBatchDialog } from './open-batch-dialog';
import { SettlementDialogs } from './settlement-dialogs';
import { SettlementsCard } from './settlements-card';

const PAGE_SIZE = 25;

export function CourierSettlementsTab() {
  const [page, setPage] = useState(1);
  const [courier, setCourier] = useState<string | undefined>(undefined);
  const [openBatchOpen, setOpenBatchOpen] = useState(false);
  const workflow = useSettlementWorkflow();

  const settlements = useSettlementBatches({ courier, page, limit: PAGE_SIZE });
  const ledger = useLedgerEntries({ page, limit: PAGE_SIZE });

  const batches = settlements.data?.data ?? [];
  const entries = ledger.data?.data ?? [];

  return (
    <div className="space-y-6">
      <SettlementsCard
        batches={batches}
        courierFilter={courier}
        onCourierFilterChange={setCourier}
        onOpenBatch={() => setOpenBatchOpen(true)}
        onRecordStatement={workflow.requestStatement}
        onReconcile={(batch) => workflow.requestAdvance(batch, 'RECONCILED')}
        onPay={(batch) => workflow.requestAdvance(batch, 'PAID')}
      />

      <LedgerCard entries={entries} />

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          disabled={page <= 1}
          onClick={() => setPage((current) => Math.max(1, current - 1))}
        >
          Previous page
        </Button>
        <span className="text-sm font-medium text-muted-foreground">Page {page}</span>
        <Button
          variant="outline"
          disabled={batches.length < PAGE_SIZE && entries.length < PAGE_SIZE}
          onClick={() => setPage((current) => current + 1)}
        >
          Next page
        </Button>
      </div>

      <SettlementDialogs workflow={workflow} />
      <OpenBatchDialog open={openBatchOpen} onClose={() => setOpenBatchOpen(false)} />
    </div>
  );
}
