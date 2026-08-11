import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getCampaignsQueryFn } from '@/lib/api';
import { Button } from '@celebs/shared-ui/components/button';
import { Input } from '@celebs/shared-ui/components/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@celebs/shared-ui/components/table';
import { Plus, Search, Calendar, Flame } from 'lucide-react';
import type { CampaignItemType } from '@celebs/shared-types';

export function CampaignListPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: response, isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: getCampaignsQueryFn,
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
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Flame className="w-6 h-6 text-rose-600" />
            Festival & Marketing Campaigns
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Schedule Dashain, Tihar, and seasonal sales with custom countdown timers and hero
            themes.
          </p>
        </div>
        <Button
          asChild
          className="bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-2"
        >
          <Link to="/marketing/campaigns/new">
            <Plus className="w-4 h-4" />
            Create Campaign
          </Link>
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
        <Input
          placeholder="Search campaigns (e.g. Dashain, Tihar)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="border-none shadow-none text-xs focus-visible:ring-0 focus-visible:ring-offset-0 h-8"
        />
      </div>

      {/* Campaigns Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="text-xs font-semibold">Campaign Details</TableHead>
              <TableHead className="text-xs font-semibold">Type & Theme</TableHead>
              <TableHead className="text-xs font-semibold">Date Range</TableHead>
              <TableHead className="text-xs font-semibold">Status</TableHead>
              <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-xs text-slate-500">
                  Loading marketing campaigns...
                </TableCell>
              </TableRow>
            ) : filteredCampaigns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-xs text-slate-500">
                  No marketing campaigns found matching your query.
                </TableCell>
              </TableRow>
            ) : (
              filteredCampaigns.map((camp) => (
                <TableRow key={camp.id} className="hover:bg-slate-50/70 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-10 rounded-full shrink-0"
                        style={{ backgroundColor: camp.themeColor }}
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-900">{camp.title}</div>
                        <div className="text-[11px] text-slate-500">{camp.tagline}</div>
                        <div className="text-[10px] font-mono text-slate-400">
                          /{camp.slug} ({camp.productCount} products)
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700">
                      {camp.campaignType}
                    </span>
                  </TableCell>

                  <TableCell>
                    <div className="text-xs text-slate-700 font-medium flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {new Date(camp.startDate).toLocaleDateString()} —{' '}
                      {new Date(camp.endDate).toLocaleDateString()}
                    </div>
                  </TableCell>

                  <TableCell>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        camp.isActive
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {camp.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </span>
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
