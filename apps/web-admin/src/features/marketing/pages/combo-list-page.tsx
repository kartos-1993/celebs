import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plane, Plus, Sparkles, Tag } from 'lucide-react';

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
    tag: c.tag,
    bannerImage: c.bannerImage,
    itemCount: c.items?.length || 0,
    createdAt: c.createdAt,
  }));

  const filteredCombos = combos.filter(
    (c) =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.tag?.toLowerCase().includes(searchQuery.toLowerCase()),
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
            <Plane className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-muted-foreground">Active Travel Packs</div>
            <div className="text-xl font-semibold tracking-tight text-foreground">
              {combos.filter((c) => c.tag === 'abroad-travel').length} Bundles
            </div>
          </div>
        </div>

        <div className="p-4 bg-card rounded-xl border border-border shadow-sm flex items-center gap-3">
          <div className="p-3 bg-destructive/10 text-destructive rounded-lg">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-muted-foreground">Festive Combos</div>
            <div className="text-xl font-semibold tracking-tight text-foreground">
              {combos.filter((c) => c.tag === 'festive').length} Bundles
            </div>
          </div>
        </div>

        <div className="p-4 bg-card rounded-xl border border-border shadow-sm flex items-center gap-3">
          <div className="p-3 bg-success/10 text-success rounded-lg">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-muted-foreground">Average Savings</div>
            <div className="text-xl font-semibold tracking-tight text-foreground">18.5% Off</div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <FilterBar>
        <FilterSearch
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by bundle title or tag (e.g. abroad-travel, festive)..."
        />
      </FilterBar>

      {/* Combos Table (desktop) + Cards (mobile) */}
      <ComboTable combos={filteredCombos} isLoading={isLoading} />
      <ComboCards combos={filteredCombos} isLoading={isLoading} />
    </div>
  );
}
