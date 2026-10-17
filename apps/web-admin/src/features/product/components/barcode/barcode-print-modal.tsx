import React from 'react';
import { Copy, Printer } from 'lucide-react';

import { Button } from '@celebs/shared-ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@celebs/shared-ui/components/dialog';
import { Input } from '@celebs/shared-ui/components/input';
import { Label } from '@celebs/shared-ui/components/label';

import { BarcodeSticker } from './barcode-sticker';
import { BarcodeVariantSelect } from './barcode-variant-select';
import { ThermalPrintBatch } from './thermal-print-batch';

export interface BarcodePrintItem {
  sku: string;
  productName: string;
  variantLabel?: string;
  price: number;
  storeName?: string;
}

interface BarcodePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: BarcodePrintItem[];
}

export const BarcodePrintModal: React.FC<BarcodePrintModalProps> = ({ isOpen, onClose, items }) => {
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [copies, setCopies] = React.useState(1);

  const activeItem = items[selectedIndex] || items[0];

  const handlePrint = React.useCallback(() => {
    window.print();
  }, []);

  const handleCopySku = React.useCallback(() => {
    if (activeItem?.sku) {
      navigator.clipboard.writeText(activeItem.sku);
    }
  }, [activeItem?.sku]);

  if (!activeItem) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-primary" />
            Thermal Barcode Sticker (50 × 30 mm)
          </DialogTitle>
          <DialogDescription>
            Optimized for retail garment tags and standard 50x30mm thermal roll printers (Xprinter,
            Zebra, TSC).
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center p-6 bg-muted/40 rounded-2xl border border-dashed border-border/80">
          <BarcodeSticker
            storeName={activeItem.storeName}
            productName={activeItem.productName}
            variantLabel={activeItem.variantLabel}
            price={activeItem.price}
            sku={activeItem.sku}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2">
          <BarcodeVariantSelect
            items={items}
            selectedIndex={selectedIndex}
            onSelectIndex={setSelectedIndex}
          />

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="barcodeCopies" className="text-xs">
                Print Copies
              </Label>
              <span className="text-xs text-muted-foreground">Max 50 / run</span>
            </div>
            <Input
              id="barcodeCopies"
              type="number"
              min={1}
              max={50}
              value={copies}
              onChange={(e) => {
                const raw = parseInt(e.target.value, 10);
                setCopies(Number.isNaN(raw) ? 1 : Math.min(50, Math.max(1, raw)));
              }}
              className="h-9 text-xs"
            />
          </div>

          <div className="flex items-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopySku}
              className="w-full h-9 text-xs"
            >
              <Copy className="h-3.5 w-3.5 mr-1.5" />
              Copy SKU
            </Button>
          </div>
        </div>

        <ThermalPrintBatch item={activeItem} copies={copies} />

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Print {copies} {copies === 1 ? 'Label' : 'Labels'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
