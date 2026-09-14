import { describe, expect, it, vi } from 'vitest';

import {
  buildEsewaSignature,
  decodeEsewaCallback,
  EsewaAdapter,
  verifyEsewaCallbackSignature,
} from '../esewa.adapter';
import { KhaltiAdapter } from '../khalti.adapter';

const ESEWA_TEST_SECRET = '8gBm/:&EnhH.1/q';

function stubFetchJson(payload: unknown, ok = true) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok,
      json: async () => payload,
    })),
  );
}

describe('EsewaAdapter', () => {
  it('builds a verifiable HMAC signature over the canonical fields', () => {
    const fields = {
      total_amount: '1650.00',
      transaction_uuid: 'order-123',
      product_code: 'EPAYTEST',
    };
    const signature = buildEsewaSignature(fields, ESEWA_TEST_SECRET);
    expect(signature).toMatch(/^[A-Za-z0-9+/=]{44}$/);

    const payload = {
      ...fields,
      transaction_code: '0007G36',
      status: 'COMPLETE',
      signature,
      signed_field_names: 'total_amount,transaction_uuid,product_code',
    };
    expect(verifyEsewaCallbackSignature(payload, ESEWA_TEST_SECRET)).toBe(true);
    expect(
      verifyEsewaCallbackSignature({ ...payload, total_amount: '1.00' }, ESEWA_TEST_SECRET),
    ).toBe(false);
  });

  it('round-trips the base64 success callback', () => {
    const fields = {
      total_amount: '1650.00',
      transaction_uuid: 'order-123',
      product_code: 'EPAYTEST',
    };
    const body = {
      ...fields,
      transaction_code: '0007G36',
      status: 'COMPLETE',
      signature: buildEsewaSignature(fields, ESEWA_TEST_SECRET),
      signed_field_names: 'total_amount,transaction_uuid,product_code',
    };
    const encoded = encodeURIComponent(Buffer.from(JSON.stringify(body)).toString('base64'));
    const decoded = decodeEsewaCallback(encoded);
    expect(decoded.transaction_uuid).toBe('order-123');
    expect(verifyEsewaCallbackSignature(decoded, ESEWA_TEST_SECRET)).toBe(true);
  });

  it('creates a UAT form intent with signed fields', async () => {
    const adapter = new EsewaAdapter();
    const intent = await adapter.createPaymentIntent('order-123', 1650, 'NPR', {});
    expect(intent.paymentId).toBe('order-123');
    expect(intent.redirectUrl).toContain('rc-epay.esewa.com.np');
    const fields = intent.rawResponse as Record<string, string>;
    expect(fields.total_amount).toBe('1650.00');
    expect(
      verifyEsewaCallbackSignature(
        { ...fields, signature: fields.signature, signed_field_names: fields.signed_field_names },
        ESEWA_TEST_SECRET,
      ),
    ).toBe(true);
  });

  it('maps status-check outcomes to verification results', async () => {
    const adapter = new EsewaAdapter();

    stubFetchJson({ status: 'COMPLETE', ref_id: '0007G36' });
    const completed = await adapter.verifyPayment('order-123', { totalAmount: 1650 });
    expect(completed.status).toBe('COMPLETED');
    expect(completed.transactionId).toBe('0007G36');

    stubFetchJson({ status: 'FULL_REFUND', ref_id: '0007G36' });
    const refunded = await adapter.verifyPayment('order-123', { totalAmount: 1650 });
    expect(refunded.status).toBe('REFUNDED');

    stubFetchJson({ status: 'PENDING', ref_id: null });
    const pending = await adapter.verifyPayment('order-123', { totalAmount: 1650 });
    expect(pending.status).toBe('PENDING');

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down');
      }),
    );
    const offline = await adapter.verifyPayment('order-123', { totalAmount: 1650 });
    expect(offline.status).toBe('PENDING');
    vi.unstubAllGlobals();
  });
});

describe('KhaltiAdapter', () => {
  const config = { secretKey: 'test-secret', baseUrl: 'https://dev.khalti.com' };

  it('throws a clear error when the secret key is missing', async () => {
    const adapter = new KhaltiAdapter({ secretKey: '', baseUrl: 'https://dev.khalti.com' });
    await expect(adapter.createPaymentIntent('order-1', 100, 'NPR', {})).rejects.toThrow(
      'KHALTI_SECRET_KEY is required',
    );
  });

  it('initiates in paisa and returns pidx + payment_url', async () => {
    stubFetchJson({ pidx: 'pidx-abc', payment_url: 'https://test-pay.khalti.com/?pidx=pidx-abc' });
    const adapter = new KhaltiAdapter(config);
    const intent = await adapter.createPaymentIntent('order-1', 1650, 'NPR', {
      orderNumber: 'CEL-1',
    });
    expect(intent.paymentId).toBe('pidx-abc');
    expect(intent.redirectUrl).toContain('pidx-abc');

    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    const sent = JSON.parse((fetchMock.mock.calls[0]?.[1] as { body: string }).body) as Record<
      string,
      unknown
    >;
    expect(sent.amount).toBe(165000);
    expect(sent.purchase_order_id).toBe('order-1');
    vi.unstubAllGlobals();
  });

  it('maps lookup outcomes to verification results', async () => {
    const adapter = new KhaltiAdapter(config);

    stubFetchJson({
      pidx: 'pidx-abc',
      total_amount: 165000,
      status: 'Completed',
      transaction_id: 'txn-9',
      fee: 0,
      refunded: false,
    });
    const completed = await adapter.verifyPayment('pidx-abc');
    expect(completed.status).toBe('COMPLETED');
    expect(completed.transactionId).toBe('txn-9');

    stubFetchJson({
      pidx: 'pidx-abc',
      total_amount: 0,
      status: 'Expired',
      transaction_id: null,
      fee: 0,
      refunded: false,
    });
    expect((await adapter.verifyPayment('pidx-abc')).status).toBe('FAILED');

    stubFetchJson({
      pidx: 'pidx-abc',
      total_amount: 0,
      status: 'Refunded',
      transaction_id: 'txn-9',
      fee: 0,
      refunded: true,
    });
    expect((await adapter.verifyPayment('pidx-abc')).status).toBe('REFUNDED');

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down');
      }),
    );
    expect((await adapter.verifyPayment('pidx-abc')).status).toBe('PENDING');
    vi.unstubAllGlobals();
  });
});
