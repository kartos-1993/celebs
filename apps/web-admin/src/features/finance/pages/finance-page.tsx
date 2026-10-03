import { useState } from 'react';

import { Button } from '@celebs/shared-ui/components/button';
import { PageHeader } from '@celebs/shared-ui/components/page-header';
import { Spinner } from '@celebs/shared-ui/components/spinner';

import { LedgerCard } from '../components/ledger-card';
import { SettlementDialogs } from '../components/settlement-dialogs';
import { SettlementsCard } from '../components/settlements-card';
import { useLedgerEntries, useSettlementBatches } from '../hooks/use-finance-queries';
import { useSettlementWorkflow } from '../hooks/use-settlement-workflow';

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
  const workflow = useSettlementWorkflow();

  const settlements = useSettlementBatches({ page, limit: PAGE_SIZE });
  const ledger = useLedgerEntries({ page, limit: PAGE_SIZE });

  const batches = settlements.data?.data ?? [];
  const entries = ledger.data?.data ?? [];
  const loading = settlements.isPending || ledger.isPending;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance"
        description="What each courier settled, and what our own ledger says happened."
      />

      <SettlementsCard
        batches={batches}
        onRecordStatement={workflow.requestStatement}
        onReconcile={(batch) => workflow.requestAdvance(batch, 'RECONCILED')}
        onPay={(batch) => workflow.requestAdvance(batch, 'PAID')}
      />

      <LedgerCard entries={entries} />

      <div className="flex justify-end">
        <Button variant="outline" onClick={() => setPage((current) => current + 1)}>
          Next page
        </Button>
      </div>

      <SettlementDialogs workflow={workflow} />
    </div>
  );
};

export default Finance;
