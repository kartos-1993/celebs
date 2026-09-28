import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { PRODUCT_SECTION_ANCHORS } from '../../utils/add-product-validation';

/**
 * Shipping-section ownership.
 *
 * Two cards can render shipping content: this lane's always-rendered
 * `ShippingWarrantySection`, and the schema-driven `packageFields` block in
 * `dynamic-product-form.tsx`. Both used to render
 * `id="product-section-package"`, so the sidebar's "Shipping & Warranty" jump
 * resolved through `getElementById` to whichever came first in the DOM and the
 * other card was unreachable. This pins the DECISION so the anchor has exactly
 * one documented owner.
 */

const source = (rel: string) =>
  readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '..', rel), 'utf8');

/**
 * Source with comments stripped. Prose is allowed to NAME the anchor (the
 * block documents who owns it); executable code is not allowed to USE it.
 * Handles both `//` lines and `/* … *\/` blocks, the latter because a multi-line
 * `{/* … *\/}` JSX comment has no `//` to strip.
 */
const sourceCode = (rel: string) =>
  source(rel)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((line) => line.replace(/\/\/.*$/, ''))
    .join('\n');

const PARCEL_PATHS = [
  'packageWeightKg',
  'packageLengthCm',
  'packageWidthCm',
  'packageHeightCm',
] as const;

describe('the shipping anchor has one owner', () => {
  it('is the shared constant, so the sidebar jump and the card cannot disagree', () => {
    expect(source('shipping-warranty-section.tsx')).toContain(
      'id={PRODUCT_SECTION_ANCHORS.shipping}',
    );
  });

  it('lives on the card that is rendered unconditionally', () => {
    // The dynamic form's package block is gated on a category declaring
    // `package`-group attributes; an anchor there would dangle for every other
    // category. `add-product-form-body.tsx` renders `ShippingWarrantySection`
    // beside it with no schema condition of its own.
    const body = source('add-product/add-product-form-body.tsx');
    expect(body).toContain('<ShippingWarrantySection />');
    expect(body).not.toMatch(/<ShippingWarrantySection\s+\w/);
  });

  it('names the unowned duplicate in its owner docblock so it is not forgotten', () => {
    expect(source('shipping-warranty-section.tsx')).toContain('dynamic-product-form.tsx:284');
  });

  it('is no longer emitted by the schema-driven package block', () => {
    // The action item that docblock asked for is DONE: the dynamic block renders
    // as plain content and the anchor resolves here, once. Asserted at the
    // source because a second `id=` would reappear as a duplicate DOM id; the
    // rendered-DOM half of this contract lives in
    // `shipping-anchor-single-owner.spec.tsx`.
    const form = sourceCode('dynamic-product-form.tsx');
    expect(form).not.toContain(`id="${PRODUCT_SECTION_ANCHORS.shipping}"`);
    // Stronger than the literal string: the block must not reach for the anchor
    // constant at all, so a future edit cannot quietly re-acquire the id.
    expect(form).not.toContain('PRODUCT_SECTION_ANCHORS');
  });

  it('keeps the owned parcel paths out of the schema-driven block', () => {
    // A category attribute reusing one of the four names would otherwise render
    // a second input for one RHF field.
    const guard = source('dynamic-form-parcel-guard.ts');
    for (const path of PARCEL_PATHS) {
      expect(guard).toContain(`'${path}'`);
    }
    expect(source('dynamic-product-form.tsx')).toContain('excludeOwnerOwnedFields(grouped.package');
  });
});

describe('the parcel fields have one owner', () => {
  it.each(PARCEL_PATHS)('%s is registered by the dimensions card', (path) => {
    expect(source('shipping-dimensions-card.tsx')).toContain(`register('${path}'`);
  });

  it.each(PARCEL_PATHS)('%s is not registered by the section wrapper', (path) => {
    expect(source('shipping-warranty-section.tsx')).not.toContain(`register('${path}'`);
  });
});
