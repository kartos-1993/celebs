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

import { CourierSettlementsTab } from '../components/courier-settlements-tab';
import { MarketplaceOverviewCards } from '../components/marketplace-overview-cards';
import { SellerRemittanceTable } from '../components/seller-remittance-table';
import { usePlatformOverview, usePlatformSellers } from '../hooks/use-finance-queries';

import { PageSkeleton } from '@/components/page-skeleton';

/**
 * Platform marketplace financial overview, seller remittance directory,
 * and courier settlement reconciliation.
 */
const Finance = () => {
  const [tab, setTab] = useState<'overview' | 'sellers' | 'couriers'>('overview');
  const [sellersPage, setSellersPage] = useState(1);

  const overviewQuery = usePlatformOverview();
  const sellersQuery = usePlatformSellers({ page: sellersPage, limit: 25 });

  const overview = overviewQuery.data?.data;
  const sellers = sellersQuery.data?.data ?? [];

  if (overviewQuery.isPending && tab === 'overview') {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance"
        description="Marketplace volume, seller remittance directory, and courier settlements."
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'overview' | 'sellers' | 'couriers')}>
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Marketplace Overview</TabsTrigger>
          <TabsTrigger value="sellers">Seller Directory</TabsTrigger>
          <TabsTrigger value="couriers">Courier Settlements</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {overview ? <MarketplaceOverviewCards overview={overview} /> : null}
        </TabsContent>

        <TabsContent value="sellers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Seller Remittance Directory</CardTitle>
              <CardDescription>
                Merchant sales, commission withholding, and configured banking channels.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SellerRemittanceTable sellers={sellers} />
              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="outline"
                  disabled={sellersPage <= 1}
                  onClick={() => setSellersPage((p) => Math.max(1, p - 1))}
                >
                  Previous page
                </Button>
                <span className="text-sm font-medium text-muted-foreground">
                  Page {sellersPage}
                </span>
                <Button
                  variant="outline"
                  disabled={sellers.length < 25}
                  onClick={() => setSellersPage((p) => p + 1)}
                >
                  Next page
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="couriers">
          <CourierSettlementsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Finance;
