import crypto from 'crypto';

/**
 * Enterprise Order Number Generator:
 * Format: CEL-YYMMDD-XXXXXX (e.g. CEL-260908-489214)
 * - YYMMDD: Chronological, human-readable date for customer support & warehouse operations
 * - XXXXXX: Cryptographic 6-digit random entropy to prevent volume enumeration and collision
 */
export function generateOrderNumber(prefix = 'CEL'): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const datePart = `${yy}${mm}${dd}`;

  // 6-digit cryptographic random entropy (100,000 to 999,999)
  const entropy = crypto.randomInt(100000, 1000000).toString();

  return `${prefix}-${datePart}-${entropy}`;
}
