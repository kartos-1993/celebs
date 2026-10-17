import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CategoryChangeDialog } from '../category-change-dialog';

/**
 * The dialog is the seller's ONLY warning before an irreversible full reset
 * (`resetForNewCategory` in `use-product-draft.ts`). It used to say the switch
 * "may reset category-specific fields and variants" — which is true and
 * useless: the reset also clears the name, brand, description, all
 * packaging/warranty answers, the parcel dimensions, every image, every
 * colour/size row with its SKU codes, prices and stock, and DELETES the saved
 * draft. A seller reading the old copy had no way to learn that.
 *
 * Prose assertions, not snapshots: each item below is one thing the reset
 * really does, so dropping any of them from the copy fails here.
 */

const PROPS = {
  open: true,
  onOpenChange: vi.fn(),
  pendingCategoryName: 'Handwoven Cotton Kurta',
  onCancel: vi.fn(),
  onProceed: vi.fn(),
};

const open = (pendingCategoryName = 'Handwoven Cotton Kurta') =>
  render(<CategoryChangeDialog {...PROPS} pendingCategoryName={pendingCategoryName} />);

const copy = () => screen.getByText(/clears everything you have entered/).textContent ?? '';

/** Each of these is a group the real reset empties. */
const RESET_GROUPS: Array<[string, RegExp]> = [
  ['product name, brand and description', /name, brand and description/i],
  ['packaging and warranty answers', /packaging and warranty answers/i],
  ['parcel weight and dimensions', /parcel weight and dimensions/i],
  ['every product image', /every product image/i],
  ['every colour and size row', /every colour and size row/i],
  ['SKU codes, prices and stock', /SKU codes, prices and stock/i],
  ['the deleted saved draft', /saved draft is deleted too/i],
];

describe('the category-change warning must name the whole reset', () => {
  it.each(RESET_GROUPS)('states that the switch clears %s', (_label, pattern) => {
    open();
    expect(copy()).toMatch(pattern);
  });

  it('names the PENDING category, so the seller can see which one they are about to lose work on', () => {
    open('Sherwani Set');
    const description = screen.getByText(/clears everything you have entered/);
    expect(description.textContent).toContain('Sherwani Set');
    expect(description.querySelector('span')?.textContent).toBe('Sherwani Set');
  });

  it('no longer hedges the reset behind "may"', () => {
    open();
    expect(copy()).not.toMatch(/\bmay\b/i);
    expect(copy()).toMatch(/\bcannot be recovered\b/i);
  });
});
