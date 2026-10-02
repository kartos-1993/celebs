import { describe, expect, it, vi } from 'vitest';

import { EsewaAdapter } from '../esewa.adapter';
import { KhaltiAdapter } from '../khalti.adapter';

/**
 * Refunding is not symmetric across the wallets, and pretending otherwise is how
 * a merchant ends up telling a customer their money is on its way when nothing
 * was ever sent.
 *
 * Khalti exposes a refund API. eSewa does not — its API can only start a payment
 * and read a status — so an eSewa refund is something a person does in the
 * merchant dashboard. The result therefore has three states, not two, and
 * REQUIRES_MANUAL_ACTION is the honest one.
 */

type RefundStatus = 'SUCCEEDED' | 'REQUIRES_MANUAL_ACTION' | 'FAILED';

const refundResult = (gateway: {
  refund: (input: { paymentId: string; amount?: number }) => Promise<unknown>;
}) =>
  gateway.refund({ paymentId: 'PIDS-1' }) as Promise<{ status: RefundStatus; message?: string }>;

/** Khalti answers the refund endpoint on a different tree from initiate/lookup. */
const khaltiFetch = (routes: Record<string, unknown>, options: { status?: number } = {}) => {
  const calls: string[] = [];

  const impl = vi.fn(async (input: string) => {
    const url = String(input);
    calls.push(url);
    const key = Object.keys(routes).find((pattern) => url.includes(pattern));
    const body = key ? routes[key] : { detail: 'not found' };
    return new Response(JSON.stringify(body), { status: key ? (options.status ?? 200) : 404 });
  });

  return { impl: impl as unknown as typeof fetch, calls };
};

