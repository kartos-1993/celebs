import React from 'react';
import { useController } from 'react-hook-form';
import { ProductAPI } from '@/lib/axios-client';
import { SearchableSelect } from '@celebs/shared-ui/components/searchable-select';
import type { FieldSpec, UiProps } from '../UiRegistry';
import { LabelWithRequired, FieldError, rulesFrom } from './shared';

export function useOptions(field: FieldSpec) {
  const ds = field.dataSource;
  const isArray = Array.isArray(ds);
  const fetchUrl = typeof ds === 'object' && ds !== null && 'fetch' in ds ? (ds as any).fetch : undefined;

  const [asyncOpts, setAsyncOpts] = React.useState<
    Array<{ label: string; value: string }>
  >([]);

  React.useEffect(() => {
    if (!fetchUrl) return;
    let isMounted = true;
    (async () => {
      try {
        const res = await ProductAPI.get(fetchUrl);
        const data = res.data;
        const values =
          data?.data?.values ??
          data?.values ??
          data?.data?.options ??
          data?.options ??
          data?.data ??
          [];
        const normalized = Array.isArray(values)
          ? values.map((v: any) =>
              typeof v === 'string'
                ? { label: v, value: v }
                : {
                    label: v.label ?? v.name ?? String(v.value),
                    value: v.value ?? v.label ?? v.name,
                  },
            )
          : [];
        if (isMounted) setAsyncOpts(normalized);
      } catch (err) {
        console.error('Failed to fetch field options:', err);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [fetchUrl]);

  return React.useMemo(() => {
    if (isArray) {
      return (ds as any[]).map((v: any) =>
        typeof v === 'string'
          ? { label: v, value: v }
          : {
              label: v.label ?? v.name ?? String(v.value),
              value: v.value ?? v.label ?? v.name,
            },
      );
    }
    return asyncOpts;
  }, [ds, isArray, asyncOpts]);
}

export function DropdownInputField({ field, control }: UiProps) {
  const { field: f, fieldState } = useController({
    name: field.name,
    control,
    rules: rulesFrom(field),
  });
  const opts = useOptions(field);
  return (
    <div className="space-y-1">
      <LabelWithRequired required={field.required}>
        {field.label}
      </LabelWithRequired>
      <SearchableSelect
        options={opts}
        value={f.value ?? ''}
        onChange={(val) => f.onChange(val)}
        placeholder={`Select ${field.label}`}
      />
      <FieldError message={fieldState.error?.message} />
    </div>
  );
}
