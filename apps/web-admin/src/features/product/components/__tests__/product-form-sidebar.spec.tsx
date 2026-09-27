import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ProductSidebarSection } from '../product-form-sidebar';
import ProductFormSidebar from '../product-form-sidebar';

describe('ProductFormSidebar checklist and error display', () => {
  const sampleSections: ProductSidebarSection[] = [
    {
      key: 'basic',
      label: 'Basic Information',
      anchorId: 'product-section-basic',
      status: false,
      errors: [
        'Product name must be at least 30 characters.',
        'Select a product category before publishing.',
      ],
    },
    {
      key: 'images',
      label: 'Product Images',
      anchorId: 'product-section-base',
      status: true,
      errors: [],
    },
    {
      key: 'specification',
      label: 'Product Specification',
      anchorId: 'product-section-details',
      status: false,
      errors: ['Fill at least 3 specification attributes.'],
    },
    {
      key: 'pricing',
      label: 'Price, Stock & Variants',
      anchorId: 'product-section-sale',
      status: false,
      errors: ['Default SKU: add a valid price.', 'Add at least 1 unit in one size to publish.'],
    },
    {
      key: 'shipping',
      label: 'Shipping & Warranty',
      anchorId: 'product-section-package',
      status: false,
      errors: ['Package weight is required for courier billing.'],
    },
  ];

  it('renders neutral sections without error messages when showErrors is false on initial load', () => {
    render(
      <ProductFormSidebar completionPercentage={20} sections={sampleSections} showErrors={false} />,
    );

    expect(screen.getByText('Basic Information')).toBeDefined();
    expect(screen.getByText('Product Images')).toBeDefined();
    expect(screen.getByText('Product Specification')).toBeDefined();
    expect(screen.getByText('Price, Stock & Variants')).toBeDefined();
    expect(screen.getByText('Shipping & Warranty')).toBeDefined();

    expect(screen.queryByText('Product name must be at least 30 characters.')).toBeNull();
    expect(screen.queryByText('Select a product category before publishing.')).toBeNull();
    expect(screen.queryByText('Fill at least 3 specification attributes.')).toBeNull();
    expect(screen.queryByText('Default SKU: add a valid price.')).toBeNull();
    expect(screen.queryByText('Package weight is required for courier billing.')).toBeNull();

    expect(screen.getByText('1 of 5 sections done')).toBeDefined();
    expect(screen.getByText('20%')).toBeDefined();
  });

  it('renders red error messages for incomplete sections when showErrors is true after submit attempt', () => {
    render(
      <ProductFormSidebar completionPercentage={25} sections={sampleSections} showErrors={true} />,
    );

    expect(screen.getByText('Product name must be at least 30 characters.')).toBeDefined();
    expect(screen.getByText('Select a product category before publishing.')).toBeDefined();
    expect(screen.getByText('Fill at least 3 specification attributes.')).toBeDefined();
    expect(screen.getByText('Default SKU: add a valid price.')).toBeDefined();
    expect(screen.getByText('Package weight is required for courier billing.')).toBeDefined();
  });

  it('renders checkmark and no error messages for completed sections regardless of showErrors', () => {
    render(
      <ProductFormSidebar
        completionPercentage={100}
        sections={[
          {
            key: 'basic',
            label: 'Basic Information',
            anchorId: 'product-section-basic',
            status: true,
            errors: [],
          },
        ]}
        showErrors={true}
      />,
    );

    expect(screen.getByText('Ready to submit')).toBeDefined();
    expect(screen.getByText('1 of 1 sections done')).toBeDefined();
    expect(screen.getByText('100%')).toBeDefined();
    expect(screen.getByText('Excellent')).toBeDefined();
  });

  it('triggers onSectionClick callback when clicking a checklist item', () => {
    const handleSectionClick = vi.fn();
    render(
      <ProductFormSidebar
        completionPercentage={25}
        sections={sampleSections}
        onSectionClick={handleSectionClick}
      />,
    );

    fireEvent.click(screen.getByTestId('sidebar-section-basic'));
    expect(handleSectionClick).toHaveBeenCalledWith('product-section-basic');
  });
});
