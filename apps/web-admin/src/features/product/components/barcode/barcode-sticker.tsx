import React from 'react';

import { DEFAULT_STORE_NAME } from './barcode-builder';
import { encodeCode128B, generateBarcodeBars } from './barcode-utils';

export interface BarcodeStickerProps {
  storeName?: string;
  productName: string;
  variantLabel?: string;
  price: number;
  sku: string;
}

export const BarcodeSticker: React.FC<BarcodeStickerProps> = React.memo(function BarcodeSticker({
  storeName = DEFAULT_STORE_NAME,
  productName,
  variantLabel,
  price,
  sku,
}) {
  const cleanSku = React.useMemo(() => {
    if (!sku) return 'CLB-ITEM-STD';
    return sku.trim().toUpperCase();
  }, [sku]);

  const pattern = React.useMemo(() => encodeCode128B(cleanSku), [cleanSku]);
  const bars = React.useMemo(() => generateBarcodeBars(pattern), [pattern]);

  // Compute total width in modular units
  const totalUnits = bars.reduce((sum, b) => sum + b.width, 0);

  let currentX = 0;

  return (
    <div className="w-[50mm] h-[30mm] p-[2mm] bg-white text-black font-sans box-border flex flex-col justify-between overflow-hidden border border-border/40 rounded-sm shadow-xs print:border-none print:shadow-none print:p-[1.5mm]">
      {/* Top Header: Store & Location */}
      <div className="flex items-center justify-between border-b border-black/80 pb-0.5">
        <span className="text-[7pt] font-black tracking-wider uppercase truncate">{storeName}</span>
        <span className="text-[6pt] font-semibold tracking-tight text-neutral-600">NEPAL</span>
      </div>

      {/* Product Title (2-line clamp for long real-world retail titles) */}
      <div className="text-[6.5pt] font-bold leading-[1.15] line-clamp-2 mt-0.5 overflow-hidden break-words">
        {productName}
      </div>

      {/* Variant Details & Price */}
      <div className="flex items-center justify-between text-[6.5pt] font-medium leading-none pt-0.5">
        <span className="truncate max-w-[65%] font-semibold">{variantLabel || 'STANDARD'}</span>
        <span className="font-black text-[7pt]">Rs. {price.toLocaleString()}</span>
      </div>

      {/* SVG Barcode */}
      <div className="flex flex-col items-center justify-center mt-0.5">
        <svg
          viewBox={`0 0 ${totalUnits} 32`}
          className="w-full h-[9.5mm] max-h-[38px]"
          preserveAspectRatio="none"
        >
          {bars.map((bar, idx) => {
            const x = currentX;
            currentX += bar.width;
            if (!bar.isBar) return null;
            return <rect key={idx} x={x} y={0} width={bar.width} height={32} fill="black" />;
          })}
        </svg>
        <span className="font-mono text-[6pt] font-bold tracking-widest leading-none mt-0.5">
          {cleanSku}
        </span>
      </div>
    </div>
  );
});
