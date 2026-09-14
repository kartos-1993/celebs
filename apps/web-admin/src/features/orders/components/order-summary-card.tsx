import type { OrderItemUI } from '../types';

export function OrderSummaryCard({ item }: { item: OrderItemUI }) {
  return (
    <div className="space-y-1 rounded-lg border border-border bg-muted/50 p-3">
      <div className="text-sm font-semibold text-foreground">{item.productName}</div>
      <div className="text-sm text-muted-foreground">
        Variant: <span className="font-medium text-foreground">{item.colorVariantName}</span> |
        Size: <span className="font-medium text-foreground">{item.size}</span> | Qty:{' '}
        {item.quantity}
      </div>
      <div className="text-xs text-muted-foreground">
        Shipping to: {item.customerName} ({item.cityArea}, {item.provinceDistrict})
      </div>
    </div>
  );
}
