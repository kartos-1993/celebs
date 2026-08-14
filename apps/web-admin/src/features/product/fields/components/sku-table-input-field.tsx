import React from 'react';
import { useController, useFormContext, useWatch } from 'react-hook-form';
import { axiosClient } from '@/lib/axios/axios-client';
import { Checkbox } from '@celebs/shared-ui/components/checkbox';
import { Button } from '@celebs/shared-ui/components/button';
import { Sparkles } from 'lucide-react';
import { Input } from '@celebs/shared-ui/components/input';
import { NumberInput } from '@celebs/shared-ui/components/number-input';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@celebs/shared-ui/components/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@celebs/shared-ui/components/table';
import type { UiProps } from '../ui-registry';
import { FieldError } from './shared';
import {
  generateCollisionProofBaseSku,
  cleanSkuAttributeCode,
} from '../../utils/generate-sku-helpers';

interface VariantDataSource {
  labels?: Record<string, Record<string, string>>;
  variants?: Array<{ key?: string; name?: string; label?: string; value?: string }>;
  fetch?: string;
  params?: Record<string, unknown>;
}

export function SkuTableInputField({ field }: UiProps) {
  const { control: formControl, setValue, getValues } = useFormContext();
  const ds = field.dataSource as VariantDataSource | undefined;
  const labelsMap = React.useMemo(
    () => (ds?.labels ?? {}) as Record<string, Record<string, string>>,
    [ds?.labels],
  );
  const labelOf = React.useCallback(
    (axisKey: string, value: string) => labelsMap?.[axisKey]?.[String(value)] ?? String(value),
    [labelsMap],
  );

  // Static variants are derived synchronously (no effect, no re-render loop)
  const staticVariantMeta = React.useMemo(() => {
    if (Array.isArray(ds?.variants)) {
      return ds.variants.map((a) => ({
        key: a.key ?? a.name ?? a.value ?? '',
        label: a.label ?? a.name ?? a.key ?? String(a.value ?? ''),
      }));
    }
    return undefined;
  }, [ds?.variants]);

  // Async variant source (schema-driven fetch) — stable, serializable deps
  const fetchUrl = typeof ds?.fetch === 'string' ? ds.fetch : undefined;
  const fetchParamsKey = React.useMemo(() => JSON.stringify(ds?.params ?? {}), [ds?.params]);
  const fetchParamsRef = React.useRef(ds?.params);
  fetchParamsRef.current = ds?.params;

  const [asyncVariantMeta, setAsyncVariantMeta] = React.useState<Array<{
    key: string;
    label: string;
  }> | null>(null);

  React.useEffect(() => {
    if (staticVariantMeta || !fetchUrl) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await axiosClient.get(fetchUrl, { params: fetchParamsRef.current });
        const data = res.data;
        const raw =
          data?.data?.variants ??
          data?.variants ??
          data?.data?.axes ??
          data?.axes ??
          data?.data ??
          data;
        const list = Array.isArray(raw) ? raw : [];
        const normalized = list.map((a: Record<string, unknown>) => ({
          key: String(a.key ?? a.name ?? a.value ?? ''),
          label: String(a.label ?? a.name ?? a.key ?? a.value ?? ''),
        }));
        if (!cancelled) setAsyncVariantMeta(normalized);
      } catch (_error) {
        // Keep the empty variant list; the default-SKU table still renders.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchUrl, fetchParamsKey, staticVariantMeta]);

  const variantMeta = staticVariantMeta ?? asyncVariantMeta ?? [];
  const watchedValues = useWatch({
    control: formControl,
    name: variantMeta.map((a) => a.key),
  }) as unknown[] | undefined;

  const variantSelections = variantMeta.map((a, idx) => {
    const v = watchedValues?.[idx];
    if (Array.isArray(v)) {
      const arr = v.map((x) => {
        if (typeof x === 'string') return x;
        if (typeof x === 'object' && x !== null) {
          const obj = x as Record<string, unknown>;
          return String(obj.value ?? obj.label ?? x);
        }
        return String(x);
      });
      return { key: a.key, label: a.label, values: arr };
    }
    if (typeof v === 'string' && v) {
      const parts = v
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      return { key: a.key, label: a.label, values: parts.length ? parts : [v] };
    }
    return { key: a.key, label: a.label, values: [] as string[] };
  });

  const variants = variantSelections.filter((a) => a.values.length > 0);

  const sanitize = (s: string) =>
    String(s)
      .replace(/\./g, '_')
      .replace(/\[/g, '(')
      .replace(/\]/g, ')')
      .replace(/\s+/g, ' ')
      .trim();

  const pathFor = (...parts: string[]) => ['sku', 'variants', ...parts.map(sanitize)].join('.');

  const [applyAll, setApplyAll] = React.useState<{
    price?: string;
    specialPrice?: string;
    stock?: string;
    sellerSku?: string;
    freeItems?: string;
    available?: boolean;
  }>({});
  const [applyScope, setApplyScope] = React.useState<string>('ALL');

  const scopeOptions = React.useMemo(() => {
    const opts: Array<{ value: string; label: string }> = [{ value: 'ALL', label: 'All Variants' }];
    if (variants.length === 1) {
      for (const v of variants[0].values)
        opts.push({
          value: `${variants[0].key}::${v}`,
          label: `${variants[0].label}: ${labelOf(variants[0].key, v)}`,
        });
    } else if (variants.length >= 2) {
      for (const a of variants[0].values) {
        for (const b of variants[1].values)
          opts.push({
            value: `${variants[0].key}::${a}||${variants[1].key}::${b}`,
            label: `${variants[0].label}: ${labelOf(variants[0].key, a)} × ${variants[1].label}: ${labelOf(variants[1].key, b)}`,
          });
      }
    }
    return opts;
  }, [variants, labelOf]);

  const matchesScope = (aKey: string, aVal: string, bKey?: string, bVal?: string) => {
    if (applyScope === 'ALL') return true;
    if (!applyScope.includes('||')) {
      const [k, v] = applyScope.split('::');
      return k === aKey && v === aVal;
    }
    const [p1, p2] = applyScope.split('||');
    const [k1, v1] = p1.split('::');
    const [k2, v2] = p2.split('::');
    return (
      (k1 === aKey && v1 === aVal && k2 === bKey && v2 === bVal) ||
      (k2 === aKey && v2 === aVal && k1 === bKey && v1 === bVal)
    );
  };

  const applyToAll = () => {
    if (variants.length === 0) return;
    const fill = (name: string, value: unknown) => setValue(name, value, { shouldDirty: true });
    if (variants.length === 1) {
      for (const opt of variants[0].values) {
        if (!matchesScope(variants[0].key, opt)) continue;
        if (applyAll.price != null) fill(pathFor(variants[0].key, opt, 'price'), applyAll.price);
        if (applyAll.specialPrice != null)
          fill(pathFor(variants[0].key, opt, 'specialPrice'), applyAll.specialPrice);
        if (applyAll.stock != null) fill(pathFor(variants[0].key, opt, 'stock'), applyAll.stock);
        if (applyAll.sellerSku != null)
          fill(pathFor(variants[0].key, opt, 'sellerSku'), applyAll.sellerSku);
        if (applyAll.freeItems != null)
          fill(pathFor(variants[0].key, opt, 'freeItems'), applyAll.freeItems);
        if (applyAll.available != null)
          fill(pathFor(variants[0].key, opt, 'available'), applyAll.available);
      }
    } else if (variants.length >= 2) {
      for (const opt1 of variants[0].values) {
        for (const opt2 of variants[1].values) {
          if (!matchesScope(variants[0].key, opt1, variants[1].key, opt2)) continue;
          if (applyAll.price != null)
            fill(pathFor(variants[0].key, opt1, variants[1].key, opt2, 'price'), applyAll.price);
          if (applyAll.specialPrice != null)
            fill(
              pathFor(variants[0].key, opt1, variants[1].key, opt2, 'specialPrice'),
              applyAll.specialPrice,
            );
          if (applyAll.stock != null)
            fill(pathFor(variants[0].key, opt1, variants[1].key, opt2, 'stock'), applyAll.stock);
          if (applyAll.sellerSku != null)
            fill(
              pathFor(variants[0].key, opt1, variants[1].key, opt2, 'sellerSku'),
              applyAll.sellerSku,
            );
          if (applyAll.freeItems != null)
            fill(
              pathFor(variants[0].key, opt1, variants[1].key, opt2, 'freeItems'),
              applyAll.freeItems,
            );
          if (applyAll.available != null)
            fill(
              pathFor(variants[0].key, opt1, variants[1].key, opt2, 'available'),
              applyAll.available,
            );
        }
      }
    }
  };

  const handleAutoGenerateSkus = () => {
    const fill = (name: string, value: unknown) =>
      setValue(name, value, { shouldDirty: true, shouldValidate: true });

    const departmentHint = String(getValues('categoryPath') || getValues('categoryId') || '');
    const brand = getValues('brand');

    if (variants.length === 0) {
      fill('sku.default.sellerSku', generateCollisionProofBaseSku(brand, departmentHint));
    } else if (variants.length === 1) {
      for (const opt of variants[0].values) {
        fill(
          pathFor(variants[0].key, opt, 'sellerSku'),
          generateCollisionProofBaseSku(brand, departmentHint),
        );
      }
    } else if (variants.length >= 2) {
      for (const opt1 of variants[0].values) {
        for (const opt2 of variants[1].values) {
          fill(
            pathFor(variants[0].key, opt1, variants[1].key, opt2, 'sellerSku'),
            generateCollisionProofBaseSku(brand, departmentHint),
          );
        }
      }
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">{field.label}</div>
          <div className="text-sm text-muted-foreground">
            {variants.length
              ? `SKU Matrix generated from: ${variants.map((a) => a.label).join(' × ')}`
              : 'No variants selected. Using default SKU.'}
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs h-8"
          onClick={handleAutoGenerateSkus}
        >
          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          Auto-Generate SKUs
        </Button>
      </div>
      {variants.length === 0 && (
        <div className="border rounded-md overflow-x-auto mb-4">
          <Table className="w-full min-w-[650px] table-fixed text-[11px] sm:text-xs">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[15%] px-1.5 py-2">
                  Price <span className="text-red-500 ml-0.5">*</span>
                </TableHead>
                <TableHead className="w-[18%] px-1.5 py-2">Special Price</TableHead>
                <TableHead className="w-[12%] px-1.5 py-2">Stock</TableHead>
                <TableHead className="w-[30%] px-1.5 py-2">SellerSKU</TableHead>
                <TableHead className="w-[12%] px-1.5 py-2">Free</TableHead>
                <TableHead className="w-[13%] px-1.5 py-2">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="p-1.5">
                  <VariantFieldInput name="sku.default.price" type="number" required />
                </TableCell>
                <TableCell className="p-1.5">
                  <VariantFieldInput name="sku.default.specialPrice" type="number" />
                </TableCell>
                <TableCell className="p-1.5">
                  <VariantFieldInput name="sku.default.stock" type="number" />
                </TableCell>
                <TableCell className="p-1.5">
                  <VariantFieldInput name="sku.default.sellerSku" />
                </TableCell>
                <TableCell className="p-1.5">
                  <VariantFieldInput name="sku.default.freeItems" type="number" />
                </TableCell>
                <TableCell className="p-1.5">
                  <VariantAvailability name="sku.default.available" />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}

      {variants.length > 0 && (
        <div className="mb-4 p-3 border rounded-lg bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Batch Edit Variants
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 items-end">
            <div className="col-span-2 sm:col-span-2 md:col-span-2">
              <div className="text-xs text-muted-foreground mb-1">Select Scope</div>
              <Select value={applyScope} onValueChange={(v) => setApplyScope(v)}>
                <SelectTrigger className="bg-background h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {scopeOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value} className="text-xs">
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">
                Price <span className="text-red-500 ml-0.5">*</span>
              </div>
              <NumberInput
                className="bg-background h-8 text-xs"
                value={applyAll.price ?? ''}
                onChange={(e) => setApplyAll((p) => ({ ...p, price: e.target.value }))}
                placeholder="0"
              />
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Spl Price</div>
              <NumberInput
                className="bg-background h-8 text-xs"
                value={applyAll.specialPrice ?? ''}
                onChange={(e) => setApplyAll((p) => ({ ...p, specialPrice: e.target.value }))}
                placeholder="0"
              />
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Stock</div>
              <NumberInput
                className="bg-background h-8 text-xs"
                value={applyAll.stock ?? ''}
                onChange={(e) => setApplyAll((p) => ({ ...p, stock: e.target.value }))}
                placeholder="0"
              />
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">SellerSKU</div>
              <Input
                className="bg-background font-mono text-xs h-8"
                value={applyAll.sellerSku ?? ''}
                onChange={(e) => setApplyAll((p) => ({ ...p, sellerSku: e.target.value }))}
                placeholder="SKU"
              />
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Free</div>
              <NumberInput
                className="bg-background h-8 text-xs"
                value={applyAll.freeItems ?? ''}
                onChange={(e) => setApplyAll((p) => ({ ...p, freeItems: e.target.value }))}
                placeholder="0"
              />
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <Checkbox
                checked={!!applyAll.available}
                onCheckedChange={(v) => setApplyAll((p) => ({ ...p, available: !!v }))}
              />
              <span className="text-xs font-medium">Mark as Available</span>
            </label>
            <Button type="button" size="sm" className="h-8 text-xs px-3" onClick={applyToAll}>
              Apply to Selected
            </Button>
          </div>
        </div>
      )}

      {variants.length === 1 && (
        <div className="border rounded-md overflow-x-auto">
          <Table className="w-full min-w-[700px] table-fixed text-[11px] sm:text-xs">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[12%] px-1.5 py-2">{variants[0].label}</TableHead>
                <TableHead className="w-[14%] px-1.5 py-2">
                  Price <span className="text-red-500 ml-0.5">*</span>
                </TableHead>
                <TableHead className="w-[16%] px-1.5 py-2">Special Price</TableHead>
                <TableHead className="w-[11%] px-1.5 py-2">Stock</TableHead>
                <TableHead className="w-[28%] px-1.5 py-2">SellerSKU</TableHead>
                <TableHead className="w-[10%] px-1.5 py-2">Free</TableHead>
                <TableHead className="w-[9%] px-1 py-2 text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {variants[0].values.map((opt) => (
                <TableRow key={opt}>
                  <TableCell className="capitalize font-medium text-xs px-1.5 py-1.5 truncate">
                    {labelOf(variants[0].key, opt)}
                  </TableCell>
                  <TableCell className="p-1.5">
                    <VariantFieldInput
                      name={pathFor(variants[0].key, opt, 'price')}
                      type="number"
                      required
                    />
                  </TableCell>
                  <TableCell className="p-1.5">
                    <VariantFieldInput
                      name={pathFor(variants[0].key, opt, 'specialPrice')}
                      type="number"
                    />
                  </TableCell>
                  <TableCell className="p-1.5">
                    <VariantFieldInput
                      name={pathFor(variants[0].key, opt, 'stock')}
                      type="number"
                    />
                  </TableCell>
                  <TableCell className="p-1.5">
                    <VariantFieldInput name={pathFor(variants[0].key, opt, 'sellerSku')} />
                  </TableCell>
                  <TableCell className="p-1.5">
                    <VariantFieldInput
                      name={pathFor(variants[0].key, opt, 'freeItems')}
                      type="number"
                    />
                  </TableCell>
                  <TableCell className="p-1 text-center">
                    <VariantAvailability name={pathFor(variants[0].key, opt, 'available')} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {variants.length >= 2 && (
        <div className="border rounded-md overflow-x-auto">
          <Table className="w-full min-w-[750px] table-fixed text-[11px] sm:text-xs">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[10%] px-1.5 py-2">{variants[0].label}</TableHead>
                <TableHead className="w-[4%] px-0.5 py-2 text-center">
                  {variants[1].label}
                </TableHead>
                <TableHead className="w-[13%] px-1.5 py-2">
                  Price <span className="text-red-500 ml-0.5">*</span>
                </TableHead>
                <TableHead className="w-[15%] px-1.5 py-2">Special Price</TableHead>
                <TableHead className="w-[10%] px-1.5 py-2">Stock</TableHead>
                <TableHead className="w-[31%] px-1.5 py-2">SellerSKU</TableHead>
                <TableHead className="w-[11%] px-1 py-2">Free</TableHead>
                <TableHead className="w-[6%] px-0.5 py-2 text-center" title="Availability">
                  Active
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {variants[0].values.flatMap((opt1) =>
                variants[1].values.map((opt2) => (
                  <TableRow key={`${opt1}-${opt2}`}>
                    <TableCell className="capitalize font-medium text-[11px] sm:text-xs px-1.5 py-1.5 truncate">
                      {labelOf(variants[0].key, opt1)}
                    </TableCell>
                    <TableCell className="capitalize font-medium text-[11px] sm:text-xs px-0.5 py-1.5 text-center truncate">
                      {labelOf(variants[1].key, opt2)}
                    </TableCell>
                    <TableCell className="p-1.5">
                      <VariantFieldInput
                        name={pathFor(variants[0].key, opt1, variants[1].key, opt2, 'price')}
                        type="number"
                        required
                      />
                    </TableCell>
                    <TableCell className="p-1.5">
                      <VariantFieldInput
                        name={pathFor(variants[0].key, opt1, variants[1].key, opt2, 'specialPrice')}
                        type="number"
                      />
                    </TableCell>
                    <TableCell className="p-1.5">
                      <VariantFieldInput
                        name={pathFor(variants[0].key, opt1, variants[1].key, opt2, 'stock')}
                        type="number"
                      />
                    </TableCell>
                    <TableCell className="p-1.5">
                      <VariantFieldInput
                        name={pathFor(variants[0].key, opt1, variants[1].key, opt2, 'sellerSku')}
                      />
                    </TableCell>
                    <TableCell className="p-1.5">
                      <VariantFieldInput
                        name={pathFor(variants[0].key, opt1, variants[1].key, opt2, 'freeItems')}
                        type="number"
                      />
                    </TableCell>
                    <TableCell className="p-0.5 text-center">
                      <VariantAvailability
                        name={pathFor(variants[0].key, opt1, variants[1].key, opt2, 'available')}
                      />
                    </TableCell>
                  </TableRow>
                )),
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function VariantFieldInput({
  name,
  type,
  required,
}: {
  name: string;
  type?: 'number';
  required?: boolean;
}) {
  const { control, getValues } = useFormContext();
  const isPriceField = name.endsWith('.price');
  const isSpecialPriceField = name.endsWith('.specialPrice');
  const isNonNegativeField = name.endsWith('.stock') || name.endsWith('.freeItems');
  const { field, fieldState } = useController({
    name,
    control,
    rules:
      type === 'number'
        ? {
            validate: (value: unknown) => {
              const raw = String(value ?? '').trim();
              if (!raw) {
                return required ? 'This field is required' : true;
              }
              const numeric = Number(raw);
              if (!Number.isFinite(numeric)) {
                return 'Enter a valid number';
              }
              if ((isPriceField || isSpecialPriceField) && numeric <= 0) {
                return 'Must be greater than 0';
              }
              if (isNonNegativeField && numeric < 0) {
                return 'Cannot be negative';
              }
              if (isSpecialPriceField) {
                const basePrice = Number(getValues(name.replace(/\.specialPrice$/, '.price')));
                if (Number.isFinite(basePrice) && numeric >= basePrice) {
                  return 'Must be lower than price';
                }
              }
              return true;
            },
          }
        : required
          ? { required: 'This field is required' }
          : undefined,
  });
  return (
    <div className="space-y-1">
      {type === 'number' ? (
        <NumberInput
          required={required}
          placeholder="0"
          invalid={!!fieldState.error}
          className="text-[11px] sm:text-xs px-1 h-7 sm:h-8"
          {...field}
        />
      ) : (
        <Input
          required={required}
          placeholder=""
          title={String(field.value ?? '')}
          className={`font-mono text-[11px] sm:text-xs px-1.5 h-7 sm:h-8 ${
            fieldState.error ? 'border-red-500 focus-visible:ring-red-500' : ''
          }`}
          {...field}
        />
      )}
      <FieldError message={fieldState.error?.message} />
    </div>
  );
}

function VariantAvailability({ name }: { name: string }) {
  const { control } = useFormContext();
  const { field } = useController({ name, control });
  return (
    <div className="flex justify-center items-center">
      <Checkbox checked={!!field.value} onCheckedChange={(v) => field.onChange(!!v)} />
    </div>
  );
}
