import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BarcodeSticker } from '../barcode-sticker';
import { ThermalPrintBatch } from '../thermal-print-batch';

describe('BarcodeSticker component', () => {
  it('renders long product title and clean uppercase retail SKU without slug dashes', () => {
    render(
      <BarcodeSticker
        storeName="CELEBS • NEW ROAD HUB"
        productName="Solid Ribbed Long Sleeve Polo Shirt with Contrast Lapel Collar and Vintage Buttons"
        variantLabel="Black / XL"
        price={1850}
        sku="CLB-HUB-7F892B"
      />,
    );

    expect(
      screen.getByText(
        'Solid Ribbed Long Sleeve Polo Shirt with Contrast Lapel Collar and Vintage Buttons',
      ),
    ).toBeDefined();
    expect(screen.getByText('Black / XL')).toBeDefined();
    expect(screen.getByText('Rs. 1,850')).toBeDefined();
    expect(screen.getByText('CLB-HUB-7F892B')).toBeDefined();
    expect(screen.getByText('CELEBS • NEW ROAD HUB')).toBeDefined();
  });
});

describe('ThermalPrintBatch component', () => {
  it('clamps copies to maximum of 50 when large numbers like 222 are passed', () => {
    const { container } = render(
      <ThermalPrintBatch
        item={{
          storeName: 'CELEBS • NEW ROAD HUB',
          productName: 'Sample Product',
          price: 999,
          sku: 'CLB-HUB-A1B2C3',
        }}
        copies={222}
      />,
    );

    const batchContainer = container.querySelector('#thermal-print-batch');
    expect(batchContainer).toBeDefined();
    // Must be clamped to 50 to prevent DOM memory overflow and browser tab crash
    expect(batchContainer?.children.length).toBe(50);
  });

  it('renders exact requested copies when within safe range', () => {
    const { container } = render(
      <ThermalPrintBatch
        item={{
          storeName: 'CELEBS • NEW ROAD HUB',
          productName: 'Sample Product',
          price: 999,
          sku: 'CLB-HUB-A1B2C3',
        }}
        copies={3}
      />,
    );

    const batchContainer = container.querySelector('#thermal-print-batch');
    expect(batchContainer?.children.length).toBe(3);
  });
});
