import React from 'react';
import { Sparkles } from 'lucide-react';

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
          className="gap-1.5 text-xs h-8"
          onClick={handleAutoGenerateSkus}
        >
          <Sparkles className="h-3.5 w-3.5 text-warning" />
          Auto-Generate SKUs
        </Button>
      </div>

      {variants.length === 0 && <SkuDefaultTable />}

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

      {variants.length === 1 && <SkuSingleAxisTable variant={variants[0]} labelOf={labelOf} />}

      {variants.length >= 2 && (
        <SkuMatrixTable
          primaryVariant={variants[0]}
          secondaryVariant={variants[1]}
          labelOf={labelOf}
        />
      )}
    </div>
  );
}
