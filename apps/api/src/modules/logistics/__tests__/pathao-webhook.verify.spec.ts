import { describe, expect, it } from 'vitest';

import { verifyPathaoWebhookSignature } from '../adapters/pathao-webhook.verify';

/**
 * Pathao's model is a shared secret, not a signature scheme: the dashboard
 * holds a secret you invent, and Pathao echoes it back in the
 * X-Pathao-Signature request header. Verification is a timing-safe string
 * comparison of that echo against the configured value.
 */

const SECRET = 'webhook-secret-for-tests';

describe('verifyPathaoWebhookSignature', () => {
  it('accepts the secret Pathao echoes back', () => {
    expect(verifyPathaoWebhookSignature({ signature: SECRET, secret: SECRET })).toBe(true);
  });

  it('refuses a forged echo', () => {
    expect(verifyPathaoWebhookSignature({ signature: 'attacker-secret', secret: SECRET })).toBe(
      false,
    );
  });

  it('refuses a missing signature, body-side secret, or configured secret', () => {
    expect(verifyPathaoWebhookSignature({ signature: undefined, secret: SECRET })).toBe(false);
    expect(verifyPathaoWebhookSignature({ signature: SECRET, secret: '' })).toBe(false);
    expect(verifyPathaoWebhookSignature({ signature: '', secret: SECRET })).toBe(false);
  });

  it('refuses a different-length value without timing leaks', () => {
    expect(verifyPathaoWebhookSignature({ signature: 'short', secret: SECRET })).toBe(false);
  });

  it('ignores surrounding whitespace rather than failing a valid echo', () => {
    expect(verifyPathaoWebhookSignature({ signature: `  ${SECRET}  `, secret: SECRET })).toBe(true);
  });
});
