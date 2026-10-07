import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { verifyPathaoWebhookSignature } from '../adapters/pathao-webhook.verify';

/**
 * The one endpoint a third party calls. A forged delivery event marks parcels
 * delivered that never moved, so the signature is the only thing standing
 * between an attacker and our fulfilment state.
 */

const SECRET = 'webhook-secret-for-tests';
const BODY = Buffer.from(JSON.stringify({ consignment_id: 'PT-1', order_status: 'Delivered' }));

const sign = (body: Buffer, secret: string) =>
  createHmac('sha256', secret).update(body).digest('hex');

describe('verifyPathaoWebhookSignature', () => {
  it('accepts a correctly signed delivery', () => {
    expect(
      verifyPathaoWebhookSignature({
        rawBody: BODY,
        signature: sign(BODY, SECRET),
        secret: SECRET,
      }),
    ).toBe(true);
  });

  it('refuses a tampered body carrying a valid signature', () => {
    const tampered = Buffer.from(
      JSON.stringify({ consignment_id: 'PT-1', order_status: 'Returned' }),
    );

    expect(
      verifyPathaoWebhookSignature({
        rawBody: tampered,
        signature: sign(BODY, SECRET),
        secret: SECRET,
      }),
    ).toBe(false);
  });

  it('refuses a signature made with a different secret', () => {
    expect(
      verifyPathaoWebhookSignature({
        rawBody: BODY,
        signature: sign(BODY, 'attacker-secret'),
        secret: SECRET,
      }),
    ).toBe(false);
  });

  it('refuses a missing signature, body, or secret rather than throwing', () => {
    expect(
      verifyPathaoWebhookSignature({ rawBody: BODY, signature: undefined, secret: SECRET }),
    ).toBe(false);
    expect(
      verifyPathaoWebhookSignature({
        rawBody: undefined,
        signature: sign(BODY, SECRET),
        secret: SECRET,
      }),
    ).toBe(false);
    expect(
      verifyPathaoWebhookSignature({ rawBody: BODY, signature: sign(BODY, SECRET), secret: '' }),
    ).toBe(false);
  });

  it('refuses a signature of the wrong length without timing leaks', () => {
    expect(
      verifyPathaoWebhookSignature({ rawBody: BODY, signature: 'short', secret: SECRET }),
    ).toBe(false);
  });
});
