import { Link } from 'react-router-dom';
import { Calendar } from 'lucide-react';

import type { CampaignItemType } from '@celebs/shared-types';
import { Badge } from '@celebs/shared-ui/components/badge';
import { Button } from '@celebs/shared-ui/components/button';
import { Card } from '@celebs/shared-ui/components/card';
import { EmptyState } from '@celebs/shared-ui/components/empty-state';

/** Mobile campaigns list — cards below md, paired with CampaignTable. */
export function CampaignCards({
  campaigns,
  isLoading,
}: {
  campaigns: CampaignItemType[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center rounded-xl border bg-card text-sm text-muted-foreground md:hidden">
        Loading marketing campaigns...
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="md:hidden">
        <EmptyState
          title="No campaigns found"
          description="No marketing campaigns match your query."
        />
      </div>
    );
  }

  return (
    <div className="space-y-3 md:hidden">
      {campaigns.map((camp) => (
        <Card key={camp.id} className="space-y-3 p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div
              aria-hidden="true"
              className="h-10 w-4 shrink-0 rounded-full"
              style={{ backgroundColor: camp.themeColor }}
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-foreground">{camp.title}</div>
              <div className="truncate text-xs text-muted-foreground">{camp.tagline}</div>
              <div className="truncate font-mono text-xs text-muted-foreground">
                /{camp.slug} ({camp.productCount} products)
              </div>
            </div>
            <Badge variant={camp.isActive ? 'success' : 'secondary'} className="shrink-0">
              {camp.isActive ? 'ACTIVE' : 'INACTIVE'}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="destructive">{camp.campaignType}</Badge>
            <span className="flex items-center gap-1 text-xs font-medium text-foreground">
              <Calendar aria-hidden="true" className="h-3.5 w-3.5 text-muted-foreground" />
              {new Date(camp.startDate).toLocaleDateString()} —{' '}
              {new Date(camp.endDate).toLocaleDateString()}
            </span>
          </div>

          <Button asChild variant="outline" className="h-10 w-full">
            <Link to={`/marketing/campaigns/${camp.id}`}>Edit</Link>
          </Button>
        </Card>
      ))}
    </div>
  );
}
