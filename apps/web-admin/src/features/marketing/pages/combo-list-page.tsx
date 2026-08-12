import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getCombos } from '../api';
import { MARKETING_QUERY_KEYS } from '../hooks/use-marketing-queries';
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
import { Plus, Search, Tag, Sparkles, Plane, Percent, DollarSign } from 'lucide-react';
import type { ComboBundleType } from '@celebs/shared-types';

export function ComboListPage() {
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
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-indigo-600" />
            Generic Combo Bundles
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Create high-AOV travel packs, festive bundles, and multi-product collections with
            instant savings badges.
          </p>
        </div>
        <Button
          asChild
          className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2"
        >
          <Link to="/marketing/combos/new">
            <Plus className="w-4 h-4" />
            Create New Combo
          </Link>
        </Button>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
            <Plane className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">Active Travel Packs</div>
            <div className="text-xl font-bold text-slate-900">
              {combos.filter((c) => c.tag === 'abroad-travel').length} Bundles
            </div>
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-lg">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">Festive Combos</div>
            <div className="text-xl font-bold text-slate-900">
              {combos.filter((c) => c.tag === 'festive').length} Bundles
            </div>
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500">Average Savings</div>
            <div className="text-xl font-bold text-slate-900">18.5% Off</div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
        <Input
          placeholder="Search by bundle title or tag (e.g. abroad-travel, festive)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="border-none shadow-none text-xs focus-visible:ring-0 focus-visible:ring-offset-0 h-8"
        />
      </div>

      {/* Combos Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="text-xs font-semibold">Combo Details</TableHead>
              <TableHead className="text-xs font-semibold">Category / Tag</TableHead>
              <TableHead className="text-xs font-semibold">Discount Offer</TableHead>
              <TableHead className="text-xs font-semibold">Status</TableHead>
              <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-xs text-slate-500">
                  Loading combo bundles...
                </TableCell>
              </TableRow>
            ) : filteredCombos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-xs text-slate-500">
                  No combo bundles found matching your query.
                </TableCell>
              </TableRow>
            ) : (
              filteredCombos.map((combo) => (
                <TableRow key={combo.id} className="hover:bg-slate-50/70 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {combo.bannerImage ? (
                        <img
                          src={combo.bannerImage}
                          alt={combo.title}
                          className="w-12 h-12 object-cover rounded-lg border border-slate-200"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                          <Sparkles className="w-5 h-5" />
                        </div>
                      )}
                      <div>
                        <div className="text-xs font-bold text-slate-900">{combo.title}</div>
                        <div className="text-[11px] text-slate-500">{combo.subtitle}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                          /{combo.slug} ({combo.itemCount} items)
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {combo.tag === 'abroad-travel' && (
                        <Plane className="w-3 h-3 text-indigo-600" />
                      )}
                      {combo.tag === 'festive' && <Sparkles className="w-3 h-3 text-amber-500" />}
                      {combo.tag || 'general'}
                    </span>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-1 text-xs font-bold text-emerald-600">
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
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        combo.isActive
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {combo.isActive ? 'ACTIVE' : 'DRAFT'}
                    </span>
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
