import React from 'react';
import { AlertCircle, Flame, ShieldCheck } from 'lucide-react';

import { PolicyFeatureCheckbox } from './policy-feature-checkbox';

interface PolicyFlagsGridProps {
  isFragile: boolean;
  hasBatteryOrLiquid: boolean;
  isNonReturnable: boolean;
  onFragileChange: (checked: boolean) => void;
  onBatteryChange: (checked: boolean) => void;
  onNonReturnableChange: (checked: boolean) => void;
}

export const PolicyFlagsGrid: React.FC<PolicyFlagsGridProps> = ({
  isFragile,
  hasBatteryOrLiquid,
  isNonReturnable,
  onFragileChange,
  onBatteryChange,
  onNonReturnableChange,
}) => {
  return (
    <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-3">
      <PolicyFeatureCheckbox
        id="isFragile"
        checked={isFragile}
        onCheckedChange={onFragileChange}
        icon={AlertCircle}
        iconColorClass="text-amber-500"
        label="Fragile Handling"
      />
      <PolicyFeatureCheckbox
        id="hasBatteryOrLiquid"
        checked={hasBatteryOrLiquid}
        onCheckedChange={onBatteryChange}
        icon={Flame}
        iconColorClass="text-rose-500"
        label="Dangerous Goods (Battery / Liquid)"
      />
      <PolicyFeatureCheckbox
        id="isNonReturnable"
        checked={isNonReturnable}
        onCheckedChange={onNonReturnableChange}
        icon={ShieldCheck}
        iconColorClass="text-primary"
        label="Non-Returnable (Hygiene Guard)"
      />
    </div>
  );
};
