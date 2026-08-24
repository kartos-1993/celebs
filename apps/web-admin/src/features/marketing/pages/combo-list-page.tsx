import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DollarSign,Percent, Plane, Plus, Sparkles, Tag } from 'lucide-react';

import type { ComboBundleType } from '@celebs/shared-types';
import { Badge } from '@celebs/shared-ui/components/badge';
import { Button } from '@celebs/shared-ui/components/button';
import { PageHeader } from '@celebs/shared-ui/components/page-header';

import { FilterBar, FilterSearch } from '@/components/filter-bar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@celebs/shared-ui/components/table';

import { getCombos } from '../api';
import { MARKETING_QUERY_KEYS } from '../api';

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
            <div className="text-xl font-bold text-foreground">
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
            <div className="text-xl font-bold text-foreground">
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
            <div className="text-xl font-bold text-foreground">18.5% Off</div>
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

      {/* Combos Table */}
      <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Combo Details</TableHead>
              <TableHead>Category / Tag</TableHead>
              <TableHead>Discount Offer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-sm text-muted-foreground">
                  Loading combo bundles...
                </TableCell>
              </TableRow>
            ) : filteredCombos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-sm text-muted-foreground">
                  No combo bundles found matching your query.
                </TableCell>
              </TableRow>
            ) : (
              filteredCombos.map((combo) => (
                <TableRow key={combo.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {combo.bannerImage ? (
                        <img
                          src={combo.bannerImage}
                          alt={combo.title}
                          className="w-12 h-12 object-cover rounded-lg border border-border"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
                          <Sparkles className="w-5 h-5" />
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-medium text-foreground">{combo.title}</div>
                        <div className="text-xs text-muted-foreground">{combo.subtitle}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 font-mono">
                          /{combo.slug} ({combo.itemCount} items)
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge variant="secondary">
                      {combo.tag === 'abroad-travel' && (
                        <Plane className="w-3 h-3 mr-1 text-info" />
                      )}
                      {combo.tag === 'festive' && <Sparkles className="w-3 h-3 mr-1 text-warning" />}
                      {combo.tag || 'general'}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-1 text-xs font-bold text-success">
                      {combo.discountType === 'PERCENTAGE' ? (
                        <>
                          <Percent className="w-3.5 h-3.5" />
                          {combo.discountValue}% OFF Total
                        </>
                      ) : (
                        <>
                          <DollarSign className="w-3.5 h-3.5" />
                          Save NPR {combo.discountValue.toLocaleString()}
                        </>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge variant={combo.isActive ? 'success' : 'secondary'}>
                      {combo.isActive ? 'ACTIVE' : 'DRAFT'}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-right">
                    <Button asChild variant="outline" size="sm" className="text-xs h-7 gap-1">
                      <Link to={`/marketing/combos/${combo.id}`}>Edit</Link>
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
