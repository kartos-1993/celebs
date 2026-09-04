import React from 'react';
import { Link } from 'react-router-dom';
import { Download, Plus } from 'lucide-react';

import { Badge } from '@celebs/shared-ui/components/badge';
import { Button } from '@celebs/shared-ui/components/button';
import { PageHeader } from '@celebs/shared-ui/components/page-header';

interface ManageProductHeaderProps {
  total: number;
  canCreate: boolean;
}

export const ManageProductHeader: React.FC<ManageProductHeaderProps> = ({ total, canCreate }) => {
  return (
    <PageHeader
      title={
        <span className="flex items-center gap-2">
          Products
          <Badge variant="secondary" className="font-mono tabular-nums">
            {total}
          </Badge>
          <Badge variant="outline">v2 Preview</Badge>
        </span>
      }
      actions={
        <>
          <Button variant="outline" size="sm" disabled title="Export ships after v2 approval">
            <Download className="h-4 w-4" />
            Export
            <Badge variant="secondary" className="ml-1">
              Soon
            </Badge>
          </Button>
          {canCreate && (
            <Button size="sm" asChild>
              <Link to="/products/new">
                <Plus className="h-4 w-4" />
                New Product
              </Link>
            </Button>
          )}
        </>
      }
    />
  );
};
