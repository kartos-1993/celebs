import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Flame, Plus } from 'lucide-react';

import type { CampaignItemType } from '@celebs/shared-types';
import { Button } from '@celebs/shared-ui/components/button';
import { PageHeader } from '@celebs/shared-ui/components/page-header';

import { getCampaigns } from '../api';
import { MARKETING_QUERY_KEYS } from '../api';
import { CampaignCards } from '../components/campaign-cards';
import { CampaignTable } from '../components/campaign-table';

import { FilterBar, FilterSearch } from '@/components/filter-bar';

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
      <FilterBar>
        <FilterSearch
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search campaigns (e.g. Dashain, Tihar)..."
        />
      </FilterBar>

      {/* Campaigns Table (desktop) + Cards (mobile) */}
      <CampaignTable campaigns={filteredCampaigns} isLoading={isLoading} />
      <CampaignCards campaigns={filteredCampaigns} isLoading={isLoading} />
    </div>
  );
}
