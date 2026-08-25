import React from 'react';

import { logger } from '@celebs/shared-utils';

import type { FieldSpec } from '../ui-registry';

import { axiosClient } from '@/lib/axios/axios-client';

interface OptionItem {
  label: string;
  value: string;
  name?: string;
}

export function useOptions(field: FieldSpec) {
  const ds = field.dataSource;
  const isArray = Array.isArray(ds);
  const fetchUrl =
    typeof ds === 'object' && ds !== null && 'fetch' in ds
      ? String((ds as Record<string, unknown>).fetch)
      : undefined;

  const [asyncOpts, setAsyncOpts] = React.useState<Array<{ label: string; value: string }>>([]);

  React.useEffect(() => {
    if (!fetchUrl) return;
    let isMounted = true;
    (async () => {
      try {
        const res = await axiosClient.get(fetchUrl);
        const data = res.data;
        const values =
          data?.data?.values ??
          data?.values ??
          data?.data?.options ??
          data?.options ??
          data?.data ??
          [];
        const normalized = Array.isArray(values)
          ? values.map((v: unknown) => {
              if (typeof v === 'string') return { label: v, value: v };
              const obj = (v || {}) as OptionItem;
              const val = String(obj.value ?? obj.label ?? obj.name ?? '');
              return {
                label: String(obj.label ?? obj.name ?? val),
                value: val,
              };
            })
          : [];
        if (isMounted) setAsyncOpts(normalized);
      } catch (err) {
        logger.error({ error: err }, 'Failed to fetch field options');
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [fetchUrl]);

  return React.useMemo(() => {
    if (isArray) {
      return (ds as unknown[]).map((v: unknown) => {
        if (typeof v === 'string') return { label: v, value: v };
        const obj = (v || {}) as OptionItem;
        const val = String(obj.value ?? obj.label ?? obj.name ?? '');
        return {
          label: String(obj.label ?? obj.name ?? val),
          value: val,
        };
      });
    }
    return asyncOpts;
  }, [ds, isArray, asyncOpts]);
}
