import React from 'react';
import { Truck } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@celebs/shared-ui/components/card';

import { PRODUCT_SECTION_ANCHORS } from '../utils/add-product-validation';

import { ShippingDimensionsCard } from './shipping-dimensions-card';
import { WarrantyPolicyCard } from './warranty-policy-card';

/**
 * THE SHIPPING SECTION — and the owner of `PRODUCT_SECTION_ANCHORS.shipping`.
 *
 * Ownership decision (duplicate `id="product-section-package"`): this card wins,
 * because it is rendered UNCONDITIONALLY alongside the sidebar, while the
 * schema-driven `packageFields` block in `dynamic-product-form.tsx` only
 * renders for a category that declares attributes in the `package` group. The
 * sidebar's "Shipping & Warranty" jump resolves through `getElementById`, so
 * an anchor on a conditionally-rendered card dangles for every other category —
 * and while both cards carry the id, the jump lands on whichever comes first in
 * the DOM and the other card is unreachable.
 *
 * Because this card is always present, the anchor here can never dangle, and
 * `ShippingDimensionsCard` is the single owner of the four parcel paths
 * (`packageWeightKg`, `packageLengthCm`, `packageWidthCm`, `packageHeightCm`).
 *
 * ACTION REQUIRED OUTSIDE THIS FILE'S LANE: `dynamic-product-form.tsx:284`
 * renders a second `id="product-section-package"` for its schema-driven
 * `packageFields` block. It must drop the id (keeping the block as plain
 * content) so the anchor resolves here, once. A category attribute that
 * duplicates one of the four parcel paths would also render a second input for
 * the same RHF field, which needs the same owner-side filter.
 */
export const ShippingWarrantySection: React.FC = () => {
  return (
    <Card
      id={PRODUCT_SECTION_ANCHORS.shipping}
      className="scroll-mt-24 rounded-3xl border-border bg-card"
    >
      <CardHeader className="border-b border-border/60 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold text-foreground">
              Shipping, Logistics & Warranty
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Parcel dimensions for Pathao courier billing, special cargo handling, and customer
              warranty protection.
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pt-6">
        <ShippingDimensionsCard />
        <WarrantyPolicyCard />
      </CardContent>
    </Card>
  );
};
