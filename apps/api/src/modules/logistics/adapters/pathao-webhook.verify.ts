import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Proves a courier webhook really came from Pathao.
 *
 * Pathao signs the raw request bytes with the merchant webhook secret
 * (`X-Pathao-Signature`, HMAC-SHA256 hex) and echoes the secret itself in
 * `X-Pathao-Merchant-Webhook-Integration-Secret`. The comparison is
 * timing-safe, and a signature of the wrong length is refused before it.
 *
 * Two deliberate limits, documented so the next reader does not mistake them
 * for oversights:
 *
 * - The scheme (HMAC-SHA256 over raw bytes, hex) is the documented Pathao
 *   model. If a real delivery arrives with a different shape it is rejected
 *   loudly rather than half-accepted, and the rejection log names what was
 *   seen so the scheme can be confirmed rather than guessed at.
 * - Verification needs the raw bytes (`req.rawBody`, captured in app.ts). A
 *   re-serialised `req.body` is not signed material: key order is not
 *   guaranteed, so it would fail valid requests intermittently.
 */
export const PATHAO_SIGNATURE_HEADER = 'x-pathao-signature';

export function readPathaoWebhookSecret(): string {
  return (process.env.PATHAO_WEBHOOK_SECRET ?? '').trim();
}

export function verifyPathaoWebhookSignature(input: {
  rawBody: Buffer | undefined;
  signature: string | undefined;
  secret: string;
}): boolean {
  const { rawBody, signature, secret } = input;

  if (!rawBody || !signature || !secret) return false;

  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');

  const received = Buffer.from(signature.trim(), 'utf8');
  const computed = Buffer.from(expected, 'utf8');

  if (received.length !== computed.length) return false;

  return timingSafeEqual(received, computed);
}
