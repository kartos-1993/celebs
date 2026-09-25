import React from 'react';
import { Check, Sparkles } from 'lucide-react';

import { Button } from '@celebs/shared-ui/components/button';

import type { UiProps } from '../ui-registry';

import { SkuBatchEditBar } from './sku-batch-edit-bar';
import { SkuDefaultTable } from './sku-default-table';
import { SkuMatrixTable } from './sku-matrix-table';
import { SkuSingleAxisTable } from './sku-single-axis-table';
import type { VariantDataSource } from './sku-table-types';
import { useSkuTable } from './use-sku-table';

export function SkuTableInputField({ field }: UiProps) {
  const ds = field.dataSource as VariantDataSource | undefined;
  const {
    variants,
    labelOf,
    applyAll,
    setApplyAll,
    applyScope,
    setApplyScope,
    scopeOptions,
    applyToAll,
    handleAutoGenerateSkus,
    skuButtonState,
    isSkuLocked,
  } = useSkuTable(ds);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">{field.label}</div>
          <div className="text-sm text-muted-foreground">
            {variants.length
              ? `SKU Matrix generated from: ${variants.map((a) => a.label).join(' × ')}`
              : 'No variants selected. Using default SKU.'}
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          data-testid="sku-auto-generate-btn"
          disabled={skuButtonState.isDisabled}
          className="gap-1.5 text-xs h-8"
          title={skuButtonState.tooltip}
          onClick={handleAutoGenerateSkus}
        >
          {skuButtonState.icon === 'check' ? (
            <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <Sparkles className="h-3.5 w-3.5 text-warning" />
          )}
          {skuButtonState.label}
        </Button>
      </div>

      {variants.length === 0 && <SkuDefaultTable isSkuLocked={isSkuLocked} />}

      {variants.length > 0 && (
        <SkuBatchEditBar
          applyScope={applyScope}
          setApplyScope={setApplyScope}
          scopeOptions={scopeOptions}
          applyAll={applyAll}
          setApplyAll={setApplyAll}
          onApply={applyToAll}
        />
      )}

      {variants.length === 1 && (
        <SkuSingleAxisTable variant={variants[0]} labelOf={labelOf} isSkuLocked={isSkuLocked} />
      )}

      {variants.length >= 2 && (
        <SkuMatrixTable
          primaryVariant={variants[0]}
          secondaryVariant={variants[1]}
          labelOf={labelOf}
          isSkuLocked={isSkuLocked}
        />
      )}
    </div>
  );
}
