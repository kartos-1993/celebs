import { timingSafeEqual } from 'node:crypto';

/**
 * Proves a courier webhook really came from Pathao.
 *
 * Pathao's model is a shared secret, not a signature scheme: you invent a
 * secret in their dashboard, and Pathao echoes it back in the
 * `X-Pathao-Signature` request header on every delivery. Verification is a
 * timing-safe string comparison of that header against the configured secret.
 *
 * The same secret is echoed the other way during integration: when Pathao
 * posts the `webhook_integration` handshake, we must answer HTTP 202 with
 * the secret in the `X-Pathao-Merchant-Webhook-Integration-Secret` response
 * header, or Pathao never activates the endpoint.
 *
 * Deliberate limit, documented so the next reader does not mistake it for an
 * oversight: an echo proves the sender knows the secret, not that the body is
 * untampered. Forged events are contained downstream by treating the webhook
 * as a signal — delivery moves are forward-only, so a forged event can never
 * regress an order.
 */
export const PATHAO_SIGNATURE_HEADER = 'x-pathao-signature';

export const PATHAO_ECHO_HEADER = 'X-Pathao-Merchant-Webhook-Integration-Secret';

export const PATHAO_HANDSHAKE_EVENT = 'webhook_integration';

export function readPathaoWebhookSecret(): string {
  return (process.env.PATHAO_WEBHOOK_SECRET ?? '').trim();
}

export function verifyPathaoWebhookSignature(input: {
  signature: string | undefined;
  secret: string;
}): boolean {
  const { signature, secret } = input;

  if (!signature || !secret) return false;

  const received = Buffer.from(signature.trim(), 'utf8');
  const expected = Buffer.from(secret, 'utf8');

  if (received.length !== expected.length) return false;

  return timingSafeEqual(received, expected);
}
