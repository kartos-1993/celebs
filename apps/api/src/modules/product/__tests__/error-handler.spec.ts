import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { AppError, ErrorCode, HTTPSTATUS } from '@celebs/shared-utils';

import { Prisma } from '@/config/db.prisma';
import { errorHandler } from '@/middlewares/error-handler';

const invoke = (error: unknown, path = '/products') => {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  const req = { path, method: 'POST' } as never;
  const res = {
    headersSent: false,
    getHeader: vi.fn().mockReturnValue('req-123'),
    setHeader: vi.fn(),
    status,
    json,
  } as unknown as Parameters<typeof errorHandler>[1] & {
    status: ReturnType<typeof vi.fn>;
    json: never;
  };
  const next = vi.fn();
  (errorHandler as (...args: unknown[]) => unknown)(error, req, res, next);
  const body = json.mock.calls[0]?.[0] as Record<string, unknown>;
  return { status, json, body, statusCode: status.mock.calls[0]?.[0] as number };
};

describe('error-handler shape mapping', () => {
  it('maps SyntaxError(status 400) to INVALID_JSON_FORMAT with envelope fields', () => {
    const err = new SyntaxError('Unexpected token') as SyntaxError & { status?: number };
    err.status = 400;
    const { statusCode, body } = invoke(err);
    expect(statusCode).toBe(HTTPSTATUS.BAD_REQUEST);
    expect(body).toMatchObject({
      success: false,
      message: 'Invalid JSON format, please check your request body',
      errorCode: ErrorCode.INVALID_JSON_FORMAT,
      data: null,
      requestId: 'req-123',
    });
    expect(typeof body.timestamp).toBe('string');
  });

  it('maps ZodError to VALIDATION_ERROR with per-field errors and first message', () => {
    const parsed = z.object({ name: z.string().min(2) }).safeParse({});
    expect(parsed.success).toBe(false);
    const { statusCode, body } = invoke(parsed.success ? new Error() : parsed.error);
    expect(statusCode).toBe(HTTPSTATUS.BAD_REQUEST);
    expect(body).toMatchObject({ success: false, errorCode: ErrorCode.VALIDATION_ERROR });
    expect(body.errors as unknown[]).toHaveLength(1);
    expect((body.errors as Array<{ field: string }>)[0]?.field).toBe('name');
  });

  it('passes AppError through with status + code, omitting `errors` when there are no details', () => {
    // A plain domain AppError keeps the exact pre-existing envelope. The
    // `errors` array is additive and ABSENT (not empty) when no details exist.
    const { statusCode, body } = invoke(
      new AppError('Some opaque failure', HTTPSTATUS.BAD_REQUEST, ErrorCode.VALIDATION_ERROR),
    );
    expect(statusCode).toBe(HTTPSTATUS.BAD_REQUEST);
    expect(body).toMatchObject({
      success: false,
      message: 'Some opaque failure',
      errorCode: ErrorCode.VALIDATION_ERROR,
      data: null,
      requestId: 'req-123',
    });
    expect(body).not.toHaveProperty('errors');
  });

  it('serializes AppError `details` into the additive errors array alongside message/errorCode', () => {
    // EXACT response shape for a duplicate-SKU rejection:
    // {
    //   success: false,
    //   message: '<same string as before>',
    //   errorCode: 'VALIDATION_ERROR',
    //   errors: [ { field: 'skus', message: '<same string>' } ],
    //   data: null,
    //   requestId: 'req-123',
    //   timestamp: '<ISO>'
    // }
    const message = 'A record with this sku already exists. Please use a unique value.';
    const { statusCode, body } = invoke(
      Object.assign(new AppError(message, HTTPSTATUS.BAD_REQUEST, ErrorCode.VALIDATION_ERROR), {
        details: [{ field: 'skus', message }],
      }),
    );

    expect(statusCode).toBe(HTTPSTATUS.BAD_REQUEST);
    expect(body).toEqual({
      success: false,
      message,
      errorCode: ErrorCode.VALIDATION_ERROR,
      errors: [{ field: 'skus', message }],
      data: null,
      requestId: 'req-123',
      timestamp: expect.any(String) as unknown as string,
    });
  });

  it('supports multiple details (one per published-variant lock) and fieldless entries', () => {
    const msg = 'Cannot remove variants from an already published product.';
    const { body } = invoke(
      Object.assign(new AppError(msg, HTTPSTATUS.BAD_REQUEST, ErrorCode.INVALID_REQUEST), {
        details: [{ field: 'Red/S', message: msg }, { message: msg }],
      }),
    );
    expect(body.errors).toEqual([{ field: 'Red/S', message: msg }, { message: msg }]);
    // The top-level message/errorCode pair is untouched by the addition.
    expect(body.message).toBe(msg);
    expect(body.errorCode).toBe(ErrorCode.INVALID_REQUEST);
  });

  it('drops malformed detail entries instead of echoing them', () => {
    const { body } = invoke(
      Object.assign(new AppError('Bad', HTTPSTATUS.BAD_REQUEST, ErrorCode.VALIDATION_ERROR), {
        details: [
          { message: 'keeper' },
          { field: 'onlyField' },
          null,
          'string',
          { message: 42 },
          { field: '', message: 'blank field is dropped' },
        ],
      }),
    );
    expect(body.errors).toEqual([{ message: 'keeper' }, { message: 'blank field is dropped' }]);
  });

  it('ignores a non-array `details` entirely', () => {
    const { body } = invoke(
      Object.assign(new AppError('Bad', HTTPSTATUS.BAD_REQUEST, ErrorCode.VALIDATION_ERROR), {
        details: 'nope',
      }),
    );
    expect(body).not.toHaveProperty('errors');
  });

  it('serializes details on duck-typed { statusCode, errorCode } errors too', () => {
    const { statusCode, body } = invoke({
      statusCode: 403,
      errorCode: ErrorCode.FORBIDDEN_RESOURCE,
      message: 'Forbidden: You do not own this product',
      details: [{ field: 'Red/S', message: 'locked' }],
    });
    expect(statusCode).toBe(403);
    expect(body).toMatchObject({
      success: false,
      message: 'Forbidden: You do not own this product',
      errorCode: ErrorCode.FORBIDDEN_RESOURCE,
      errors: [{ field: 'Red/S', message: 'locked' }],
    });
  });

  it('maps duck-typed { statusCode, errorCode } without instanceof AppError', () => {
    const { statusCode, body } = invoke({
      statusCode: 403,
      errorCode: ErrorCode.FORBIDDEN_RESOURCE,
      message: 'Forbidden: You do not own this product',
    });
    expect(statusCode).toBe(403);
    expect(body).toMatchObject({
      success: false,
      message: 'Forbidden: You do not own this product',
      errorCode: ErrorCode.FORBIDDEN_RESOURCE,
    });
    expect(body).not.toHaveProperty('errors');
  });

  it('maps Prisma P2002 array target to field list message', () => {
    const { statusCode, body } = invoke(
      new Prisma.PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: 'test',
        meta: { target: ['sku'] },
      }),
    );
    expect(statusCode).toBe(HTTPSTATUS.BAD_REQUEST);
    expect(body).toMatchObject({
      success: false,
      message: 'A record with this sku already exists. Please use a unique value.',
      errorCode: ErrorCode.VALIDATION_ERROR,
    });
  });

  it('maps Prisma P2002 string target by stripping _key suffix and table prefix', () => {
    const { body } = invoke(
      new Prisma.PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: 'test',
        meta: { target: 'ProductInventory_sku_key' },
      }),
    );
    expect(body.message).toBe('A record with this sku already exists. Please use a unique value.');
  });

  it('maps Prisma P2025/P2003/P2014 to their canonical envelopes', () => {
    const notFound = invoke(
      new Prisma.PrismaClientKnownRequestError('Missing', {
        code: 'P2025',
        clientVersion: 'test',
      }),
    );
    expect(notFound.statusCode).toBe(HTTPSTATUS.NOT_FOUND);
    expect(notFound.body).toMatchObject({ errorCode: ErrorCode.RESOURCE_NOT_FOUND });

    const fk = invoke(
      new Prisma.PrismaClientKnownRequestError('FK', { code: 'P2003', clientVersion: 'test' }),
    );
    expect(fk.statusCode).toBe(HTTPSTATUS.BAD_REQUEST);
    expect(fk.body).toMatchObject({ errorCode: ErrorCode.INVALID_REQUEST });

    const ref = invoke(
      new Prisma.PrismaClientKnownRequestError('Ref', { code: 'P2014', clientVersion: 'test' }),
    );
    expect(ref.statusCode).toBe(HTTPSTATUS.BAD_REQUEST);
    expect(ref.body).toMatchObject({ errorCode: ErrorCode.INVALID_REQUEST });
  });

  it('maps unknown errors to 500 INTERNAL_SERVER_ERROR without leaking internals', () => {
    // Intentionally opaque: an unexpected Error is never echoed, and the
    // additive `details` pass-through does not apply to it either.
    const { statusCode, body } = invoke(new Error('column "secret" does not exist'));
    expect(statusCode).toBe(HTTPSTATUS.INTERNAL_SERVER_ERROR);
    expect(body).toMatchObject({
      success: false,
      message: 'Internal Server Error',
      errorCode: ErrorCode.INTERNAL_SERVER_ERROR,
      data: null,
    });
    expect(body).not.toHaveProperty('errors');
  });
});
