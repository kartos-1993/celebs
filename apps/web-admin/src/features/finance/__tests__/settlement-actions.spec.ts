import { describe, expect, it } from 'vitest';

import type { SettlementBatch } from '../api';
import { actionsFor } from '../lib/settlement-actions';

const batch = (status: SettlementBatch['status']): SettlementBatch => ({
  id: 'b1',
  courier: 'PATHAO',
  status,
  periodStart: '2026-09-01T00:00:00.000Z',
  periodEnd: '2026-10-01T00:00:00.000Z',
  expectedCollected: '2000.00',
  expectedFees: '200.00',
  declaredCollected: '0.00',
  declaredFees: '0.00',
  variance: '0.00',
  reference: null,
  notes: null,
  reconciledAt: null,
  paidAt: null,
});

describe('actionsFor', () => {
  it('offers the statement and the reconciliation, but never the payment', () => {
    const actions = actionsFor(batch('OPEN'));

    expect(actions.canRecordStatement).toBe(true);
    expect(actions.canReconcile).toBe(true);
    expect(actions.canPay).toBe(false);
  });

  it('offers only the payment once reconciled', () => {
    const actions = actionsFor(batch('RECONCILED'));

    expect(actions.canPay).toBe(true);
    expect(actions.canRecordStatement).toBe(false);
    expect(actions.canReconcile).toBe(false);
  });

  // Settled money cannot be reopened. Every move on this row is done.
  it('offers nothing once paid', () => {
    const actions = actionsFor(batch('PAID'));

    expect(actions.canRecordStatement).toBe(false);
    expect(actions.canReconcile).toBe(false);
    expect(actions.canPay).toBe(false);
  });
});
