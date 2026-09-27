import { describe, expect, it, vi } from 'vitest';

import { AppError } from '@celebs/shared-utils';

import { ProductController } from '../product.controller';

const validCreateBody = {
  name: 'Titanium Phone Pro',
  description: 'A phone.',
  price: 1200,
  categoryId: '11111111-1111-4111-8111-111111111111',
  subcategoryId: '22222222-2222-4222-8222-222222222222',
  colorVariants: [],
  skus: [],
  variantOptions: [],
  mainImages: [],
  tags: [],
} as never;

const makeRes = () => {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  return { res: { status, json, setHeader: vi.fn() } as never, status, json };
};

const makeReq = (over: Record<string, unknown> = {}) =>
  ({
    body: {},
    params: {},
    query: {},
    headers: {},
    ...over,
  }) as never;

describe('product.controller — thin controller (DTO parsing + delegation only)', () => {
  it('createProduct forwards actor/store context without deciding status or vendor', async () => {
    // The PUBLISHED→PENDING_REVIEW downgrade for non-publishers and the
    // platform (1P) store fallback now live in ProductService.createProduct.
    // The controller must hand over the RAW payload plus request context and
    // make no business decision of its own.
    const createProduct = vi.fn().mockResolvedValue({ id: 'p1' });
    const controller = new ProductController({ createProduct } as never);
    const { res, json, status } = makeRes();

    const req = makeReq({
      body: { ...(validCreateBody as object), status: 'published' },
      actor: {
        userId: 'admin-1',
        role: 'VENDOR',
        permissions: [],
        email: 'v@x.com',
        isEmailVerified: true,
      },
      store: { id: 'store-9', shopName: 'Nine Store', status: 'APPROVED' },
    });

    await controller.createProduct(req, res, vi.fn());

    expect(createProduct).toHaveBeenCalledTimes(1);
    const [payload, userId, vendorId, vendorName, role, permissions] = createProduct.mock
      .calls[0] as unknown as [
      Record<string, unknown>,
      string,
      string | null,
      string | undefined,
      string,
      string[],
    ];

    // Raw status forwarded untouched — the service owns the downgrade.
    expect(payload.status).toBe('published');
    // Seller store scoping + shop name are request context, not policy.
    expect(userId).toBe('admin-1');
    expect(vendorId).toBe('store-9');
    expect(vendorName).toBe('Nine Store');
    expect(role).toBe('VENDOR');
    // Permissions are forwarded so the service's can() sees the same grants
    // the controller used to read here.
    expect(permissions).toEqual([]);

    expect(status).toHaveBeenCalledWith(201);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('createProduct rejects a missing actor before touching the service', async () => {
    const createProduct = vi.fn();
    const controller = new ProductController({ createProduct } as never);
    const { res } = makeRes();
    const next = vi.fn();

    await controller.createProduct(makeReq({ body: validCreateBody }), res, next);

    expect(createProduct).not.toHaveBeenCalled();
    const err = next.mock.calls[0]?.[0] as AppError;
    expect(err.statusCode).toBe(401);
  });

  it('getProductReviewQueue coerces page/limit via Zod and never leaks NaN', async () => {
    const getProductReviewQueue = vi.fn().mockResolvedValue({ items: [] });
    const controller = new ProductController({ getProductReviewQueue } as never);
    const { res } = makeRes();

    await controller.getProductReviewQueue(makeReq({ query: {} }), res, vi.fn());
    expect(getProductReviewQueue).toHaveBeenLastCalledWith(1, 10);

    await controller.getProductReviewQueue(
      makeReq({ query: { page: '3', limit: '25' } }),
      res,
      vi.fn(),
    );
    expect(getProductReviewQueue).toHaveBeenLastCalledWith(3, 25);
  });

  it('getProductReviewQueue rejects out-of-range / non-numeric paging with a 400 ZodError', async () => {
    const getProductReviewQueue = vi.fn();
    const controller = new ProductController({ getProductReviewQueue } as never);

    for (const query of [{ page: '0' }, { page: 'abc' }, { limit: '0' }, { limit: '500' }]) {
      const { res } = makeRes();
      const next = vi.fn();
      await controller.getProductReviewQueue(makeReq({ query }), res, next);
      expect(next.mock.calls[0]?.[0]?.name, `query=${JSON.stringify(query)}`).toBe('ZodError');
    }

    expect(getProductReviewQueue).not.toHaveBeenCalled();
  });

  it('every controller action stays inside the thin-controller budget', () => {
    // AGENTS.md §12: controllers only validate DTOs, call the service and
    // return canonical envelopes (<40 lines, no business logic).
    const controller = new ProductController({} as never);
    const handlers = Object.entries(controller).filter(
      ([, value]) => typeof value === 'function',
    ) as Array<[string, (...args: unknown[]) => unknown]>;

    expect(handlers.length).toBeGreaterThan(0);
    for (const [name, handler] of handlers) {
      const lines = handler.toString().split('\n').length;
      expect(lines, `${name} is ${lines} lines`).toBeLessThan(45);
    }
  });
});
