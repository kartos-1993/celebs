import React from 'react';
import { useController, useFormContext, useWatch } from 'react-hook-form';
import { ProductAPI } from '@/lib/axios-client';
import { Checkbox } from '@celebs/shared-ui/components/checkbox';
import { Button } from '@celebs/shared-ui/components/button';
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
import type { UiProps } from '../UiRegistry';
import { LabelWithRequired, FieldError } from './shared';
import { getLabelMap } from '../variant-utils'; // Wait, let's make sure it's exported or we copy it

export function SkuTableInputField({ field }: UiProps) {
  const ds = field.dataSource;
  const labelsMap: Record<string, Record<string, string>> = (ds?.labels as any) ?? {};
  const labelOf = React.useCallback(
    (axisKey: string, value: string) =>
      labelsMap?.[axisKey]?.[String(value)] ?? String(value),
    [labelsMap],
  );

  const [variantMeta, setVariantMeta] = React.useState<
    Array<{ key: string; label: string }>
  >(Array.isArray(ds) ? ds : Array.isArray(ds?.variants) ? ds.variants : []);

  React.useEffect(() => {
    (async () => {
      if (Array.isArray(ds?.variants)) {
        const normalized = ds.variants.map((a: any) => ({
          key: a.key ?? a.name ?? a.value,
          label: a.label ?? a.name ?? a.key ?? String(a.value),
        }));
        setVariantMeta(normalized);
        return;
      }
      if (!ds || !ds.fetch) return;
      try {
        const res = await ProductAPI.get(ds.fetch, { params: ds.params });
        const data = res.data;
        const raw =
          data?.data?.variants ??
          data?.variants ??
          data?.data?.axes ??
          data?.axes ??
          data?.data ??
          data;
        const list = Array.isArray(raw) ? raw : [];
        const normalized = list.map((a: any) => ({
          key: a.key ?? a.name ?? a.value,
          label: a.label ?? a.name ?? a.key ?? String(a.value),
        }));
        setVariantMeta(normalized);
      } catch (e) {
        // silently ignore
      }
    })();
  }, [
    ds?.fetch,
    Array.isArray(ds?.variants) ? ds?.variants?.length : ds?.variants,
  ]);

  const { control: formControl, setValue } = useFormContext();

  const watchedValues = useWatch({
    control: formControl,
    name: variantMeta.map((a) => a.key) as any,
  }) as any[] | undefined;

  const variantSelections = variantMeta.map((a, idx) => {
    const v = watchedValues?.[idx];
    if (Array.isArray(v)) {
      const arr = (v as any[]).map((x) =>
        typeof x === 'string'
          ? x
          : String((x as any)?.value ?? (x as any)?.label ?? x),
      );
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

  const pathFor = (...parts: string[]) =>
    ['sku', 'variants', ...parts.map(sanitize)].join('.');

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
    const opts: Array<{ value: string; label: string }> = [
      { value: 'ALL', label: 'All Variants' },
    ];
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

  const matchesScope = (
    aKey: string,
    aVal: string,
    bKey?: string,
    bVal?: string,
  ) => {
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
    const fill = (name: string, value: any) =>
      setValue(name, value, { shouldDirty: true });
    if (variants.length === 1) {
      for (const opt of variants[0].values) {
        if (!matchesScope(variants[0].key, opt)) continue;
        if (applyAll.price != null)
          fill(pathFor(variants[0].key, opt, 'price'), applyAll.price);
        if (applyAll.specialPrice != null)
          fill(
            pathFor(variants[0].key, opt, 'specialPrice'),
            applyAll.specialPrice,
          );
        if (applyAll.stock != null)
          fill(pathFor(variants[0].key, opt, 'stock'), applyAll.stock);
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
          if (!matchesScope(variants[0].key, opt1, variants[1].key, opt2))
            continue;
          if (applyAll.price != null)
            fill(
              pathFor(variants[0].key, opt1, variants[1].key, opt2, 'price'),
              applyAll.price,
            );
          if (applyAll.specialPrice != null)
            fill(
              pathFor(
                variants[0].key,
                opt1,
                variants[1].key,
                opt2,
                'specialPrice',
              ),
              applyAll.specialPrice,
            );
          if (applyAll.stock != null)
            fill(
              pathFor(variants[0].key, opt1, variants[1].key, opt2, 'stock'),
              applyAll.stock,
            );
          if (applyAll.sellerSku != null)
            fill(
              pathFor(
                variants[0].key,
                opt1,
                variants[1].key,
                opt2,
                'sellerSku',
              ),
              applyAll.sellerSku,
            );
          if (applyAll.freeItems != null)
            fill(
              pathFor(
                variants[0].key,
                opt1,
                variants[1].key,
                opt2,
                'freeItems',
              ),
              applyAll.freeItems,
            );
          if (applyAll.available != null)
            fill(
              pathFor(
                variants[0].key,
                opt1,
                variants[1].key,
                opt2,
                'available',
              ),
              applyAll.available,
            );
        }
      }
    }
  };

  return (
    <div className="space-y-2">
      <div className="font-medium">{field.label}</div>
      <div className="text-sm text-muted-foreground">
        {variants.length
          ? `SKU Matrix generated from: ${variants.map((a) => a.label).join(' × ')}`
          : 'No variants selected. Using default SKU.'}
      </div>

      {variants.length === 0 && (
        <Table className="mb-4">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Price</TableHead>
              <TableHead>Special Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>SellerSKU</TableHead>
              <TableHead>Free Items</TableHead>
              <TableHead>Availability</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>
                <VariantFieldInput
                  name="sku.default.price"
                  type="number"
                  required
                />
              </TableCell>
              <TableCell>
                <VariantFieldInput
                  name="sku.default.specialPrice"
                  type="number"
                />
              </TableCell>
              <TableCell>
                <VariantFieldInput name="sku.default.stock" type="number" />
              </TableCell>
              <TableCell>
                <VariantFieldInput name="sku.default.sellerSku" />
              </TableCell>
              <TableCell>
                <VariantFieldInput name="sku.default.freeItems" type="number" />
              </TableCell>
              <TableCell>
                <VariantAvailability name="sku.default.available" />
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )}

      {variants.length > 0 && (
        <div className="mb-3 grid grid-cols-2 sm:grid-cols-8 gap-2 items-end">
          <div>
            <div className="text-xs text-muted-foreground">Select Variant</div>
            <Select value={applyScope} onValueChange={(v) => setApplyScope(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {scopeOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Price</div>
            <NumberInput
              value={applyAll.price ?? ''}
              onChange={(e) =>
                setApplyAll((p) => ({ ...p, price: e.target.value }))
              }
              placeholder="0"
            />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Special Price</div>
            <NumberInput
              value={applyAll.specialPrice ?? ''}
              onChange={(e) =>
                setApplyAll((p) => ({ ...p, specialPrice: e.target.value }))
              }
              placeholder="0"
            />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Stock</div>
            <NumberInput
              value={applyAll.stock ?? ''}
              onChange={(e) =>
                setApplyAll((p) => ({ ...p, stock: e.target.value }))
              }
              placeholder="0"
            />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">SellerSKU</div>
            <Input
              value={applyAll.sellerSku ?? ''}
              onChange={(e) =>
                setApplyAll((p) => ({ ...p, sellerSku: e.target.value }))
              }
              placeholder="SKU"
            />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Free Items</div>
            <NumberInput
              value={applyAll.freeItems ?? ''}
              onChange={(e) =>
                setApplyAll((p) => ({ ...p, freeItems: e.target.value }))
              }
              placeholder="0"
            />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Availability</div>
            <label className="flex items-center gap-2 text-xs border rounded px-2 h-9">
              <Checkbox
                checked={!!applyAll.available}
                onCheckedChange={(v) =>
                  setApplyAll((p) => ({ ...p, available: !!v }))
                }
              />
              <span>Available</span>
            </label>
          </div>
          <div className="flex items-end">
            <Button type="button" className="w-full" onClick={applyToAll}>
              Apply to All
            </Button>
          </div>
        </div>
      )}

      {variants.length === 1 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[160px]">{variants[0].label}</TableHead>
              <TableHead className="w-[120px]">Price</TableHead>
              <TableHead className="w-[120px]">Special Price</TableHead>
              <TableHead className="w-[120px]">Stock</TableHead>
              <TableHead className="w-[140px]">SellerSKU</TableHead>
              <TableHead className="w-[120px]">Free Items</TableHead>
              <TableHead className="w-[120px]">Availability</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {variants[0].values.map((opt) => (
              <TableRow key={opt}>
                <TableCell className="capitalize">
                  {labelOf(variants[0].key, opt)}
                </TableCell>
                <TableCell>
                  <VariantFieldInput
                    name={pathFor(variants[0].key, opt, 'price')}
                    type="number"
                    required
                  />
                </TableCell>
                <TableCell>
                  <VariantFieldInput
                    name={pathFor(variants[0].key, opt, 'specialPrice')}
                    type="number"
                  />
                </TableCell>
                <TableCell>
                  <VariantFieldInput
                    name={pathFor(variants[0].key, opt, 'stock')}
                    type="number"
                  />
                </TableCell>
                <TableCell>
                  <VariantFieldInput
                    name={pathFor(variants[0].key, opt, 'sellerSku')}
                  />
                </TableCell>
                <TableCell>
                  <VariantFieldInput
                    name={pathFor(variants[0].key, opt, 'freeItems')}
                    type="number"
                  />
                </TableCell>
                <TableCell>
                  <VariantAvailability
                    name={pathFor(variants[0].key, opt, 'available')}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {variants.length >= 2 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[160px]">{variants[0].label}</TableHead>
              <TableHead className="w-[160px]">{variants[1].label}</TableHead>
              <TableHead className="w-[120px]">Price</TableHead>
              <TableHead className="w-[120px]">Special Price</TableHead>
              <TableHead className="w-[120px]">Stock</TableHead>
              <TableHead className="w-[140px]">SellerSKU</TableHead>
              <TableHead className="w-[120px]">Free Items</TableHead>
              <TableHead className="w-[120px]">Availability</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {variants[0].values.flatMap((opt1) =>
              variants[1].values.map((opt2) => (
                <TableRow key={`${opt1}-${opt2}`}>
                  <TableCell className="capitalize">
                    {labelOf(variants[0].key, opt1)}
                  </TableCell>
                  <TableCell className="capitalize">
                    {labelOf(variants[1].key, opt2)}
                  </TableCell>
                  <TableCell>
                    <VariantFieldInput
                      name={pathFor(
                        variants[0].key,
                        opt1,
                        variants[1].key,
                        opt2,
                        'price',
                      )}
                      type="number"
                      required
                    />
                  </TableCell>
                  <TableCell>
                    <VariantFieldInput
                      name={pathFor(
                        variants[0].key,
                        opt1,
                        variants[1].key,
                        opt2,
                        'specialPrice',
                      )}
                      type="number"
                    />
                  </TableCell>
                  <TableCell>
                    <VariantFieldInput
                      name={pathFor(
                        variants[0].key,
                        opt1,
                        variants[1].key,
                        opt2,
                        'stock',
                      )}
                      type="number"
                    />
                  </TableCell>
                  <TableCell>
                    <VariantFieldInput
                      name={pathFor(
                        variants[0].key,
                        opt1,
                        variants[1].key,
                        opt2,
                        'sellerSku',
                      )}
                    />
                  </TableCell>
                  <TableCell>
                    <VariantFieldInput
                      name={pathFor(
                        variants[0].key,
                        opt1,
                        variants[1].key,
                        opt2,
                        'freeItems',
                      )}
                      type="number"
                    />
                  </TableCell>
                  <TableCell>
                    <VariantAvailability
                      name={pathFor(
                        variants[0].key,
                        opt1,
                        variants[1].key,
                        opt2,
                        'available',
                      )}
                    />
                  </TableCell>
                </TableRow>
              )),
            )}
          </TableBody>
        </Table>
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
  const isNonNegativeField =
    name.endsWith('.stock') || name.endsWith('.freeItems');
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
                const basePrice = Number(
                  getValues(name.replace(/\.specialPrice$/, '.price')),
                );
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
          {...field}
        />
      ) : (
        <Input
          required={required}
          placeholder=""
          className={
            fieldState.error ? 'border-red-500 focus-visible:ring-red-500' : ''
          }
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
    <label className="flex items-center gap-2 text-xs">
      <Checkbox
        checked={!!field.value}
        onCheckedChange={(v) => field.onChange(!!v)}
      />
      <span>Available</span>
    </label>
  );
}
