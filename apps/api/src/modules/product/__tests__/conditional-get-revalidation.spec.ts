import express, { Request, Response } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { expectQuotedETag } from '../../../../tests/support/http-headers';
import { sendPublicCachedWithETag } from '../../../common/utils/response.util';

describe('Conditional GET Revalidation and RFC 9110 Quoted ETag Contract', () => {
  function createTestApp() {
    const app = express();
    app.set('etag', false); // Express auto-etag disabled

    const sampleCatalog = [
      { id: 'prod-1', name: 'Raw Denim Jacket', price: 4500 },
      { id: 'prod-2', name: 'Slim Fit Jeans', price: 3200 },
    ];

    app.get('/catalog', (req: Request, res: Response) => {
      sendPublicCachedWithETag(
        req,
        res,
        sampleCatalog,
        { maxAge: 60, sMaxAge: 300, swr: 120 },
        'Catalog retrieved',
      );
    });

    return app;
  }

  it('emits RFC 9110 compliant quoted ETag and public cache directives on initial GET', async () => {
    const app = createTestApp();
    const res = await request(app).get('/catalog');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
    expectQuotedETag(res);
    expect(res.headers['cache-control']).toBe(
      'public, max-age=60, s-maxage=300, stale-while-revalidate=120',
    );
    expect(res.headers['vary']).toContain('Accept-Encoding');
  });

  it('returns HTTP 304 Not Modified with empty body when client provides matching If-None-Match', async () => {
    const app = createTestApp();
    const initialRes = await request(app).get('/catalog');
    const etag = initialRes.headers['etag'];

    expect(etag).toBeDefined();

    const revalidateRes = await request(app).get('/catalog').set('If-None-Match', etag);

    expect(revalidateRes.status).toBe(304);
    expect(revalidateRes.text).toBe('');
    expect(revalidateRes.headers['etag']).toBe(etag);
    expect(revalidateRes.headers['cache-control']).toContain('public');
  });

  it('returns HTTP 200 with fresh body when client provides outdated If-None-Match', async () => {
    const app = createTestApp();
    const revalidateRes = await request(app)
      .get('/catalog')
      .set('If-None-Match', '"outdated-stale-hash"');

    expect(revalidateRes.status).toBe(200);
    expect(revalidateRes.body.success).toBe(true);
    expect(revalidateRes.body.data).toHaveLength(2);
  });
});
