import React from 'react';
import { Truck } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@celebs/shared-ui/components/card';

import { PRODUCT_SECTION_ANCHORS } from '../utils/add-product-validation';

import { ShippingDimensionsCard } from './shipping-dimensions-card';
import { WarrantyPolicyCard } from './warranty-policy-card';

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
