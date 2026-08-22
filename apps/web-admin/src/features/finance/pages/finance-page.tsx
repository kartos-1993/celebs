import { Banknote } from 'lucide-react';

import { EmptyState } from '@celebs/shared-ui/components/empty-state';
import { PageHeader } from '@celebs/shared-ui/components/page-header';

const Finance = () => {
  return (
    <div className="space-y-6">
      <PageHeader title="Finance" description="View and manage financial details here." />
      <EmptyState
        icon={<Banknote className="h-10 w-10" />}
        title="Nothing here yet"
        description="This section is under construction."
      />
    </div>
  );
};

export default Finance;
