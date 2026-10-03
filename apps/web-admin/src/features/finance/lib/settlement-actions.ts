import type { SettlementBatch } from '../api';

/**
 * Which moves a settlement will accept next.
 *
 * Held here rather than in the table so the rules are stated once, and so the UI
 * cannot offer a move the server will refuse. The server checks the same rules -
 * these are for the operator, not for safety.
 *
 * PAID is reachable only from RECONCILED, which is why "Record statement" and
 * "Mark paid" can never both be live on the same row: the first needs OPEN, the
 * second needs RECONCILED.
 */

export interface SettlementActions {
  canRecordStatement: boolean;
  canReconcile: boolean;
  canPay: boolean;
}

export function actionsFor(batch: SettlementBatch): SettlementActions {
  return {
    canRecordStatement: batch.status === 'OPEN',
    canReconcile: batch.status === 'OPEN',
    canPay: batch.status === 'RECONCILED',
  };
}
