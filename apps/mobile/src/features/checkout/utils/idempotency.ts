/**
 * Checkout idempotency key state manager.
 * Binds an idempotency key to a specific checkout intent (address + payment method),
 * ensuring retries and network drops reuse the same token while intent changes
 * generate a fresh token.
 */

let currentIntent = '';
let currentKey = '';

export function getIdempotencyKeyForIntent(addressId: string, paymentMethod: string): string {
  const intent = `${addressId}:${paymentMethod}`;
  if (intent === currentIntent && currentKey) {
    return currentKey;
  }

  currentIntent = intent;
  currentKey = `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  return currentKey;
}

export function resetIdempotencyKey(): void {
  currentIntent = '';
  currentKey = '';
}
