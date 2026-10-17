import { useState } from 'react';

import { Button } from '@celebs/shared-ui/components/button';
import { PageHeader } from '@celebs/shared-ui/components/page-header';

import { LedgerCard } from '../components/ledger-card';
import { OpenBatchDialog } from '../components/open-batch-dialog';
import { SettlementDialogs } from '../components/settlement-dialogs';
import { SettlementsCard } from '../components/settlements-card';
import { useLedgerEntries, useSettlementBatches } from '../hooks/use-finance-queries';
import { useSettlementWorkflow } from '../hooks/use-settlement-workflow';

import { PageSkeleton } from '@/components/page-skeleton';

const PAGE_SIZE = 25;

/**
 * What the couriers say they owe, then the book that says otherwise.
 *
 * Layout only. Every figure is a string off the wire, and the decisions - what a
 * shortfall means, when zero is an answer, which move is legal next - live in
 * ../lib with their tests beside them.
 */
const Finance = () => {
  const [page, setPage] = useState(1);
  const [courier, setCourier] = useState<string | undefined>(undefined);
  const [openBatchOpen, setOpenBatchOpen] = useState(false);
  const workflow = useSettlementWorkflow();

  const settlements = useSettlementBatches({ courier, page, limit: PAGE_SIZE });
  const ledger = useLedgerEntries({ page, limit: PAGE_SIZE });

  const batches = settlements.data?.data ?? [];
  const entries = ledger.data?.data ?? [];
  const loading = settlements.isPending || ledger.isPending;

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance"
        description="What each courier settled, and what our own ledger says happened."
      />

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
};

export default Finance;
