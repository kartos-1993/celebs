import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SkuDefaultTable } from '../sku-default-table';
import { SkuMatrixTable } from '../sku-matrix-table';
import { SkuSingleAxisTable } from '../sku-single-axis-table';
import type { VariantSelection } from '../sku-table-types';

/**
 * The `freeItems` cell is gone from the SKU tables. It had no schema key and
 * no Prisma column, so the payload always dropped it — a seller could type a
 * number, see it accepted, and lose it on save. The input, its validation rule
 * and the batch-apply scope were all removed together; these assertions keep
 * the input from creeping back and keep header/cell counts paired (a removed
 * column on one side only is a silent layout break in a `table-fixed` table).
 */
function Harness({ children }: { children: React.ReactNode }) {
  const methods = useForm({ defaultValues: {} });
  return <FormProvider {...methods}>{children}</FormProvider>;
}

function expectNoFreeItemsColumn(expectedColumns: number) {
  const rows = screen.getAllByRole('row');
  const headerCells = within(rows[0]).getAllByRole('columnheader');
  expect(headerCells).toHaveLength(expectedColumns);
  expect(headerCells.map((cell) => cell.textContent?.trim())).not.toContain('Free');

  const bodyCells = within(rows[1]).getAllByRole('cell');
  expect(bodyCells).toHaveLength(expectedColumns);

  const freeItemsInputs = document.querySelectorAll('[name$=".freeItems"]');
  expect(freeItemsInputs).toHaveLength(0);
}

describe('SKU tables carry no freeItems column', () => {
  it('SkuDefaultTable: price, special price, stock, sellerSku, status', () => {
    render(
      <Harness>
        <SkuDefaultTable />
      </Harness>,
    );
    expectNoFreeItemsColumn(5);
  });

  it('SkuSingleAxisTable: variant, price, special price, stock, sellerSku, status', () => {
    const variant: VariantSelection = { key: 'Color', label: 'Color', values: ['Red'] };
    render(
      <Harness>
        <SkuSingleAxisTable variant={variant} labelOf={(_key, value) => value} />
      </Harness>,
    );
    expectNoFreeItemsColumn(6);
  });

  it('SkuMatrixTable: two axes, price, special price, stock, sellerSku, active', () => {
    const primary: VariantSelection = { key: 'Color', label: 'Color', values: ['Red'] };
    const secondary: VariantSelection = { key: 'Size', label: 'Size', values: ['M'] };
    render(
      <Harness>
        <SkuMatrixTable
          primaryVariant={primary}
          secondaryVariant={secondary}
          labelOf={(_key, value) => value}
        />
      </Harness>,
    );
    expectNoFreeItemsColumn(7);
  });
});
