import React from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import { SHIPPING_DEFAULTS } from '@celebs/shared-types';

import { PolicyFlagsGrid } from './warranty-policy-flags-grid';
import { WarrantyPeriodFields, WarrantyPolicySelects } from './warranty-policy-sections';

export const WarrantyPolicyCard: React.FC = () => {
  const { control, setValue } = useFormContext();

  const packagingType =
    useWatch({ control, name: 'packagingType' }) || SHIPPING_DEFAULTS.packagingType;
  const warrantyType =
    useWatch({ control, name: 'warrantyType' }) || SHIPPING_DEFAULTS.warrantyType;
  const isFragile = Boolean(useWatch({ control, name: 'isFragile' }));
  const hasBatteryOrLiquid = Boolean(useWatch({ control, name: 'hasBatteryOrLiquid' }));
  const isNonReturnable = Boolean(useWatch({ control, name: 'isNonReturnable' }));

  return (
    <div className="space-y-5">
      <WarrantyPolicySelects
        packagingType={packagingType}
        warrantyType={warrantyType}
        onPackagingChange={(val) => setValue('packagingType', val, { shouldDirty: true })}
        onWarrantyChange={(val) => setValue('warrantyType', val, { shouldDirty: true })}
      />

      <WarrantyPeriodFields warrantyType={warrantyType} />

      <PolicyFlagsGrid
        isFragile={isFragile}
        hasBatteryOrLiquid={hasBatteryOrLiquid}
        isNonReturnable={isNonReturnable}
        onFragileChange={(val) => setValue('isFragile', val, { shouldDirty: true })}
        onBatteryChange={(val) => setValue('hasBatteryOrLiquid', val, { shouldDirty: true })}
        onNonReturnableChange={(val) => setValue('isNonReturnable', val, { shouldDirty: true })}
      />
    </div>
  );
};
