import React, { memo, useCallback, useMemo } from 'react';
import { Badge } from '@celebs/shared-ui/components/badge';
import { Label } from '@celebs/shared-ui/components/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@celebs/shared-ui/components/select';
import { AlertCircle, CheckCircle2, ShieldAlert, Sparkles } from 'lucide-react';
import { useBrands, useMyBrandAuthorizations } from '../hooks/use-brands';

interface BrandSelectorProps {
  value?: string | null;
  onChange: (brandId: string | null, brandName?: string) => void;
  disabled?: boolean;
}

export const BrandSelector = memo(function BrandSelector({
  value,
  onChange,
  disabled,
}: BrandSelectorProps) {
  const { data: brandsData, isLoading: isLoadingBrands } = useBrands({ limit: 100 });
  const { data: myAuths = [] } = useMyBrandAuthorizations();

  const brands = useMemo(() => brandsData?.items || [], [brandsData]);

  const authorizedBrandIds = useMemo(() => {
    const set = new Set<string>();
    for (const auth of myAuths) {
      if (auth.status === 'APPROVED') {
        set.add(auth.brandId);
      }
    }
    return set;
  }, [myAuths]);

  const selectedBrand = useMemo(() => {
    return brands.find((b) => b.id === value || b.name === value);
  }, [brands, value]);

  const isGatedAndUnauthorized = useMemo(() => {
    if (!selectedBrand) return false;
    if (selectedBrand.tier === 'OPEN_GENERIC') return false;
    if (selectedBrand.tier === 'FIRST_PARTY') return false; // Handled by platform
    return selectedBrand.isGated && !authorizedBrandIds.has(selectedBrand.id);
  }, [selectedBrand, authorizedBrandIds]);

  const handleSelect = useCallback(
    (selectedId: string) => {
      if (selectedId === '__NONE__') {
        onChange(null, undefined);
        return;
      }
      const matched = brands.find((b) => b.id === selectedId);
      if (matched) {
        onChange(matched.id, matched.name);
      }
    },
    [brands, onChange],
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold text-foreground">Brand Association</Label>
        {selectedBrand && selectedBrand.tier === 'FIRST_PARTY' && (
          <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">
            <Sparkles className="mr-1 h-3 w-3" />
            1P Private Label
          </Badge>
        )}
      </div>

      <Select
        value={selectedBrand ? selectedBrand.id : '__NONE__'}
        onValueChange={handleSelect}
        disabled={disabled || isLoadingBrands}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={isLoadingBrands ? 'Loading brands...' : 'Select Brand'} />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          <SelectItem value="__NONE__">
            <span className="text-muted-foreground">Generic / Unbranded</span>
          </SelectItem>
          {brands.map((b) => {
            const isAuthorized =
              b.tier === 'OPEN_GENERIC' ||
              b.tier === 'FIRST_PARTY' ||
              authorizedBrandIds.has(b.id);

            return (
              <SelectItem key={b.id} value={b.id}>
                <div className="flex items-center justify-between gap-3 w-full">
                  <span className="font-medium text-foreground">{b.name}</span>
                  <div className="flex items-center gap-1.5">
                    {b.tier === 'FIRST_PARTY' ? (
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary">
                        Celebs In-House
                      </span>
                    ) : b.isGated ? (
                      isAuthorized ? (
                        <span className="flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-2.5 w-2.5" /> Authorized
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-amber-600 dark:text-amber-400">
                          <ShieldAlert className="h-2.5 w-2.5" /> LOA Required
                        </span>
                      )
                    ) : (
                      <span className="text-[9px] text-muted-foreground">Open</span>
                    )}
                  </div>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      {isGatedAndUnauthorized && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <span className="font-semibold">Brand Authorization Required: </span>
            <span>
              &apos;{selectedBrand?.name}&apos; is a gated trademark. Listing products under this
              brand requires an approved Letter of Authorization (LOA).
            </span>
          </div>
        </div>
      )}
    </div>
  );
});
