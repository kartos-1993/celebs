import { UserCog } from 'lucide-react';

import { EmptyState } from '@celebs/shared-ui/components/empty-state';
import { PageHeader } from '@celebs/shared-ui/components/page-header';

const AccountSettings = () => {
  return (
    <div className="space-y-6">
      <PageHeader title="Account Settings" description="Manage your account details here." />
      <EmptyState
        icon={<UserCog className="h-10 w-10" />}
        title="Nothing here yet"
        description="This section is under construction."
      />
    </div>
  );
};

export default AccountSettings;
