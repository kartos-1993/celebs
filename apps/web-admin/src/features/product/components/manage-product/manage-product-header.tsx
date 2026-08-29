import React from 'react';
import { Link } from 'react-router-dom';
import { Info, X } from 'lucide-react';

import { Alert, AlertDescription } from '@celebs/shared-ui/components/alert';
import { Button } from '@celebs/shared-ui/components/button';
import { PageHeader } from '@celebs/shared-ui/components/page-header';

interface ManageProductHeaderProps {
  showHelp: boolean;
  onDismissHelp: () => void;
}

export const ManageProductHeader: React.FC<ManageProductHeaderProps> = ({
  showHelp,
  onDismissHelp,
}) => {
  return (
    <>
      <PageHeader
        title="Manage Products"
        description="Manage your product inventory and track performance"
        actions={
          <Button asChild>
            <Link to="/products/new">+ New Product</Link>
          </Button>
        }
      />

      {showHelp && (
        <Alert className="border-info/30 bg-info/10">
          <Info className="h-4 w-4 text-info" />
          <AlertDescription className="text-info flex items-center justify-between">
            <div>
              <span className="font-medium">Welcome to Product Management.</span> Sellers can view
              status and submit drafts for review. Admins can approve items.
            </div>
            <Button variant="ghost" size="sm" onClick={onDismissHelp} className="ml-4">
              <X className="h-4 w-4" />
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </>
  );
};
