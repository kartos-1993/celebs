import { Link } from 'react-router-dom';
import { Calendar } from 'lucide-react';

import type { CampaignItemType } from '@celebs/shared-types';
import { Badge } from '@celebs/shared-ui/components/badge';
import { Button } from '@celebs/shared-ui/components/button';
import { EmptyState } from '@celebs/shared-ui/components/empty-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@celebs/shared-ui/components/table';

interface CampaignTableProps {
  campaigns: CampaignItemType[];
  isLoading: boolean;
}

/** Desktop campaigns table — hidden below md, paired with CampaignCards. */
export function CampaignTable({ campaigns, isLoading }: CampaignTableProps) {
  return (
    <div className="hidden overflow-x-auto rounded-xl border bg-card shadow-sm md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Campaign Details</TableHead>
            <TableHead>Type &amp; Theme</TableHead>
            <TableHead>Date Range</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={5}>
                <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                  Loading marketing campaigns...
                </div>
              </TableCell>
            </TableRow>
          ) : campaigns.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5}>
                <EmptyState
                  title="No campaigns found"
                  description="No marketing campaigns match your query."
                />
              </TableCell>
            </TableRow>
          ) : (
            campaigns.map((camp) => (
              <TableRow key={camp.id} className="transition-colors hover:bg-muted/50">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div
                      aria-hidden="true"
                      className="h-10 w-4 shrink-0 rounded-full"
                      style={{ backgroundColor: camp.themeColor }}
                    />
                    <div>
                      <div className="text-sm font-medium text-foreground">{camp.title}</div>
                      <div className="text-xs text-muted-foreground">{camp.tagline}</div>
                      <div className="font-mono text-xs text-muted-foreground">
                        /{camp.slug} ({camp.productCount} products)
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="destructive">{camp.campaignType}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-xs font-medium text-foreground">
                    <Calendar aria-hidden="true" className="h-3.5 w-3.5 text-muted-foreground" />
                    {new Date(camp.startDate).toLocaleDateString()} —{' '}
                    {new Date(camp.endDate).toLocaleDateString()}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={camp.isActive ? 'success' : 'secondary'}>
                    {camp.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/marketing/campaigns/${camp.id}`}>Edit</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
