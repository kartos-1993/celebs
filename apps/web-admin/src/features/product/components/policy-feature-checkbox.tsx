import React from 'react';
import type { LucideIcon } from 'lucide-react';

import { Checkbox } from '@celebs/shared-ui/components/checkbox';
import { Label } from '@celebs/shared-ui/components/label';

interface PolicyFeatureCheckboxProps {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  icon: LucideIcon;
  iconColorClass: string;
  label: string;
}

export const PolicyFeatureCheckbox: React.FC<PolicyFeatureCheckboxProps> = ({
  id,
  checked,
  onCheckedChange,
  icon: Icon,
  iconColorClass,
  label,
}) => {
  return (
    <div className="flex items-center space-x-2 rounded-xl border border-border/70 p-3 bg-muted/20">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(val) => onCheckedChange(Boolean(val))}
      />
      <Label htmlFor={id} className="cursor-pointer text-xs font-medium flex items-center gap-1.5">
        <Icon className={`h-3.5 w-3.5 ${iconColorClass}`} /> {label}
      </Label>
    </div>
  );
};
