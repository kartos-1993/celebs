import React from 'react';
import { useController } from 'react-hook-form';
import { ProductAPI } from '@/lib/axios-client';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@celebs/shared-ui/components/select';
import type { FieldSpec, UiProps } from '../UiRegistry';
import { LabelWithRequired, FieldError, rulesFrom } from './shared';

export function useOptions(field: FieldSpec) {
  const [opts, setOpts] = React.useState<
    Array<{ label: string; value: string }>
  >([]);
  React.useEffect(() => {
    (async () => {
      const ds = field.dataSource;
      if (!ds) return setOpts([]);
      if (Array.isArray(ds)) return setOpts(ds);
      if (ds.fetch) {
        const res = await ProductAPI.get(ds.fetch);
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
        setOpts(normalized);
      }
    })();
  }, [field.dataSource]);
  return opts;
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
      <Select value={f.value ?? ''} onValueChange={(v) => f.onChange(v)}>
        <SelectTrigger>
          <SelectValue placeholder={`Select ${field.label}`} />
        </SelectTrigger>
        <SelectContent>
          {opts.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldError message={fieldState.error?.message} />
    </div>
  );
}