describe('Khalti refunds', () => {
  const completedLookup = {
    pidx: 'PIDS-1',
    total_amount: 100000,
    status: 'Completed',
    transaction_id: 'KHALTI-TXN-9',
    fee: 0,
    refunded: false,
  };

  it('looks the payment up first, because a refund needs the transaction id', async () => {
    const { impl, calls } = khaltiFetch({
      'epayment/lookup': completedLookup,
      refund: { refunded: true, transaction_id: 'KHALTI-TXN-9' },
    });
    vi.stubGlobal('fetch', impl);

    await new KhaltiAdapter({ baseUrl: 'https://dev.khalti.com', secretKey: 'k' }).refund({
      paymentId: 'PIDS-1',
    });

    expect(calls[0]).toContain('/api/v2/epayment/lookup/');
  });

  // The pidx we stored is not the id the refund endpoint wants, and confusing the
  // two produces a refund that silently does nothing.
  it('refunds against the transaction id rather than the pidx', async () => {
    const { impl, calls } = khaltiFetch({
      'epayment/lookup': completedLookup,
      refund: { refunded: true, transaction_id: 'KHALTI-TXN-9' },
    });
    vi.stubGlobal('fetch', impl);

    await new KhaltiAdapter({ baseUrl: 'https://dev.khalti.com', secretKey: 'k' }).refund({
      paymentId: 'PIDS-1',
    });

    const refundCall = calls.find((url) => url.includes('refund')) ?? '';
    expect(refundCall).toContain('/api/merchant-transaction/KHALTI-TXN-9/refund/');
    expect(refundCall).not.toContain('PIDS-1');
  });

  it('converts a partial refund to paisa', async () => {
    const seen: Array<Record<string, unknown>> = [];
    const impl = vi.fn(async (input: string, init: RequestInit = {}) => {
      const url = String(input);
      if (url.includes('lookup')) return new Response(JSON.stringify(completedLookup));
      seen.push(JSON.parse(String(init.body || '{}')));
      return new Response(JSON.stringify({ refunded: true, transaction_id: 'KHALTI-TXN-9' }));
    });
    vi.stubGlobal('fetch', impl as unknown as typeof fetch);

    await new KhaltiAdapter({ baseUrl: 'https://dev.khalti.com', secretKey: 'k' }).refund({
      paymentId: 'PIDS-1',
      amount: 250.5,
    });

    expect(seen[0]).toEqual({ amount: 25050 });
  });

  it('omits the amount for a full refund', async () => {
    const seen: Array<Record<string, unknown>> = [];
    const impl = vi.fn(async (input: string, init: RequestInit = {}) => {
      const url = String(input);
      if (url.includes('lookup')) return new Response(JSON.stringify(completedLookup));
      seen.push(JSON.parse(String(init.body || '{}')));
      return new Response(JSON.stringify({ refunded: true }));
    });
    vi.stubGlobal('fetch', impl as unknown as typeof fetch);

    await new KhaltiAdapter({ baseUrl: 'https://dev.khalti.com', secretKey: 'k' }).refund({
      paymentId: 'PIDS-1',
    });

    expect(seen[0]).toEqual({});
  });

  it('reports a successful refund', async () => {
    const { impl } = khaltiFetch({
      'epayment/lookup': completedLookup,
      refund: { refunded: true, transaction_id: 'KHALTI-TXN-9' },
    });
    vi.stubGlobal('fetch', impl);

    const result = await refundResult(
      new KhaltiAdapter({ baseUrl: 'https://dev.khalti.com', secretKey: 'k' }),
    );

    expect(result.status).toBe('SUCCEEDED');
  });

  // Khalti states the refund API is not guaranteed idempotent. Re-checking before
  // sending is what stops a retry from paying the customer twice.
  it('does not send a second refund when the payment is already refunded', async () => {
    const { impl, calls } = khaltiFetch({
      'epayment/lookup': { ...completedLookup, status: 'Refunded', refunded: true },
      refund: { refunded: true },
    });
    vi.stubGlobal('fetch', impl);

    const result = await refundResult(
      new KhaltiAdapter({ baseUrl: 'https://dev.khalti.com', secretKey: 'k' }),
    );

    expect(calls.some((url) => url.includes('refund'))).toBe(false);
    expect(result.status).toBe('SUCCEEDED');
  });

  it('reports the provider message when the refund is rejected', async () => {
    const impl = vi.fn(async (input: string) => {
      const url = String(input);
      if (url.includes('lookup')) return new Response(JSON.stringify(completedLookup));
      return new Response(JSON.stringify({ detail: 'Amount exceeds refundable' }), {
        status: 400,
      });
    });
    vi.stubGlobal('fetch', impl as unknown as typeof fetch);

    const result = await new KhaltiAdapter({
      baseUrl: 'https://dev.khalti.com',
      secretKey: 'k',
    }).refund({
      paymentId: 'PIDS-1',
      amount: 999999,
    });

    expect(result.status).toBe('FAILED');
    expect(result.message).toMatch(/exceeds refundable/);
  });

  it('refuses when the payment was never completed, so no transaction id exists', async () => {
    const impl = vi.fn(
      async () => new Response(JSON.stringify({ pidx: 'PIDS-1', status: 'User canceled' })),
    );
    vi.stubGlobal('fetch', impl as unknown as typeof fetch);

    const result = await new KhaltiAdapter({
      baseUrl: 'https://dev.khalti.com',
      secretKey: 'k',
    }).refund({
      paymentId: 'PIDS-1',
    });

    expect(result.status).toBe('FAILED');
  });
});

describe('eSewa refunds', () => {
  // eSewa publishes no refund endpoint. Reporting success here would tell a
  // customer their money was returned while it sat in our account.
  it('reports that the refund must be completed in the eSewa merchant portal', async () => {
    const impl = vi.fn();
    vi.stubGlobal('fetch', impl as unknown as typeof fetch);

    const result = await refundResult(
      new EsewaAdapter({ baseUrl: 'https://rc-epay.esewa.com.np' }),
    );

    expect(result.status).toBe('REQUIRES_MANUAL_ACTION');
    expect(result.message).toMatch(/merchant portal/i);
  });

  it('does not call eSewa at all', async () => {
    const impl = vi.fn();
    vi.stubGlobal('fetch', impl as unknown as typeof fetch);

    await refundResult(new EsewaAdapter({ baseUrl: 'https://rc-epay.esewa.com.np' }));

    expect(impl).not.toHaveBeenCalled();
  });
});
