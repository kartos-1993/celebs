/**
 * A courier that is not actually there, for local development only.
 *
 * Pathao's sandbox has been observed answering 522 for twenty seconds and then
 * giving up. That is the courier being down, not us being wrong, and it blocks
 * the one thing a developer most needs to exercise: what happens to an order
 * after it is handed over. So in a non-production environment a failed booking
 * still produces a consignment, carrying a tracking number we invented.
 *
 * The consignment row is real - it is what COD settlement, the webhook route and
 * the seller dashboard all read - so nothing downstream has to know this exists.
 * The prefix is the whole point of it: PATHAO-MOCK- can never be mistaken for a
 * waybill a courier issued, so a mocked dispatch cannot be reconciled against a
 * real settlement or talked about as though a parcel were moving.
 */

/** Never present in production, whatever the environment says. */
export function isSandboxCourierFallbackAllowed(): boolean {
  return process.env.NODE_ENV !== 'production';
}

/** Deterministic, so a retried dispatch does not look like a second parcel. */
export function buildSandboxTrackingNumber(orderNumber: string, parcelIndex: number): string {
  const suffix = parcelIndex + 1;
  return `PATHAO-MOCK-${orderNumber}-${suffix}`;
}
