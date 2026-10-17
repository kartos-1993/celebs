import React from 'react';

import { BarcodeSticker } from './barcode-sticker';

export interface BarcodeBatchItem {
  storeName?: string;
  productName: string;
  variantLabel?: string;
  price: number;
  sku: string;
}

interface ThermalPrintBatchProps {
  item: BarcodeBatchItem;
  copies: number;
}

export const ThermalPrintBatch: React.FC<ThermalPrintBatchProps> = ({ item, copies }) => {
  const safeCopies = Math.min(50, Math.max(1, Number(copies) || 1));
  const stickers = React.useMemo(() => Array.from({ length: safeCopies }), [safeCopies]);

  return (
    <div className="hidden print:block print:fixed print:inset-0 print:bg-white print:z-9999">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #thermal-print-batch, #thermal-print-batch * { visibility: visible; }
          #thermal-print-batch { position: absolute; left: 0; top: 0; width: 50mm; }
          @page { size: 50mm 30mm; margin: 0; }
        }
      `}</style>
      <div id="thermal-print-batch">
        {stickers.map((_, i) => (
          <div key={i} className="page-break-after-always">
            <BarcodeSticker
              storeName={item.storeName}
              productName={item.productName}
              variantLabel={item.variantLabel}
              price={item.price}
              sku={item.sku}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
