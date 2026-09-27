import React from 'react';
import { useFormContext } from 'react-hook-form';

import { Input } from '@celebs/shared-ui/components/input';
import { Label } from '@celebs/shared-ui/components/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@celebs/shared-ui/components/select';
import { Textarea } from '@celebs/shared-ui/components/textarea';

import { PACKAGING_OPTIONS, WARRANTY_OPTIONS } from './warranty-policy-options';

interface WarrantyPolicySelectsProps {
  packagingType: string;
  warrantyType: string;
  onPackagingChange: (value: string) => void;
  onWarrantyChange: (value: string) => void;
}

export const WarrantyPolicySelects: React.FC<WarrantyPolicySelectsProps> = ({
  packagingType,
  warrantyType,
  onPackagingChange,
  onWarrantyChange,
}) => {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="packagingType" className="text-xs">
          Standard Packaging Format
        </Label>
        <Select value={packagingType} onValueChange={onPackagingChange}>
          <SelectTrigger id="packagingType" className="h-10 text-xs">
            <SelectValue placeholder="Select packaging format" />
          </SelectTrigger>
          <SelectContent>
            {PACKAGING_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="warrantyType" className="text-xs">
          Warranty Guarantee
        </Label>
        <Select value={warrantyType} onValueChange={onWarrantyChange}>
          <SelectTrigger id="warrantyType" className="h-10 text-xs">
            <SelectValue placeholder="Select warranty type" />
          </SelectTrigger>
          <SelectContent>
            {WARRANTY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

interface WarrantyPeriodFieldsProps {
  warrantyType: string;
}

export const WarrantyPeriodFields: React.FC<WarrantyPeriodFieldsProps> = ({ warrantyType }) => {
  const {
    register,
    formState: { errors },
  } = useFormContext();

  if (warrantyType === 'NO_WARRANTY') return null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="warrantyPeriod" className="text-xs">
          Warranty Duration <span className="text-destructive">*</span>
        </Label>
        <Input
          id="warrantyPeriod"
          placeholder="e.g. 6 Months, 1 Year"
          {...register('warrantyPeriod')}
        />
        {errors.warrantyPeriod?.message && (
          <p className="text-xs text-destructive">{String(errors.warrantyPeriod.message)}</p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="warrantyPolicy" className="text-xs">
          Warranty Policy Terms
        </Label>
        <Textarea
          id="warrantyPolicy"
          rows={2}
          placeholder="Covers hardware/manufacturing defects only"
          {...register('warrantyPolicy')}
        />
      </div>
    </div>
  );
};
