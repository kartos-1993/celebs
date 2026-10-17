import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { WarrantyPolicyCard } from '../warranty-policy-card';

function WarrantyHarness() {
  const form = useForm({ defaultValues: {} });
  return (
    <FormProvider {...form}>
      <WarrantyPolicyCard />
    </FormProvider>
  );
}

describe('WarrantyPolicyCard', () => {
  it('renders packaging, warranty, and handling-flag sections with identical copy', () => {
    render(<WarrantyHarness />);
    expect(screen.getByText('Standard Packaging Format')).toBeDefined();
    expect(screen.getByText('Warranty Guarantee')).toBeDefined();
    expect(screen.getByText('Fragile Handling')).toBeDefined();
    expect(screen.getByText('Dangerous Goods (Battery / Liquid)')).toBeDefined();
    expect(screen.getByText('Non-Returnable (Hygiene Guard)')).toBeDefined();
  });
});
