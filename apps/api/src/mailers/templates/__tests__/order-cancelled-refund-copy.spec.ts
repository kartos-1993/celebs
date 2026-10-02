import { describe, expect, it } from 'vitest';

import { orderCancelledTemplate } from '../order-cancelled.template';

/**
 * This template used to tell any online customer their refund "has been initiated"
 * and will reach their wallet in 1-3 days. Nothing was ever sent to a gateway, so
 * that sentence was a promise the platform could not keep - and it was the only
 * thing standing between a cancelled order and a chargeback.
 *
 * The wording now follows what actually happened, which differs per wallet: one
 * confirms refunds in seconds, the other has no refund API at all.
 */

const base = {
  orderNumber: 'ORD-1',
  customerName: 'Ram',
  items: [{ productName: 'Shirt', quantity: 1 }],
};

const notice = (paymentMethod: string, refundOutcome?: string, totalAmount = 2500) =>
  orderCancelledTemplate({
    ...base,
    paymentMethod,
    totalAmount,
    refundOutcome: refundOutcome as never,
  }).text;

describe('order cancellation refund copy', () => {
  it('tells a cash on delivery customer nothing was charged', () => {
    expect(notice('COD', 'NOT_REQUIRED')).toMatch(/no payment was charged/i);
  });

  it('tells a customer whose refund the wallet confirmed that it is on its way', () => {
    const text = notice('KHALTI', 'SUCCEEDED');

    expect(text).toMatch(/has been sent to KHALTI/i);
    expect(text).toMatch(/1-3 business days/i);
    expect(text).toContain('2,500');
  });

  // The wallet with no refund API. Saying "your refund is on its way" here is the
  // original lie, because nothing was sent anywhere.
  it('explains a manual refund rather than claiming it is in flight', () => {
    const text = notice('ESEWA', 'REQUIRES_MANUAL_ACTION');

    expect(text).toMatch(/manually/i);
    expect(text).toMatch(/team/i);
    expect(text).not.toMatch(/has been sent to ESEWA/i);
  });

  it('tells the customer a failed refund will still be completed by hand', () => {
    const text = notice('KHALTI', 'FAILED');

    expect(text).toMatch(/could not start/i);
    expect(text).toMatch(/team will complete/i);
    expect(text).toMatch(/contact/i);
  });

  // Nothing should let a template imply an automatic refund that never happened.
  it.each(['COD', 'KHALTI', 'ESEWA'])(
    'never promises a completed refund for %s when no outcome is known',
    (paymentMethod) => {
      const text = notice(paymentMethod, undefined);

      expect(text).not.toMatch(/has been initiated/i);
      expect(text).not.toMatch(/refund of .* has been sent/i);
    },
  );

  it.each(['KHALTI', 'ESEWA'])(
    'sets a timescale for an online payment with no known outcome, so the customer knows to expect one',
    (paymentMethod) => {
      expect(notice(paymentMethod, undefined)).toMatch(/3 business days/i);
    },
  );

  it('keeps the cancellation itself confirmed whatever the refund outcome', () => {
    for (const outcome of ['SUCCEEDED', 'REQUIRES_MANUAL_ACTION', 'FAILED', undefined]) {
      expect(notice('KHALTI', outcome)).toMatch(/has been successfully cancelled/i);
    }
  });
});
