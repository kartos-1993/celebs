import React from 'react';

import { Button } from '@celebs/shared-ui/components/button';
import { Checkbox } from '@celebs/shared-ui/components/checkbox';
import { Input } from '@celebs/shared-ui/components/input';
import { NumberInput } from '@celebs/shared-ui/components/number-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@celebs/shared-ui/components/select';

import type { ApplyAllState, ScopeOption } from './sku-table-types';

interface SkuBatchEditBarProps {
  applyScope: string;
  setApplyScope: (val: string) => void;
  scopeOptions: ScopeOption[];
  applyAll: ApplyAllState;
  setApplyAll: React.Dispatch<React.SetStateAction<ApplyAllState>>;
  onApply: () => void;
}

export function SkuBatchEditBar({
  applyScope,
  setApplyScope,
  scopeOptions,
  applyAll,
  setApplyAll,
  onApply,
}: SkuBatchEditBarProps) {
  return (
    <div className="mb-4 p-3 border rounded-lg bg-muted/50 space-y-3">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Batch Edit Variants
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 items-end">
        <div className="col-span-2 sm:col-span-2 md:col-span-2">
          <div className="text-xs text-muted-foreground mb-1">Select Scope</div>
          <Select value={applyScope} onValueChange={setApplyScope}>
            <SelectTrigger className="bg-background h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {scopeOptions.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-xs">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">
            Price <span className="text-destructive ml-0.5">*</span>
          </div>
          <NumberInput
            className="bg-background h-8 text-xs"
            data-testid="sku-bulk-price-input"
            value={applyAll.price ?? ''}
            onChange={(e) => setApplyAll((p) => ({ ...p, price: e.target.value }))}
            placeholder="0"
          />
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">Spl Price</div>
          <NumberInput
            className="bg-background h-8 text-xs"
            data-testid="sku-bulk-special-price-input"
            value={applyAll.specialPrice ?? ''}
            onChange={(e) => setApplyAll((p) => ({ ...p, specialPrice: e.target.value }))}
            placeholder="0"
          />
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">Stock</div>
          <NumberInput
            className="bg-background h-8 text-xs"
            data-testid="sku-bulk-stock-input"
            value={applyAll.stock ?? ''}
            onChange={(e) => setApplyAll((p) => ({ ...p, stock: e.target.value }))}
            placeholder="0"
          />
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">SellerSKU</div>
          <Input
            className="bg-background font-mono text-xs h-8"
            data-testid="sku-bulk-sku-input"
            value={applyAll.sellerSku ?? ''}
            onChange={(e) => setApplyAll((p) => ({ ...p, sellerSku: e.target.value }))}
            placeholder="SKU"
          />
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">Free</div>
          <NumberInput
            className="bg-background h-8 text-xs"
            value={applyAll.freeItems ?? ''}
            onChange={(e) => setApplyAll((p) => ({ ...p, freeItems: e.target.value }))}
            placeholder="0"
          />
        </div>
      </div>
      <div className="flex items-center justify-between pt-1">
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <Checkbox
            checked={!!applyAll.available}
            onCheckedChange={(v) => setApplyAll((p) => ({ ...p, available: !!v }))}
          />
          <span className="text-xs font-medium">Mark as Available</span>
        </label>
        <Button
          type="button"
          size="sm"
          data-testid="sku-bulk-apply-btn"
          className="h-8 text-xs px-3"
          onClick={onApply}
        >
          Apply to Selected
        </Button>
      </div>
    </div>
  );
}
