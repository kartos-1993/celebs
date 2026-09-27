import React from 'react';

import { Label } from '@celebs/shared-ui/components/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@celebs/shared-ui/components/select';

import type { BarcodePrintItem } from './barcode-print-modal';

interface BarcodeVariantSelectProps {
  items: BarcodePrintItem[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
}

export const BarcodeVariantSelect: React.FC<BarcodeVariantSelectProps> = ({
  items,
  selectedIndex,
  onSelectIndex,
}) => {
  if (items.length <= 1) return null;

  return (
    <div className="space-y-1.5 col-span-2">
      <Label className="text-xs">Select Variant</Label>
      <Select value={String(selectedIndex)} onValueChange={(val) => onSelectIndex(Number(val))}>
        <SelectTrigger aria-label="Select variant to print" className="h-9 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((item, idx) => (
            <SelectItem key={item.sku} value={String(idx)} className="text-xs">
              {item.variantLabel || 'Standard'} — {item.sku}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
