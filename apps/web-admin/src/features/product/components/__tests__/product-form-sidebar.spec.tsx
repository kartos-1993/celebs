import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ProductSidebarSection } from '../product-form-sidebar';
import ProductFormSidebar from '../product-form-sidebar';

describe('ProductFormSidebar checklist and error display', () => {
  // `untouched` is what a pristine section is: nothing answered, so it is not
  // done and not red. `incomplete` is the seller having started a section that
  // is still short — those speak up on their own.
  const sampleSections: ProductSidebarSection[] = [
    {
      key: 'basic',
      label: 'Basic Information',
      anchorId: 'product-section-basic',
      status: 'incomplete',
      errors: [
        'Product name must be at least 2 characters.',
        'Select a product category before publishing.',
      ],
    },
    {
      key: 'images',
      label: 'Product Images',
      anchorId: 'product-section-base',
      status: 'complete',
      errors: [],
    },
    {
      key: 'specification',
      label: 'Product Specification',
      anchorId: 'product-section-details',
      status: 'incomplete',
      errors: ['Fill at least 3 specification attributes.'],
    },
    {
      key: 'pricing',
      label: 'Price, Stock & Variants',
      anchorId: 'product-section-sale',
      status: 'untouched',
      errors: ['Default SKU: add a valid price.', 'Add at least 1 unit in one size to publish.'],
    },
    {
      key: 'shipping',
      label: 'Shipping & Warranty',
      anchorId: 'product-section-package',
      status: 'untouched',
      errors: [],
    },
  ];

  it('renders neutral sections without error messages when showErrors is false on initial load', () => {
    // A pristine form: every section `untouched`, so nothing is done and
    // nothing is red — regardless of the showErrors flag.
    const pristine: ProductSidebarSection[] = sampleSections.map((section) => ({
      ...section,
      status: 'untouched' as const,
    }));

    render(<ProductFormSidebar completionPercentage={0} sections={pristine} showErrors={false} />);

    expect(screen.getByText('Basic Information')).toBeDefined();
    expect(screen.getByText('Product Images')).toBeDefined();
    expect(screen.getByText('Product Specification')).toBeDefined();
    expect(screen.getByText('Price, Stock & Variants')).toBeDefined();
    expect(screen.getByText('Shipping & Warranty')).toBeDefined();

    expect(screen.queryByText('Product name must be at least 2 characters.')).toBeNull();
    expect(screen.queryByText('Select a product category before publishing.')).toBeNull();
    expect(screen.queryByText('Fill at least 3 specification attributes.')).toBeNull();
    // Untouched sections stay silent until a submit attempt: answering one
    // field is not consent to be told about sections never opened.
    expect(screen.queryByText('Default SKU: add a valid price.')).toBeNull();

    expect(screen.getByText('0 of 5 sections done')).toBeDefined();
    expect(screen.getByText('0%')).toBeDefined();
  });

  it('renders neutral sections without error messages when showErrors is true on initial load', () => {
    const pristine: ProductSidebarSection[] = sampleSections.map((section) => ({
      ...section,
      status: 'untouched' as const,
    }));

    render(<ProductFormSidebar completionPercentage={0} sections={pristine} showErrors={true} />);

    expect(screen.queryByText('Product name must be at least 2 characters.')).toBeNull();
    expect(screen.queryByText('Default SKU: add a valid price.')).toBeNull();
  });

  it('reveals incomplete sections without a submit attempt, untouched ones only after one', () => {
    const { rerender } = render(
      <ProductFormSidebar completionPercentage={20} sections={sampleSections} />,
    );
    expect(screen.getByText('Product name must be at least 2 characters.')).toBeDefined();
    expect(screen.getByText('Fill at least 3 specification attributes.')).toBeDefined();
    expect(screen.queryByText('Default SKU: add a valid price.')).toBeNull();

    rerender(
      <ProductFormSidebar completionPercentage={20} sections={sampleSections} hasAttemptedSubmit />,
    );
    expect(screen.getByText('Default SKU: add a valid price.')).toBeDefined();
  });

  it('renders red error messages for incomplete sections when showErrors is true after submit attempt', () => {
    render(
      <ProductFormSidebar
        completionPercentage={25}
        hasAttemptedSubmit
        sections={sampleSections}
        showErrors={true}
      />,
    );

    expect(screen.getByText('Product name must be at least 2 characters.')).toBeDefined();
    expect(screen.getByText('Select a product category before publishing.')).toBeDefined();
    expect(screen.getByText('Fill at least 3 specification attributes.')).toBeDefined();
    expect(screen.getByText('Default SKU: add a valid price.')).toBeDefined();
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
            status: 'complete',
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
