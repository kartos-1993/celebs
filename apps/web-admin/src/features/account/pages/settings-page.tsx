import { Settings } from 'lucide-react';

import { EmptyState } from '@celebs/shared-ui/components/empty-state';
import { PageHeader } from '@celebs/shared-ui/components/page-header';

const SettingsPage = () => {
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Update your account settings here." />
      <EmptyState
        icon={<Settings className="h-10 w-10" />}
        title="Nothing here yet"
        description="This section is under construction."
      />
    </div>
  );
};

export default SettingsPage;
