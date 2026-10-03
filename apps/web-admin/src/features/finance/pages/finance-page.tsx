import { useState } from 'react';

import { Button } from '@celebs/shared-ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@celebs/shared-ui/components/card';
import { EmptyState } from '@celebs/shared-ui/components/empty-state';
import { PageHeader } from '@celebs/shared-ui/components/page-header';
import { Spinner } from '@celebs/shared-ui/components/spinner';

import { LedgerTable } from '../components/ledger-table';
import { SettlementsTable } from '../components/settlements-table';
import { useLedgerEntries, useSettlementBatches } from '../hooks/use-finance-queries';

const PAGE_SIZE = 25;

/**
 * Two tables, in the order they get argued about in: what the couriers say they
 * owe, then the book that says otherwise.
 *
 * Deliberately thin. Every figure here is a string off the wire, so the only real
 * decisions - what a shortfall means, when zero is an answer - live in ../lib/money
 * and are tested there rather than being re-decided inside a render.
 */
const Finance = () => {
  const [page, setPage] = useState(1);

  const settlements = useSettlementBatches({ page, limit: PAGE_SIZE });
  const ledger = useLedgerEntries({ page, limit: PAGE_SIZE });

  const loading = settlements.isPending || ledger.isPending;
  const batches = settlements.data?.data ?? [];
  const entries = ledger.data?.data ?? [];

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

      <Card>
        <CardHeader>
          <CardTitle>Settlements</CardTitle>
          <CardDescription>
            One batch per courier per period. The variance is what the two sides disagree on.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {batches.length === 0 ? (
            <EmptyState
              title="No settlements yet"
              description="Open a period to begin reconciling."
            />
          ) : (
            <SettlementsTable batches={batches} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ledger</CardTitle>
          <CardDescription>
            Append-only. Entries are never edited or deleted, only added.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {entries.length === 0 ? (
            <EmptyState
              title="Nothing recorded yet"
              description="Ledger entries appear as orders and settlements are processed."
            />
          ) : (
            <LedgerTable entries={entries} />
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button variant="outline" onClick={() => setPage((current) => current + 1)}>
          Next page
        </Button>
      </div>
    </div>
  );
};

export default Finance;
