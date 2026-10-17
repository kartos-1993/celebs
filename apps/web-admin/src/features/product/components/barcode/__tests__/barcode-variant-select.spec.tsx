import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { BarcodePrintItem } from '../barcode-print-modal';
import { BarcodeVariantSelect } from '../barcode-variant-select';

const items: BarcodePrintItem[] = [
  { sku: 'CLB-HUB-A1', productName: 'Tee', variantLabel: 'Red', price: 100 },
  { sku: 'CLB-HUB-A2', productName: 'Tee', variantLabel: 'Blue', price: 100 },
];

describe('BarcodeVariantSelect', () => {
  it('renders nothing when there is a single item', () => {
    const { container } = render(
      <BarcodeVariantSelect items={items.slice(0, 1)} selectedIndex={0} onSelectIndex={vi.fn()} />,
    );
    expect(container.textContent).toBe('');
  });

  it('renders the variant picker label and trigger for multiple items', () => {
    render(<BarcodeVariantSelect items={items} selectedIndex={0} onSelectIndex={vi.fn()} />);
    expect(screen.getByText('Select Variant')).toBeDefined();
    expect(screen.getByLabelText('Select variant to print')).toBeDefined();
  });
});
