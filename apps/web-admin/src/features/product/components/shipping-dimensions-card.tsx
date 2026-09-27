import React from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import { SHIPPING_DEFAULTS } from '@celebs/shared-types';
import { Badge } from '@celebs/shared-ui/components/badge';
import { Input } from '@celebs/shared-ui/components/input';
import { Label } from '@celebs/shared-ui/components/label';

// Standard volumetric weight divisor used by domestic courier partners (Pathao / Nepal Post)
const PATHAO_VOLUMETRIC_DIVISOR = 5000;

export const ShippingDimensionsCard: React.FC = () => {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext();

  const length = useWatch({ control, name: 'packageLengthCm' }) || 0;
  const width = useWatch({ control, name: 'packageWidthCm' }) || 0;
  const height = useWatch({ control, name: 'packageHeightCm' }) || 0;
  const actualWeight =
    useWatch({ control, name: 'packageWeightKg' }) || SHIPPING_DEFAULTS.packageWeightKg;

  const volumetricWeight = React.useMemo(() => {
    const l = Number(length) || 0;
    const w = Number(width) || 0;
    const h = Number(height) || 0;
    if (l <= 0 || w <= 0 || h <= 0) return 0;
    return Number(((l * w * h) / PATHAO_VOLUMETRIC_DIVISOR).toFixed(2));
  }, [length, width, height]);

  const billedWeight = Math.max(
    Number(actualWeight) || SHIPPING_DEFAULTS.packageWeightKg,
    volumetricWeight,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
          Package Weight & Dimensions
        </h4>
        <Badge variant="outline" className="text-xs font-mono font-medium">
          Courier Billed Weight: {billedWeight} kg
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="packageWeightKg" className="text-xs">
            Weight (kg) <span className="text-destructive">*</span>
          </Label>
          <Input
            id="packageWeightKg"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.30"
            {...register('packageWeightKg', { valueAsNumber: true })}
          />
          {errors.packageWeightKg?.message && (
            <p className="text-xs text-destructive">{String(errors.packageWeightKg.message)}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="packageLengthCm" className="text-xs">
            Length (cm)
          </Label>
          <Input
            id="packageLengthCm"
            type="number"
            step="0.1"
            placeholder="25"
            {...register('packageLengthCm', { valueAsNumber: true })}
          />
          {errors.packageLengthCm?.message && (
            <p className="text-xs text-destructive">{String(errors.packageLengthCm.message)}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="packageWidthCm" className="text-xs">
            Width (cm)
          </Label>
          <Input
            id="packageWidthCm"
            type="number"
            step="0.1"
            placeholder="20"
            {...register('packageWidthCm', { valueAsNumber: true })}
          />
          {errors.packageWidthCm?.message && (
            <p className="text-xs text-destructive">{String(errors.packageWidthCm.message)}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="packageHeightCm" className="text-xs">
            Height (cm)
          </Label>
          <Input
            id="packageHeightCm"
            type="number"
            step="0.1"
            placeholder="5"
            {...register('packageHeightCm', { valueAsNumber: true })}
          />
          {errors.packageHeightCm?.message && (
            <p className="text-xs text-destructive">{String(errors.packageHeightCm.message)}</p>
          )}
        </div>
      </div>
    </div>
  );
};
