import { createHash } from 'node:crypto';

import { PRODUCT_STATUS } from '@celebs/shared-types';

import {
  getCachedJson,
  invalidateCacheKey,
  scanDelByPattern,
  setCachedJson,
} from '@/common/services/redis-cache.service';

export const PRODUCT_DETAIL_TTL_SECONDS = 300;
export const PRODUCT_LIST_TTL_SECONDS = 60;
export const STOREFRONT_HOME_KEY = 'storefront:home';

/** True when a status change flips storefront visibility either direction. */
export function isVisibilityFlip(oldStatus: unknown, nextStatus: unknown): boolean {
  return (oldStatus === PRODUCT_STATUS.PUBLISHED) !== (nextStatus === PRODUCT_STATUS.PUBLISHED);
}

export const productDetailKey = (id: string, isElevated = false): string =>
  `product:detail:${id}:${isElevated ? 'elev' : 'pub'}`;

/** Order-independent signature for public list queries. */
export function signListQuery(input: Record<string, unknown>): string {
  const canonical = Object.entries(input)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(
      ([key, value]) =>
        `${key}=${typeof value === 'object' ? JSON.stringify(value) : String(value)}`,
    )
    .join('&');
  return createHash('sha256').update(canonical).digest('hex').slice(0, 32);
}

export const productListKey = (signature: string): string => `product:list:${signature}`;

export async function readCachedJson<T>(key: string): Promise<T | null> {
  return getCachedJson<T>(key);
}

export async function writeCachedJson(
  key: string,
  data: unknown,
  ttlSeconds: number,
): Promise<void> {
  await setCachedJson(key, data, ttlSeconds);
}

/**
 * Purge helpers. Fire-and-forget by contract: callers MUST `void` them and
 * never await inside transactions — Redis is a best-effort mirror here.
 */
export function purgeProductDetail(id: string): void {
  void Promise.allSettled([
    invalidateCacheKey(productDetailKey(id, false)),
    invalidateCacheKey(productDetailKey(id, true)),
  ]);
}

export function purgeProductHome(): void {
  void invalidateCacheKey(STOREFRONT_HOME_KEY);
}

export function purgeProduct(id: string): void {
  purgeProductDetail(id);
  purgeProductHome();
}

/**
 * Sweep hash-keyed list entries. Call ONLY on visibility flips
 * (publish/archive/toggle/approve) and end-of-run seed hygiene — never per
 * order or per content edit. NOTE (month-3 watch): if cursor pagination
 * arrives, per-cursor keys multiply and this should move to a generation
 * counter instead of per-query keying.
 */
export function purgeProductLists(): void {
  void scanDelByPattern('product:list:*', 100);
}

/**
 * Batch purge for bulk operations: process all items first, then call once
 * at the end — never per item inside the loop.
 */
export function purgeProducts(ids: string[]): void {
  const unique = [...new Set(ids.filter(Boolean))];
  void Promise.allSettled([
    ...unique.flatMap((id) => [
      invalidateCacheKey(productDetailKey(id, false)),
      invalidateCacheKey(productDetailKey(id, true)),
    ]),
    invalidateCacheKey(STOREFRONT_HOME_KEY),
    scanDelByPattern('product:list:*', 100),
  ]);
}
