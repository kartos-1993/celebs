import { PackageOpen } from 'lucide-react';

import { EmptyState } from '@celebs/shared-ui/components/empty-state';
import { PageHeader } from '@celebs/shared-ui/components/page-header';

const ReturnOrders = () => {
  return (
    <div className="space-y-6">
      <PageHeader title="Return Orders" description="Manage return orders here." />
      <EmptyState
        icon={<PackageOpen className="h-10 w-10" />}
        title="No return requests yet"
        description="Return requests from customers will appear here."
      />
    </div>
  );
};

export default ReturnOrders;
