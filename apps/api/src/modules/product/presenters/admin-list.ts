import { num, optStr, resolveCover, resolveStockTotal, str } from './shared';

export interface AdminListItem extends Record<string, unknown> {
  id: string;
  name: string;
  slug: string | null;
  price: number;
  discountedPrice?: number;
  cover?: string;
  status: string | null;
  stockTotal: number;
  vendorName: string | null;
  updatedAt: unknown;
}

/**
 * Manage-table row: one cover, one stock number, no galleries or drafts.
 * Replaces the full-blob rows the grid used to receive.
 */
export function formatAdminListItem(formatted: Record<string, unknown>): AdminListItem {
  return {
    id: str(formatted.id),
    name: str(formatted.name),
    slug: optStr(formatted.slug) ?? null,
    price: num(formatted.price),
    discountedPrice:
      typeof formatted.discountedPrice === 'number' ? formatted.discountedPrice : undefined,
    cover: resolveCover(formatted.mainImages, formatted.colorVariants),
    status: optStr(formatted.status) ?? null,
    stockTotal: resolveStockTotal(formatted.skus),
    vendorName: optStr(formatted.vendorName) ?? null,
    updatedAt: formatted.updatedAt ?? null,
  };
}
