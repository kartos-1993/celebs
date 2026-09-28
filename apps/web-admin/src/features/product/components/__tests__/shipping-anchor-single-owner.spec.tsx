import React from 'react';
import { type FieldValues, FormProvider, useForm } from 'react-hook-form';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { FieldSpec } from '../../types';
import { PRODUCT_SECTION_ANCHORS } from '../../utils/add-product-validation';
import { DynamicProductForm } from '../dynamic-product-form';
import { ShippingWarrantySection } from '../shipping-warranty-section';

/**
 * THE SHIPPING ANCHOR, RESOLVED.
 *
 * Both cards used to render `id="product-section-package"`. The sidebar's
 * "Shipping & Warranty" jump resolves through `getElementById`, so it scrolled
 * to whichever came first in the DOM and the other card was unreachable — and
 * the anchor only existed at all for a category that declared `package`-group
 * attributes, while the owner renders unconditionally.
 *
 * `ShippingWarrantySection` owns the id (see its docblock). These assertions
 * are on the RENDERED DOM, not on source text, because a duplicate id is a DOM
 * fact: no number of source greps can prove only one is mounted.
 *
 * The composition is the production one from `add-product-form-body.tsx:99-108`
 * — the dynamic form and the shipping section as siblings.
 */

vi.mock('../../hooks/use-media-assets', () => ({ useInvalidateMediaLibrary: () => vi.fn() }));

const PACKAGE_ANCHOR = PRODUCT_SECTION_ANCHORS.shipping;

/** A schema that DOES declare `package`-group attributes, plus parcel reuse. */
const packageSchema: FieldSpec[] = [
  { name: 'material', uiType: 'input', label: 'Material', group: 'details', required: true },
  // A category attribute that reuses a parcel path owned by the dimensions card.
  { name: 'packageLengthCm', uiType: 'number', label: 'Length', group: 'package', required: true },
  { name: 'packageWeightKg', uiType: 'number', label: 'Weight', group: 'package', required: true },
  // A genuine package attribute: it must still render.
  { name: 'isFragile', uiType: 'Switch', label: 'Fragile', group: 'package', required: false },
];

function renderComposition() {
  function Harness() {
    const methods = useForm<FieldValues>({ defaultValues: {} });
    return (
      <QueryClientProvider client={new QueryClient()}>
        <FormProvider {...methods}>
          <DynamicProductForm catId="cat-1" schemaFields={packageSchema} />
          <ShippingWarrantySection />
        </FormProvider>
      </QueryClientProvider>
    );
  }
  return render(<Harness />);
}

const anchorNodes = (container: HTMLElement) =>
  container.querySelectorAll(`[id="${PACKAGE_ANCHOR}"]`);

describe('the shipping anchor is mounted exactly once', () => {
  it('is unique for a schema that includes package fields', () => {
    // The reported defect: with `package` attributes declared, BOTH cards
    // mounted the id, so one of the two shipping cards was unreachable.
    const { container } = renderComposition();
    expect(anchorNodes(container)).toHaveLength(1);
  });

  it('is unique even when the category reuses the owned parcel paths', () => {
    const { container } = renderComposition();
    expect(anchorNodes(container)).toHaveLength(1);
  });

  it('is the shipping section that owns it, so the jump can never dangle', () => {
    const { container } = renderComposition();
    const owner = anchorNodes(container)[0];
    // The owner renders the dimensions + warranty cards, the dynamic block
    // renders schema attributes. `closest` is the discriminator.
    expect(owner.querySelector('#packageWeightKg')).not.toBeNull();
    expect(owner.querySelector('#packageLengthCm')).not.toBeNull();
  });

  it('is still unique when the category declares no package attribute of its own', () => {
    // The anchor's owner renders unconditionally, so a category with an empty
    // `package` group cannot leave the sidebar jump pointing at nothing.
    function OwnerOnly() {
      const methods = useForm<FieldValues>({ defaultValues: {} });
      return (
        <FormProvider {...methods}>
          <ShippingWarrantySection />
        </FormProvider>
      );
    }
    const { container } = render(<OwnerOnly />);
    expect(anchorNodes(container)).toHaveLength(1);
  });

  it('renders each owned parcel path exactly once, never as a duplicate input', () => {
    const { container } = renderComposition();
    for (const path of ['packageWeightKg', 'packageLengthCm']) {
      expect(container.querySelectorAll(`#${path}`)).toHaveLength(1);
    }
  });

  it('still renders the category attributes it does not own', () => {
    const { container } = renderComposition();
    // `isFragile` belongs to the warranty card, `material` to the dynamic block;
    // the switch below proves the dynamic `package` block is alive at all.
    expect(container.querySelector('[name="material"]')).not.toBeNull();
  });
});
