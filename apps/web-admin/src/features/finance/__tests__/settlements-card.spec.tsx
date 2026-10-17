import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { SettlementBatch } from '../api';
import { SettlementsCard } from '../components/settlements-card';

const mockBatches: SettlementBatch[] = [
  {
    id: 'batch-1',
    courier: 'PATHAO',
    status: 'OPEN',
    periodStart: '2026-09-01T00:00:00.000Z',
    periodEnd: '2026-10-01T00:00:00.000Z',
    expectedCollected: '5000.00',
    expectedFees: '450.00',
    declaredCollected: '0.00',
    declaredFees: '0.00',
    variance: '0.00',
    reference: 'REF-01',
    notes: null,
    reconciledAt: null,
    paidAt: null,
  },
];

describe('SettlementsCard', () => {
  it('renders open batch button and triggers callback when clicked', () => {
    const onOpenBatch = vi.fn();
    const onCourierFilterChange = vi.fn();

    render(
      <SettlementsCard
        batches={mockBatches}
        onOpenBatch={onOpenBatch}
        onCourierFilterChange={onCourierFilterChange}
        onRecordStatement={vi.fn()}
        onReconcile={vi.fn()}
        onPay={vi.fn()}
      />,
    );

    const openBtn = screen.getByRole('button', { name: /open batch/i });
    expect(openBtn).toBeDefined();

    fireEvent.click(openBtn);
    expect(onOpenBatch).toHaveBeenCalledTimes(1);
  });

  it('triggers onCourierFilterChange when a courier filter is selected', () => {
    const onCourierFilterChange = vi.fn();

    render(
      <SettlementsCard
        batches={mockBatches}
        onOpenBatch={vi.fn()}
        onCourierFilterChange={onCourierFilterChange}
        onRecordStatement={vi.fn()}
        onReconcile={vi.fn()}
        onPay={vi.fn()}
      />,
    );

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'PATHAO' } });

    expect(onCourierFilterChange).toHaveBeenCalledWith('PATHAO');
  });

  it('renders open batch action button inside empty state when no batches exist', () => {
    const onOpenBatch = vi.fn();

    render(
      <SettlementsCard
        batches={[]}
        onOpenBatch={onOpenBatch}
        onCourierFilterChange={vi.fn()}
        onRecordStatement={vi.fn()}
        onReconcile={vi.fn()}
        onPay={vi.fn()}
      />,
    );

    expect(screen.getByText(/no settlements yet/i)).toBeDefined();
    const openButtons = screen.getAllByRole('button', { name: /open batch/i });
    expect(openButtons.length).toBeGreaterThanOrEqual(1);

    fireEvent.click(openButtons[0]!);
    expect(onOpenBatch).toHaveBeenCalledTimes(1);
  });
});
