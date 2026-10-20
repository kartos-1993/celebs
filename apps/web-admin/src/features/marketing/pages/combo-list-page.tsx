import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, FileText, Layers, Plus, Sparkles } from 'lucide-react';

import type { ComboBundleType } from '@celebs/shared-types';
import { Button } from '@celebs/shared-ui/components/button';
import { PageHeader } from '@celebs/shared-ui/components/page-header';

import { getCombos } from '../api';
import { MARKETING_QUERY_KEYS } from '../api';
import { ComboCards } from '../components/combo-cards';
import { ComboTable } from '../components/combo-table';

import { FilterBar, FilterSearch } from '@/components/filter-bar';

export default function ComboListPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: response, isLoading } = useQuery({
    queryKey: MARKETING_QUERY_KEYS.combos(),
    queryFn: getCombos,
  });

  const combos: ComboBundleType[] = (response?.data || []).map((c: ComboBundleType) => ({
    id: c.id,
    title: c.title,
    slug: c.slug,
    subtitle: c.subtitle,
    discountType: c.discountType,
    discountValue: Number(c.discountValue),
    isActive: c.isActive ?? true,
    bannerImage: c.bannerImage,
    itemCount: c.items?.length || 0,
    createdAt: c.createdAt,
  }));

  const filteredCombos = combos.filter(
    (c) =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.slug.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={
          <>
            <Sparkles className="mr-2 inline h-6 w-6" />
            Generic Combo Bundles
          </>
        }
        description="Create high-AOV travel packs, festive bundles, and multi-product collections with instant savings badges."
        actions={
          <Button asChild>
            <Link to="/marketing/combos/new">
              <Plus className="w-4 h-4" />
              Create New Combo
            </Link>
          </Button>
        }
      />

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-card rounded-xl border border-border shadow-sm flex items-center gap-3">
          <div className="p-3 bg-info/10 text-info rounded-lg">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-muted-foreground">Total Bundles</div>
            <div className="text-xl font-semibold tracking-tight text-foreground">
              {combos.length} Bundles
            </div>
          </div>
        </div>

        <div className="p-4 bg-card rounded-xl border border-border shadow-sm flex items-center gap-3">
          <div className="p-3 bg-success/10 text-success rounded-lg">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-muted-foreground">Active Bundles</div>
            <div className="text-xl font-semibold tracking-tight text-foreground">
              {combos.filter((c) => c.isActive).length} Bundles
            </div>
          </div>
        </div>

        <div className="p-4 bg-card rounded-xl border border-border shadow-sm flex items-center gap-3">
          <div className="p-3 bg-warning/10 text-warning rounded-lg">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-muted-foreground">Draft Bundles</div>
            <div className="text-xl font-semibold tracking-tight text-foreground">
              {combos.filter((c) => !c.isActive).length} Bundles
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <FilterBar>
        <FilterSearch
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by bundle title or slug..."
        />
      </FilterBar>

      {/* Combos Table (desktop) + Cards (mobile) */}
      <ComboTable combos={filteredCombos} isLoading={isLoading} />
      <ComboCards combos={filteredCombos} isLoading={isLoading} />
    </div>
  );
}
