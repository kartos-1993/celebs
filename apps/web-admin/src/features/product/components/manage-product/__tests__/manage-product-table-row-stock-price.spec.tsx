import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { AdminProductListItem } from '@celebs/shared-types';

import { ManageProductTableRow } from '../manage-product-table-row';

const item = (over: Partial<AdminProductListItem>): AdminProductListItem =>
  ({ id: 'p1', name: 'Handwoven Kurta', status: 'draft', ...over }) as AdminProductListItem;

const handlers = {
  isSellerOrStaff: false,
  canCreate: false,
  canEdit: false,
  onSubmit: vi.fn(),
  isSubmitPending: false,
  onToggleActivation: vi.fn(),
  isTogglePending: false,
  onSetArchiveTarget: vi.fn(),
  onPrintBarcodes: vi.fn(),
};

function renderRow(product: AdminProductListItem) {
  const { container } = render(
    <MemoryRouter>
      <table>
        <tbody>
          <ManageProductTableRow
            product={product}
            isSelected={false}
            onSelect={vi.fn()}
            {...handlers}
          />
        </tbody>
      </table>
    </MemoryRouter>,
  );
  return container;
}

const cells = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('td')).map((td) => td.textContent?.trim());

describe('ManageProductTableRow must not invent a zero', () => {
  it('shows a dash for a product with no stock total and no price', () => {
    // `Number(product.price ?? 0)` published "Rs. 0" for a product that simply
    // has no price yet — a number the seller never entered, on a live listing.
    const rendered = cells(renderRow(item({})));
    expect(rendered).toContain('—');
    expect(rendered.join(' ')).not.toMatch(/Rs\.\s*0\b/);
  });

  it('shows the real numbers when the product has them', () => {
    const rendered = cells(renderRow(item({ stockTotal: 12, price: 2400 })));
    expect(rendered).toContain('12');
    expect(rendered).toContain('Rs. 2,400');
  });
});
