import React from 'react';
import { type FieldValues, FormProvider, useForm } from 'react-hook-form';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ColorMetaItem } from '../color-meta-item';

/**
 * The per-colour row used to render a Pencil + inline Input that wrote
 * `<namePrefix>.name`. NOTHING read that value: the payload takes the colour
 * name from the colour AXIS (`add-product-payload.ts`, `colorLabelMap`), so a
 * rename was silently dropped while the swatch and gallery photos stayed filed
 * under the original key. A control that cannot change anything is worse than
 * no control — it promises an outcome the submit does not honour.
 *
 * The colour is renamed on the Color axis instead, which is the field the
 * payload actually reads.
 */

vi.mock('../../../hooks/use-media-assets', () => ({ useInvalidateMediaLibrary: () => vi.fn() }));
vi.mock('../../../components/media-library-button', () => ({ MediaLibraryButton: () => null }));

const RED = 'variants.colorMeta.Red';

function renderRow() {
  function Harness() {
    const methods = useForm<FieldValues>({ defaultValues: {}, mode: 'onChange' as const });
    return (
      <FormProvider {...methods}>
        <ColorMetaItem color="Red" namePrefix={RED} />
      </FormProvider>
    );
  }
  return render(<Harness />);
}

describe('the colour row must not offer a rename nothing reads', () => {
  it('renders no rename affordance at all', () => {
    renderRow();
    expect(screen.queryByTitle('Rename color')).toBeNull();
    // The Pencil glyph is the only rename trigger that ever existed.
    expect(document.querySelector('svg.lucide-pencil')).toBeNull();
  });

  it('still shows the colour name as read-only text, not an input', () => {
    renderRow();
    const label = screen.getByText('Red');
    expect(label.tagName).toBe('SPAN');
    // Exactly one textbox-free presentation: clicking the name does nothing.
    expect(label.querySelector('input')).toBeNull();
  });
});
