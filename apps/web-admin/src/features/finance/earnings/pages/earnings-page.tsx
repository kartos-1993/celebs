import { useState } from 'react';

import { Button } from '@celebs/shared-ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@celebs/shared-ui/components/card';
import { PageHeader } from '@celebs/shared-ui/components/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@celebs/shared-ui/components/tabs';

import { EarningsSummaryCards } from '../components/earnings-summary-cards';
import { EarningsTable } from '../components/earnings-table';
import { OrderEarningsTable } from '../components/order-earnings-table';
import { useEarningsList, useEarningsSummary, useOrderEarnings } from '../hooks';

import { DashboardSkeleton } from '@/components/page-skeleton';

const PAGE_SIZE = 25;

/**
 * What this seller sold, what the platform took, and what is theirs.
 * Segmented by Order-grouped breakdown and raw Ledger Audit log.
 */
const EarningsPage = () => {
  const [tab, setTab] = useState<'orders' | 'ledger'>('orders');
  const [page, setPage] = useState(1);

  const summary = useEarningsSummary();
  const orders = useOrderEarnings({ page, limit: PAGE_SIZE });
  const entries = useEarningsList({ page, limit: PAGE_SIZE });

  const loading = summary.isPending || (tab === 'orders' ? orders.isPending : entries.isPending);

  if (loading) return <DashboardSkeleton />;

  const totals = summary.data?.summary;
  const currentCount = tab === 'orders' ? (orders.data ?? []).length : (entries.data ?? []).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Earnings"
        description="Your sales, the platform commission on them, and what you keep."
      />

      {totals ? <EarningsSummaryCards summary={totals} /> : null}

      <Tabs
        value={tab}
        onValueChange={(v) => {
          setTab(v as 'orders' | 'ledger');
          setPage(1);
        }}
      >
        <div className="flex items-center justify-between pb-2">
          <TabsList>
            <TabsTrigger value="orders">By Order</TabsTrigger>
            <TabsTrigger value="ledger">Ledger Audit</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>Order Breakdown</CardTitle>
              <CardDescription>
                Gross item sales, 13% Nepal VAT on platform commission, and credit note deductions
                per order.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <OrderEarningsTable orders={orders.data ?? []} />
              <PaginationControls page={page} count={currentCount} onPageChange={setPage} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ledger">
          <Card>
            <CardHeader>
              <CardTitle>Every Entry</CardTitle>
              <CardDescription>
                Line-by-line chronological movements across revenue, commission, and courier fees.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <EarningsTable entries={entries.data ?? []} />
              <PaginationControls page={page} count={currentCount} onPageChange={setPage} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

function PaginationControls({
  page,
  count,
  onPageChange,
}: {
  page: number;
  count: number;
  onPageChange: (fn: (current: number) => number) => void;
}) {
  return (
    <div className="flex items-center justify-between pt-2">
      <Button
        variant="outline"
        disabled={page <= 1}
        onClick={() => onPageChange((c) => Math.max(1, c - 1))}
      >
        Previous page
      </Button>
      <span className="text-sm font-medium text-muted-foreground">Page {page}</span>
      <Button
        variant="outline"
        disabled={count < PAGE_SIZE}
        onClick={() => onPageChange((c) => c + 1)}
      >
        Next page
      </Button>
    </div>
  );
}

export default EarningsPage;
