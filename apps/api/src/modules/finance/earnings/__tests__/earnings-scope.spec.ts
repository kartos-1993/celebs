import type { Request } from 'express';
import { describe, expect, it } from 'vitest';

import { resolveVendorForRead } from '../earnings-scope';

/**
 * Which seller's earnings a caller may read.
 *
 * The ordering is the whole contract: a caller's own store wins over the
 * platform prompt, because a superadmin who owns a store is a seller first. Only
 * a platform actor with no store of their own is asked to name one.
 *
 * These were previously covered only through the endpoint, where a mistake in
 * this ordering shows up as an unexplained 400 or, worse, as one seller's figures
 * served to another.
 */

const requestFor = (input: {
  role?: string;
  storeId?: string | null;
  vendorId?: string;
  permissions?: string[];
}) =>
  ({
    actor: {
      userId: 'user-1',
      sessionId: 'sess-1',
      email: 'a@b.c',
      role: input.role ?? 'CUSTOMER',
      permissions: (input.permissions ?? []) as never,
      isEmailVerified: true,
    },
    store:
      input.storeId === null || input.storeId === undefined
        ? null
        : { id: input.storeId, shopName: 'Shop', status: 'APPROVED', isOwner: true },
    query: input.vendorId ? { vendorId: input.vendorId } : {},
  }) as unknown as Request;

const PLATFORM_VIEW = 'finance:platform:view';

describe('resolveVendorForRead', () => {
  it('gives a seller their own store', () => {
    const req = requestFor({ role: 'VENDOR', storeId: 'store-1' });

    expect(resolveVendorForRead(req)).toBe('store-1');
  });

  // The regression this ordering exists for: a superadmin who owns a store must
  // not be told to name a seller when they already are one.
  it('gives a platform actor with a store their own store', () => {
    const req = requestFor({
      role: 'SUPERADMIN',
      storeId: 'store-1',
      permissions: [PLATFORM_VIEW],
    });

    expect(resolveVendorForRead(req)).toBe('store-1');
  });

  it('asks a platform actor without a store to name a seller', () => {
    const req = requestFor({ role: 'ADMIN', storeId: null, permissions: [PLATFORM_VIEW] });

    expect(() => resolveVendorForRead(req)).toThrow(/Name the seller/);
  });

  it('lets a platform actor read any seller they name', () => {
    const req = requestFor({
      role: 'SUPERADMIN',
      storeId: null,
      permissions: [PLATFORM_VIEW],
      vendorId: 'seller-9',
    });

    expect(resolveVendorForRead(req)).toBe('seller-9');
  });

  // Anti-enumeration: naming someone else must not confirm they exist.
  it('gives a seller their own figures when they name another seller', () => {
    const req = requestFor({ role: 'VENDOR', storeId: 'store-1', vendorId: 'someone-else' });

    expect(resolveVendorForRead(req)).toBe('store-1');
  });

  it('refuses a caller with neither a store nor platform access', () => {
    const req = requestFor({ role: 'CUSTOMER', storeId: null });

    expect(() => resolveVendorForRead(req)).toThrow(/not associated with a seller store/);
  });

  it('refuses an unauthenticated caller', () => {
    const req = { actor: null, store: null, query: {} } as unknown as Request;

    expect(() => resolveVendorForRead(req)).toThrow(/Not signed in/);
  });
});
