import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Flame,Plus, Search } from 'lucide-react';

import type { CampaignItemType } from '@celebs/shared-types';
import { Badge } from '@celebs/shared-ui/components/badge';
import { Button } from '@celebs/shared-ui/components/button';
import { Input } from '@celebs/shared-ui/components/input';
import { PageHeader } from '@celebs/shared-ui/components/page-header';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@celebs/shared-ui/components/table';

import { getCampaigns } from '../api';
import { MARKETING_QUERY_KEYS } from '../api';

export default function CampaignListPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: response, isLoading } = useQuery({
    queryKey: MARKETING_QUERY_KEYS.campaigns(),
    queryFn: getCampaigns,
  });

  const campaigns: CampaignItemType[] = (response?.data || []).map((c: CampaignItemType) => ({
    id: c.id,
    title: c.title,
    slug: c.slug,
    campaignType: c.campaignType,
    tagline: c.tagline,
    themeColor: c.themeColor || '#D92525',
    startDate: c.startDate,
    endDate: c.endDate,
    isActive: c.isActive ?? true,
    productCount: c.products?.length || 0,
  }));

  const filteredCampaigns = campaigns.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={
          <>
            <Flame className="mr-2 inline h-6 w-6" />
            Festival & Marketing Campaigns
          </>
        }
        description="Schedule Dashain, Tihar, and seasonal sales with custom countdown timers and hero themes."
        actions={
          <Button asChild>
            <Link to="/marketing/campaigns/new">
              <Plus className="w-4 h-4" />
              Create Campaign
            </Link>
          </Button>
        }
      />

      {/* Filter & Search Bar */}
      <div className="flex items-center gap-3 bg-card p-3 rounded-xl border border-border shadow-sm">
        <Search className="w-4 h-4 text-muted-foreground shrink-0 ml-1" />
        <Input
          placeholder="Search campaigns (e.g. Dashain, Tihar)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="border-none shadow-none text-xs focus-visible:ring-0 focus-visible:ring-offset-0 h-8"
        />
      </div>

      {/* Campaigns Table */}
      <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Campaign Details</TableHead>
              <TableHead>Type & Theme</TableHead>
              <TableHead>Date Range</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-sm text-muted-foreground">
                  Loading marketing campaigns...
                </TableCell>
              </TableRow>
            ) : filteredCampaigns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-sm text-muted-foreground">
                  No marketing campaigns found matching your query.
                </TableCell>
              </TableRow>
            ) : (
              filteredCampaigns.map((camp) => (
                <TableRow key={camp.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-10 rounded-full shrink-0"
                        style={{ backgroundColor: camp.themeColor }}
                      />
                      <div>
                        <div className="text-sm font-medium text-foreground">{camp.title}</div>
                        <div className="text-xs text-muted-foreground">{camp.tagline}</div>
                        <div className="text-xs font-mono text-muted-foreground">
                          /{camp.slug} ({camp.productCount} products)
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge variant="destructive">{camp.campaignType}</Badge>
                  </TableCell>

                  <TableCell>
                    <div className="text-xs text-foreground font-medium flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
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
                    <Button asChild variant="outline" size="sm" className="text-xs h-7 gap-1">
                      <Link to={`/marketing/campaigns/${camp.id}`}>Edit</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
