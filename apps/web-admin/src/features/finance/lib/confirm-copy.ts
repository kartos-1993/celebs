import type { SettlementBatch } from '../api';

/**
 * What the confirmation says before money moves.
 *
 * Kept out of the page so there is no nested ternary in the JSX, and so the two
 * sentences sit next to each other: a payment and a reconciliation are different
 * acts of trust and should not be confirmed with the same words.
 */

export type SettlementIntent = 'RECONCILED' | 'PAID';

export function confirmTitle(intent: SettlementIntent): string {
  return intent === 'RECONCILED' ? 'Mark reconciled?' : 'Mark paid?';
}

export function confirmBody(batch: SettlementBatch, intent: SettlementIntent): string {
  if (intent === 'RECONCILED') {
    return `This records that you accept ${batch.variance} as the difference on ${batch.courier}.`;
  }

  return `${batch.declaredCollected} less ${batch.declaredFees} in fees leaves the bank.`;
}
