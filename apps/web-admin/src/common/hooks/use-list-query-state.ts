import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

interface ListQueryStateOptions<Tab extends string, Sort extends string> {
  defaultTab: Tab;
  allowedTabs: ReadonlyArray<Tab>;
  defaultSort: Sort;
  allowedSorts: ReadonlyArray<Sort>;
  defaultLimit?: number;
  allowedLimits?: ReadonlyArray<number>;
  /** Free-form string filters (e.g. vendor, category, stock) persisted as-is. */
  extraKeys?: ReadonlyArray<string>;
}

const DEFAULT_LIMITS = [10, 20, 50] as const;
const EMPTY_EXTRAS: ReadonlyArray<string> = [];

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : fallback;
}

/**
 * URL-persistent list state: page, limit, q, tab, sort + free-form extras.
 * Source of truth is the query string (shareable, survives refresh/back).
 * Mutations use `replace` and reset page to 1 when a filter changes.
 */
export function useListQueryState<Tab extends string, Sort extends string>(
  options: ListQueryStateOptions<Tab, Sort>,
) {
  const {
    defaultTab,
    allowedTabs,
    defaultSort,
    allowedSorts,
    defaultLimit = 10,
    allowedLimits = DEFAULT_LIMITS,
    extraKeys = EMPTY_EXTRAS,
  } = options;
  const [searchParams, setSearchParams] = useSearchParams();

  const page = useMemo(() => parsePositiveInt(searchParams.get('page'), 1), [searchParams]);
  const limit = useMemo(() => {
    const parsed = parsePositiveInt(searchParams.get('limit'), defaultLimit);
    return allowedLimits.includes(parsed) ? parsed : defaultLimit;
  }, [searchParams, defaultLimit, allowedLimits]);
  const q = useMemo(() => searchParams.get('q') ?? '', [searchParams]);
  const tab = useMemo(() => {
    const raw = searchParams.get('tab') as Tab | null;
    return raw && allowedTabs.includes(raw) ? raw : defaultTab;
  }, [searchParams, allowedTabs, defaultTab]);
  const sort = useMemo(() => {
    const raw = searchParams.get('sort') as Sort | null;
    return raw && allowedSorts.includes(raw) ? raw : defaultSort;
  }, [searchParams, allowedSorts, defaultSort]);
  const extras = useMemo(() => {
    const record: Record<string, string> = {};
    for (const key of extraKeys) {
      const value = searchParams.get(key);
      if (value) record[key] = value;
    }
    return record;
  }, [searchParams, extraKeys]);

  const update = useCallback(
    (patch: Record<string, string | undefined>, resetPage: boolean) => {
      const next = new URLSearchParams(searchParams);
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined || value === '') next.delete(key);
        else next.set(key, value);
      }
      if (resetPage) next.delete('page');
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const setPage = useCallback(
    (nextPage: number) => update({ page: nextPage <= 1 ? undefined : String(nextPage) }, false),
    [update],
  );
  const setLimit = useCallback(
    (nextLimit: number) => update({ limit: String(nextLimit) }, true),
    [update],
  );
  const setQ = useCallback(
    (value: string) => update({ q: value.trim() || undefined }, true),
    [update],
  );
  const setTab = useCallback((value: Tab) => update({ tab: value }, true), [update]);
  const setSort = useCallback((value: Sort) => update({ sort: value }, true), [update]);
  const setExtra = useCallback(
    (key: string, value: string) =>
      update({ [key]: value === 'all' || value === '' ? undefined : value }, false),
    [update],
  );
  const setExtras = useCallback(
    (patch: Record<string, string>) => {
      const normalized: Record<string, string | undefined> = {};
      for (const [key, value] of Object.entries(patch)) {
        normalized[key] = value === 'all' || value === '' ? undefined : value;
      }
      update(normalized, false);
    },
    [update],
  );

  return {
    page,
    limit,
    q,
    tab,
    sort,
    extras,
    setPage,
    setLimit,
    setQ,
    setTab,
    setSort,
    setExtra,
    setExtras,
  };
}
