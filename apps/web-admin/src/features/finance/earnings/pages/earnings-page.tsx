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

import { EarningsSummaryCards } from '../components/earnings-summary-cards';
import { EarningsTable } from '../components/earnings-table';
import { useEarningsList, useEarningsSummary } from '../hooks';

const PAGE_SIZE = 25;

/**
 * What this seller sold, what the platform took, and what is theirs.
 *
 * Commission is a visible deduction rather than a smaller gross. The alternative
 * is a number they cannot reconcile, and a seller who cannot reconcile one figure
 * will not trust the next one - which is the whole reason the deduction is shown
 * rather than folded in.
 */
const EarningsPage = () => {
  const [page, setPage] = useState(1);

  const summary = useEarningsSummary();
  const entries = useEarningsList({ page, limit: PAGE_SIZE });

  const loading = summary.isPending || entries.isPending;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  const totals = summary.data?.summary;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Earnings"
        description="Your sales, the platform commission on them, and what you keep."
      />

      {totals ? <EarningsSummaryCards summary={totals} /> : null}

      <Card>
        <CardHeader>
          <CardTitle>Every entry</CardTitle>
          <CardDescription>
            One line per movement. Delivery is passed through at cost, so it never changes what you
            keep.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(entries.data ?? []).length === 0 ? (
            <EmptyState
              title="Nothing recorded yet"
              description="Entries appear as your orders are processed."
            />
          ) : (
            <EarningsTable entries={entries.data ?? []} />
          )}

          <div className="flex items-center justify-between pt-2">
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
              disabled={(entries.data ?? []).length < PAGE_SIZE}
              onClick={() => setPage((current) => current + 1)}
            >
              Next page
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EarningsPage;
