import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { AdminProductListItem } from '@celebs/shared-types';

import { ManageProductCard } from '../manage-product-card';

/**
 * The mobile card of a product row. It shared the fault with
 * `ManageProductTableRow` (which was fixed first) and was left behind: a
 * product whose price or stock the API omits published a fabricated
 * "Rs. 0" / "Stock 0" — a number the seller never entered, on a live listing.
 */

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

function renderCard(product: AdminProductListItem) {
  const { container } = render(
    <MemoryRouter>
      <ManageProductCard
        product={product}
        isSelected={false}
        onSelectProduct={vi.fn()}
        {...handlers}
      />
    </MemoryRouter>,
  );
  return container;
}

const textOf = (container: HTMLElement) => container.textContent ?? '';

/**
 * The price cell and the stock cell, read from the only two nodes that carry
 * `tabular-nums` in this card. Scoped deliberately: `formatShortDate` also
 * returns an em dash for a missing `updatedAt`, which says nothing about the
 * price/stock contract under test.
 */
const priceAndStock = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLElement>('[class*="tabular-nums"]'))
    .map((node) => node.textContent?.trim() ?? '')
    .filter(Boolean);

describe('ManageProductCard must not invent a zero', () => {
  it('shows a dash for a product with no price and no stock total', () => {
    // `Number(product.price ?? 0)` published "Rs. 0"; `getProductStock`'s null
    // rendered "Stock null"-shaped emptiness in the meta line.
    const rendered = textOf(renderCard(item({})));
    expect(rendered).toContain('—');
    expect(rendered).not.toMatch(/Rs\.\s*0\b/);
    expect(rendered).not.toMatch(/Stock\s+(0|null|undefined)\b/);
  });

  it('shows a dash for only the half the API omitted', () => {
    // Price present, stock absent: the two are independent gaps and must not
    // be collapsed into one.
    const rendered = textOf(renderCard(item({ price: 2400 })));
    expect(rendered).toContain('Rs. 2,400');
    expect(rendered).toContain('—');
    expect(rendered).not.toMatch(/Stock\s+(0|null)\b/);
  });

  it('keeps a real zero a zero — 0 is a value the seller may have set', () => {
    const rendered = textOf(renderCard(item({ price: 0, stockTotal: 0 })));
    expect(rendered).toContain('Rs. 0');
    expect(rendered).toContain('Stock 0');
  });

  it('shows the real numbers when the product has them', () => {
    const container = renderCard(item({ stockTotal: 12, price: 2400 }));
    expect(priceAndStock(container)).toEqual(['Rs. 2,400', 'Stock 12']);
  });
});
