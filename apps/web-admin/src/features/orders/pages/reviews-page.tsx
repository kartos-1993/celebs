import { Star } from 'lucide-react';

import { EmptyState } from '@celebs/shared-ui/components/empty-state';
import { PageHeader } from '@celebs/shared-ui/components/page-header';

const Reviews = () => {
  return (
    <div className="space-y-6">
      <PageHeader title="Reviews" description="View and manage customer reviews here." />
      <EmptyState
        icon={<Star className="h-10 w-10" />}
        title="No reviews yet"
        description="Customer reviews will appear here."
      />
    </div>
  );
};

export default Reviews;
