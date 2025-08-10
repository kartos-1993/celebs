import React from 'react';
import {
  Control,
  useController,
  useFormContext,
  useWatch,
} from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ProductAPI } from '@/lib/axios-client';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Pencil, Trash2, ImagePlus, Upload } from 'lucide-react';
import { Multiselect } from '@/components/ui/multiselect';

export type UiType =
  | 'input'
  | 'number'
  | 'Switch'
  | 'select'
  | 'multiselect' // alias for compatibility with backend payloads
  | 'VariantList' // custom list editor for Color variant per design
  | 'ColorInline' // compact per-color swatch + images row list
  | 'SkuTableV2'
  | 'MainImage'
  | 'ColorMeta';

export interface FieldSpec {
  name: string;
  uiType: UiType;
  label: string;
  group: string;
  required?: boolean;
  value?: any;
  dataSource?: any;
  rule?: any;
  visible?: boolean;
}

type UiProps = { field: FieldSpec; control: Control<any> };

function rulesFrom(field: FieldSpec) {
  const rules: any = {};
  if (field.required) {
    rules.required = `${field.label} is required`;
  }
  if (field.uiType === 'number') {
    if (field.rule?.min != null)
      rules.min = { value: field.rule.min, message: `Min ${field.rule.min}` };
    if (field.rule?.max != null)
      rules.max = { value: field.rule.max, message: `Max ${field.rule.max}` };
  }
  if (field.uiType === 'multiselect') {
    rules.validate = (v: any) =>
      !field.required ||
      (Array.isArray(v) && v.length > 0) ||
      `${field.label} is required`;
  }
  if (field.uiType === 'VariantList') {
    rules.validate = (v: any) =>
      !field.required ||
      (Array.isArray(v) && v.length > 0) ||
      `${field.label} is required`;
  }
  return rules;
}

function LabelWithRequired({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <Label className="font-medium">
      <span>{children}</span>
      {required ? <span className="ml-1 text-red-500">*</span> : null}
    </Label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <div className="text-xs text-red-500 mt-1">{message}</div>;
}

function InputField({ field, control }: UiProps) {
  const { field: f, fieldState } = useController({
    name: field.name,
    control,
    rules: rulesFrom(field),
  });
  return (
    <div className="space-y-1">
      <LabelWithRequired required={field.required}>
        {field.label}
      </LabelWithRequired>
      <Input
        {...f}
        placeholder={field.label}
        className={
          fieldState.error ? 'border-red-500 focus-visible:ring-red-500' : ''
        }
      />
      <FieldError message={fieldState.error?.message} />
    </div>
  );
}

function NumberField({ field, control }: UiProps) {
  const { field: f, fieldState } = useController({
    name: field.name,
    control,
    rules: rulesFrom(field),
  });
  return (
    <div className="space-y-1">
      <LabelWithRequired required={field.required}>
        {field.label}
      </LabelWithRequired>
      <Input
        type="number"
        {...f}
        placeholder={field.label}
        className={
          fieldState.error ? 'border-red-500 focus-visible:ring-red-500' : ''
        }
      />
      <FieldError message={fieldState.error?.message} />
    </div>
  );
}

function SwitchField({ field, control }: UiProps) {
  const { field: f } = useController({ name: field.name, control });
  return (
    <label className="flex items-center gap-2">
      <Checkbox
        checked={!!f.value}
        onCheckedChange={(val) => f.onChange(!!val)}
      />
      <span className="text-sm">{field.label}</span>
    </label>
  );
}

function useOptions(field: FieldSpec) {
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

function SelectField({ field, control }: UiProps) {
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

function MultiSelectField({ field, control }: UiProps) {
  const { setValue } = useFormContext();
  const { field: f, fieldState } = useController({
    name: field.name,
    control,
    rules: rulesFrom(field),
  });
  const opts = useOptions(field);
  const value: string[] = Array.isArray(f.value) ? f.value : [];
  return (
    <div className="space-y-1">
      <LabelWithRequired required={field.required}>
        {field.label}
      </LabelWithRequired>
      <Multiselect
        options={opts}
        value={value}
        onChange={(next) => {
          // Use setValue to ensure watchers fire and dirtiness is tracked
          setValue(field.name, next, {
            shouldDirty: true,
            shouldValidate: true,
          });
        }}
        placeholder={`Select ${field.label}`}
      />
      <FieldError message={fieldState.error?.message} />
    </div>
  );
}

// VariantListField: list-style editor for Color with per-row upload triggers
function VariantListField({ field, control }: UiProps) {
  const { setValue } = useFormContext();
  const { field: f, fieldState } = useController({
    name: field.name,
    control,
    rules: rulesFrom(field),
  });
  const opts = useOptions(field);
  const selected = Array.isArray(f.value) ? f.value : [];
  return (
    <div className="space-y-1">
      <LabelWithRequired required={field.required}>
        {field.label}
      </LabelWithRequired>
      <Multiselect
        options={opts}
        value={selected}
        onChange={(next) => {
          setValue(field.name, next, {
            shouldDirty: true,
            shouldValidate: true,
          });
        }}
        placeholder={`Select ${field.label}`}
      />
      <FieldError message={fieldState.error?.message} />
    </div>
  );
}

function MainImageField({ field }: UiProps) {
  const { setValue, watch, register, trigger, formState } = useFormContext();
  const files: File[] = watch(field.name) ?? [];
  const [previews, setPreviews] = React.useState<string[]>([]);
  const fileInputs = React.useRef<Array<HTMLInputElement | null>>([]);

  React.useEffect(() => {
    // Register field for validation
    register(field.name as any, {
      validate: (v: any) => {
        const arr: File[] = Array.isArray(v) ? v : [];
        if (field.required && arr.length === 0)
          return `${field.label} is required`;
        if (field.rule?.maxItems && arr.length > field.rule.maxItems)
          return `Max ${field.rule.maxItems} images`;
        if (
          Array.isArray(field.rule?.accept) &&
          arr.some((f) => !field.rule.accept.includes(f.type))
        )
          return 'Invalid file type';
        if (field.rule?.maxSize && arr.some((f) => f.size > field.rule.maxSize))
          return `Each image must be <= ${Math.round(field.rule.maxSize / 1024 / 1024)}MB`;
        return true;
      },
    });
    // generate previews
    const urls = (files || []).map((f) => URL.createObjectURL(f));
    setPreviews((prev) => {
      prev.forEach((u) => URL.revokeObjectURL(u));
      return urls;
    });
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files?.length]);

  const onAddFiles = (list: FileList | null) => {
    if (!list) return;
    const next = [...(files || []), ...Array.from(list)];
    setValue(field.name, next, { shouldValidate: true, shouldDirty: true });
    trigger(field.name);
  };
  const onReplaceFile = (idx: number, f: File | null) => {
    if (!f) return;
    const next = [...(files || [])];
    next[idx] = f;
    setValue(field.name, next, { shouldValidate: true, shouldDirty: true });
    trigger(field.name);
  };
  const onDelete = (idx: number) => {
    const next = (files || []).filter((_, i) => i !== idx);
    setValue(field.name, next, { shouldValidate: true, shouldDirty: true });
    trigger(field.name);
  };

  return (
    <div className="space-y-2">
      <LabelWithRequired required={field.required}>
        {field.label}
      </LabelWithRequired>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {/* Add tile */}
        <label className="flex h-24 cursor-pointer items-center justify-center rounded border border-dashed text-sm text-muted-foreground hover:bg-accent/30">
          <input
            type="file"
            className="hidden"
            accept={
              Array.isArray(field.rule?.accept)
                ? field.rule.accept.join(',')
                : undefined
            }
            multiple
            onChange={(e) => onAddFiles(e.target.files)}
          />
          <span className="inline-flex items-center gap-1">
            <ImagePlus className="h-4 w-4" /> Add Image
          </span>
        </label>

        {/* Thumbnails */}
        {previews.map((src, idx) => (
          <TooltipProvider key={idx}>
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <div className="relative group h-24 rounded border overflow-hidden">
                  <img
                    src={src}
                    alt={`image-${idx}`}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute bottom-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      className="inline-flex h-7 w-7 items-center justify-center rounded bg-white/90 shadow hover:bg-white"
                      onClick={() => fileInputs.current[idx]?.click()}
                      aria-label="Edit image"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-7 w-7 items-center justify-center rounded bg-white/90 shadow hover:bg-white text-red-600"
                      onClick={() => onDelete(idx)}
                      aria-label="Delete image"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <input
                    ref={(el) => {
                      fileInputs.current[idx] = el;
                    }}
                    type="file"
                    accept={
                      Array.isArray(field.rule?.accept)
                        ? field.rule.accept.join(',')
                        : undefined
                    }
                    className="hidden"
                    onChange={(e) =>
                      onReplaceFile(idx, e.target.files?.[0] ?? null)
                    }
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="p-2">
                <div className="w-64">
                  <img
                    src={src}
                    alt={`preview-${idx}`}
                    className="w-full h-auto rounded"
                  />
                  <div className="mt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80"
                      onClick={() => fileInputs.current[idx]?.click()}
                    >
                      <Pencil className="h-3 w-3" /> Edit
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100"
                      onClick={() => onDelete(idx)}
                    >
                      <Trash2 className="h-3 w-3" /> Delete
                    </button>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
      <div className="text-xs text-muted-foreground">
        {field.rule?.maxItems ? <>Max {field.rule.maxItems} images</> : null}
        {Array.isArray(field.rule?.accept) ? (
          <>
            {' '}
            • Accepted: {field.rule.accept.join(', ')} • Max size ~{' '}
            {Math.round((field.rule?.maxSize ?? 0) / 1024 / 1024)}MB
          </>
        ) : null}
      </div>
      {formState.errors?.[field.name as any] ? (
        <div className="text-xs text-red-500">
          {(formState.errors as any)[field.name]?.message as string}
        </div>
      ) : null}
    </div>
  );
}

function SkuTableField({ field, control }: UiProps) {
  const ds = field.dataSource;
  // Optional labels map: { [axisKey]: { [valueId]: label } }
  const labelsMap: Record<string, Record<string, string>> =
    (ds?.labels as any) ?? {};
  const labelOf = React.useCallback(
    (axisKey: string, value: string) =>
      labelsMap?.[axisKey]?.[String(value)] ?? String(value),
    [labelsMap],
  );
  // Variant metadata (e.g., Color, Size). Avoid using the term "axes".
  const [variantMeta, setVariantMeta] = React.useState<
    Array<{ key: string; label: string }>
  >(Array.isArray(ds) ? ds : Array.isArray(ds?.variants) ? ds.variants : []);
  React.useEffect(() => {
    (async () => {
      // If variants are provided inline, prefer them
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
        // Prefer "variants" from API; keep "axes" as a backwards-compatible fallback.
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
        // silently keep current variantMeta
      }
    })();
  }, [
    ds?.fetch,
    Array.isArray(ds?.variants) ? ds?.variants?.length : ds?.variants,
  ]);
  const { control: formControl, setValue } = useFormContext();
  const { field: price } = useController({
    name: 'sku.default.price',
    control,
  });
  const { field: specialPrice } = useController({
    name: 'sku.default.specialPrice',
    control,
  });
  const { field: stock } = useController({
    name: 'sku.default.stock',
    control,
  });
  const { field: sellerSku } = useController({
    name: 'sku.default.sellerSku',
    control,
  });
  const { field: freeItems } = useController({
    name: 'sku.default.freeItems',
    control,
  });
  const { field: available } = useController({
    name: 'sku.default.available',
    control,
  });

  // Determine selected options for up to two variant fields (e.g., color, size)
  const watchedValues = useWatch({
    control: formControl,
    name: variantMeta.map((a) => a.key) as any,
  }) as any[] | undefined;
  const variantSelections = variantMeta.map((a, idx) => {
    const v = watchedValues?.[idx];
    if (Array.isArray(v)) {
      // Coerce any multiselect values into strings (handles objects or numbers)
      const arr = (v as any[]).map((x) =>
        typeof x === 'string'
          ? x
          : String((x as any)?.value ?? (x as any)?.label ?? x),
      );
      return { key: a.key, label: a.label, values: arr };
    }
    if (typeof v === 'string' && v) {
      // Support comma-delimited payloads as a convenience
      const parts = v.split(',').map((s) => s.trim()).filter(Boolean);
      return { key: a.key, label: a.label, values: parts.length ? parts : [v] };
    }
    return { key: a.key, label: a.label, values: [] as string[] };
  });
  const variants = variantSelections.filter((a) => a.values.length > 0);

  // Helper to build name paths for per-variant stock
  const sanitize = (s: string) =>
    String(s)
      .replace(/\./g, '_')
      .replace(/\[/g, '(')
      .replace(/\]/g, ')')
      .replace(/\s+/g, ' ')
      .trim();
  const pathFor = (...parts: string[]) =>
    ['sku', 'variants', ...parts.map(sanitize)].join('.');

  // Apply-to-all controls
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
          ? `SKU Matrix generated from: ${variants.map((a: { label: string }) => a.label).join(' × ')}`
          : 'No variants selected. Using default SKU.'}
      </div>

      {/* Default SKU row (only when no variants selected) */}
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
                <Input type="number" {...price} placeholder="0" required />
              </TableCell>
              <TableCell>
                <Input type="number" {...specialPrice} placeholder="0" />
              </TableCell>
              <TableCell>
                <Input type="number" {...stock} placeholder="0" />
              </TableCell>
              <TableCell>
                <Input {...sellerSku} placeholder="SKU" />
              </TableCell>
              <TableCell>
                <Input type="number" {...freeItems} placeholder="0" />
              </TableCell>
              <TableCell>
                <label className="flex items-center gap-2 text-xs">
                  <Checkbox
                    checked={!!available.value}
                    onCheckedChange={(v) => available.onChange(!!v)}
                  />
                  <span>Available</span>
                </label>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )}

      {/* Apply-to-all control bar */}
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
            <Input
              type="number"
              value={applyAll.price ?? ''}
              onChange={(e) =>
                setApplyAll((p) => ({ ...p, price: e.target.value }))
              }
              placeholder="0"
            />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Special Price</div>
            <Input
              type="number"
              value={applyAll.specialPrice ?? ''}
              onChange={(e) =>
                setApplyAll((p) => ({ ...p, specialPrice: e.target.value }))
              }
              placeholder="0"
            />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Stock</div>
            <Input
              type="number"
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
            <Input
              type="number"
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

      {/* Variant-specific matrix */}
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
        <TableCell className="capitalize">{labelOf(variants[0].key, opt)}</TableCell>
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
      <TableCell className="capitalize">{labelOf(variants[0].key, opt1)}</TableCell>
      <TableCell className="capitalize">{labelOf(variants[1].key, opt2)}</TableCell>
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
  const { control } = useFormContext();
  const { field } = useController({ name, control });
  return (
    <Input
      required={required}
      type={type === 'number' ? 'number' : 'text'}
      placeholder={type === 'number' ? '0' : ''}
      {...field}
    />
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

// ---------- Color Meta (per-color swatch, images, and hot flag) ----------
function useObjectUrl(file: File | string | undefined) {
  const [url, setUrl] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!file) return setUrl(null);
    if (typeof file === 'string') return setUrl(file);
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return url;
}

function ColorMetaItem({
  color,
  namePrefix,
  accept,
  limits,
}: {
  color: string;
  namePrefix: string; // e.g. variants.colorMeta.Red
  accept?: string[];
  limits?: { maxImages?: number; maxSize?: number };
}) {
  const { control, setValue, watch, register, trigger, formState } =
    useFormContext();
  const { field: hot } = useController({ name: `${namePrefix}.hot`, control });
  const swatch: File | string | undefined = watch(`${namePrefix}.swatch`);
  const images: File[] = watch(`${namePrefix}.images`) ?? [];
  const swatchUrl = useObjectUrl(swatch);
  const [imageUrls, setImageUrls] = React.useState<string[]>([]);

  React.useEffect(() => {
    // Create object URLs for image previews (Files only)
    const urls = (images || []).map((img) => URL.createObjectURL(img));
    setImageUrls(urls);
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [images]);

  React.useEffect(() => {
    register(`${namePrefix}.swatch` as any, {
      validate: (v: any) => {
        if (!v) return true;
        if (limits?.maxSize && v instanceof File && v.size > limits.maxSize)
          return `Swatch must be <= ${Math.round(limits.maxSize / 1024 / 1024)}MB`;
        return true;
      },
    });
    register(`${namePrefix}.images` as any, {
      validate: (v: any) => {
        const arr: File[] = Array.isArray(v) ? v : [];
        if (limits?.maxImages && arr.length > limits.maxImages)
          return `Max ${limits.maxImages} images`;
        if (
          limits?.maxSize &&
          arr.some((f) => limits?.maxSize && f.size > limits.maxSize)
        ) {
          const ms = limits.maxSize!;
          return `Each image must be <= ${Math.round(ms / 1024 / 1024)}MB`;
        }
        return true;
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [namePrefix]);

  const onSwatch = (file: File | null) => {
    if (!file) return;
    setValue(`${namePrefix}.swatch`, file, {
      shouldDirty: true,
      shouldValidate: true,
    });
    trigger(`${namePrefix}.swatch`);
  };
  const onAddImages = (list: FileList | null) => {
    if (!list) return;
    const next = [...images, ...Array.from(list)];
    setValue(`${namePrefix}.images`, next, {
      shouldDirty: true,
      shouldValidate: true,
    });
    trigger(`${namePrefix}.images`);
  };
  const onReplaceImage = (idx: number, file: File | null) => {
    if (!file) return;
    const next = [...images];
    next[idx] = file;
    setValue(`${namePrefix}.images`, next, {
      shouldDirty: true,
      shouldValidate: true,
    });
    trigger(`${namePrefix}.images`);
  };
  const onDeleteImage = (idx: number) => {
    const next = images.filter((_, i) => i !== idx);
    setValue(`${namePrefix}.images`, next, {
      shouldDirty: true,
      shouldValidate: true,
    });
    trigger(`${namePrefix}.images`);
  };

  return (
    <div className="rounded border p-3 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="font-medium capitalize">{color}</div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={!!hot.value}
            onCheckedChange={(v) => hot.onChange(!!v)}
          />
          <span>Hot</span>
        </label>
      </div>

      <div className="flex items-start gap-4">
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">Swatch</div>
          <label className="block h-12 w-12 rounded border overflow-hidden cursor-pointer">
            <input
              type="file"
              className="hidden"
              accept={Array.isArray(accept) ? accept.join(',') : undefined}
              onChange={(e) => onSwatch(e.target.files?.[0] ?? null)}
            />
            {swatchUrl ? (
              <img
                src={swatchUrl}
                alt={`${color}-swatch`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full grid place-items-center text-xs text-muted-foreground">
                +
              </div>
            )}
          </label>
          {(formState.errors as any)?.[`${namePrefix}.swatch`] ? (
            <div className="text-xs text-red-500">
              {
                (formState.errors as any)[`${namePrefix}.swatch`]
                  ?.message as string
              }
            </div>
          ) : null}
        </div>

        <div className="flex-1 space-y-1">
          <div className="text-xs text-muted-foreground">Product images</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <label className="flex h-16 cursor-pointer items-center justify-center rounded border border-dashed text-xs text-muted-foreground hover:bg-accent/30">
              <input
                type="file"
                className="hidden"
                accept={Array.isArray(accept) ? accept.join(',') : undefined}
                multiple
                onChange={(e) => onAddImages(e.target.files)}
              />
              <span className="inline-flex items-center gap-1">
                <ImagePlus className="h-3 w-3" /> Add
              </span>
            </label>
            {images.map((_, idx) => {
              const url = imageUrls[idx];
              return (
                <TooltipProvider key={idx}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="relative group h-16 rounded border overflow-hidden">
                        {url ? (
                          <img
                            src={url}
                            alt={`${color}-img-${idx}`}
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                        <div className="absolute bottom-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            className="inline-flex h-6 w-6 items-center justify-center rounded bg-white/90 shadow"
                            onClick={() => {
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = Array.isArray(accept)
                                ? accept.join(',')
                                : '';
                              input.onchange = (e: any) =>
                                onReplaceImage(
                                  idx,
                                  e.target.files?.[0] ?? null,
                                );
                              input.click();
                            }}
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            className="inline-flex h-6 w-6 items-center justify-center rounded bg-white/90 shadow text-red-600"
                            onClick={() => onDeleteImage(idx)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="p-2">
                      <div className="w-64">
                        {url ? (
                          <img
                            src={url}
                            alt={`preview-${idx}`}
                            className="w-full h-auto rounded"
                          />
                        ) : null}
                        <div className="mt-2 flex justify-end gap-2">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80"
                            onClick={() => {
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = Array.isArray(accept)
                                ? accept.join(',')
                                : '';
                              input.onchange = (e: any) =>
                                onReplaceImage(
                                  idx,
                                  e.target.files?.[0] ?? null,
                                );
                              input.click();
                            }}
                          >
                            <Pencil className="h-3 w-3" /> Edit
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100"
                            onClick={() => onDeleteImage(idx)}
                          >
                            <Trash2 className="h-3 w-3" /> Delete
                          </button>
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>
          {(formState.errors as any)?.[`${namePrefix}.images`] ? (
            <div className="text-xs text-red-500">
              {
                (formState.errors as any)[`${namePrefix}.images`]
                  ?.message as string
              }
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ColorMetaField({ field }: UiProps) {
  const { watch, setValue } = useFormContext();
  const colorField: string =
    field.dataSource?.colorField ??
    field.dataSource?.variants?.find((v: any) =>
      /color/i.test(v?.label ?? v?.key),
    )?.key ??
    'color';
  const labelsMap: Record<string, Record<string, string>> =
    (field.dataSource?.labels as any) ?? {};
  const labelOf = (value: string) =>
    labelsMap?.[colorField]?.[String(value)] ?? String(value);
  const accept: string[] | undefined = field.rule?.accept ?? ['image/*'];
  const limits = {
    maxImages: field.rule?.maxItems ?? 8,
    maxSize: field.rule?.maxSize,
  };
  const selected = watch(colorField);
  const colors: string[] = Array.isArray(selected)
    ? selected
    : selected
      ? [selected]
      : [];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <LabelWithRequired required={field.required}>
          {field.label}
        </LabelWithRequired>
        <div className="text-xs text-muted-foreground">
          Add Image {limits.maxImages ? `max ${limits.maxImages} images` : ''}{' '}
          for each variant
        </div>
      </div>
      {colors.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          Select one or more colors first.
        </div>
      ) : (
        <div className="space-y-2">
      {colors.map((c) => (
            <div key={c} className="rounded border p-2">
              <div className="flex items-center gap-2">
        <Input value={labelOf(c)} readOnly className="capitalize" />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    // open file picker to add images
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.multiple = true;
                    input.accept = Array.isArray(accept)
                      ? accept.join(',')
                      : '';
                    input.onchange = (e: any) => {
                      const files: FileList | null = e.target.files;
                      const namePrefix = `variants.colorMeta.${c}`;
                      const prev: File[] = watch(`${namePrefix}.images`) ?? [];
                      const next = [...prev, ...Array.from(files ?? [])];
                      setValue(`${namePrefix}.images`, next, {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                    };
                    input.click();
                  }}
                >
                  +
                </Button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-blue-600 text-sm underline"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.multiple = true;
                    input.accept = Array.isArray(accept)
                      ? accept.join(',')
                      : '';
                    input.onchange = (e: any) => {
                      const files: FileList | null = e.target.files;
                      const namePrefix = `variants.colorMeta.${c}`;
                      const prev: File[] = watch(`${namePrefix}.images`) ?? [];
                      const next = [...prev, ...Array.from(files ?? [])];
                      setValue(`${namePrefix}.images`, next, {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                    };
                    input.click();
                  }}
                >
                  <Upload className="h-3 w-3" /> Upload
                </button>
                <span className="text-muted-foreground">|</span>
                <button
                  type="button"
                  className="text-blue-600 text-sm underline"
                  onClick={() => {
                    /* TODO: open media center */
                  }}
                >
                  Media Center
                </button>
                <div className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    className="text-red-600"
                    onClick={() => {
                      // remove this color selection and its meta
                      const updated = colors.filter((x) => x !== c);
                      setValue(colorField, updated, {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                      // clear colorMeta data
                      setValue(`variants.colorMeta.${c}`, undefined as any, {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
              <div className="mt-2">
                <ColorMetaItem
                  color={c}
                  namePrefix={`variants.colorMeta.${c}`}
                  accept={accept}
                  limits={limits}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Color Inline: compact row-style per-color image uploads ----------
function ColorInlineRow({
  color,
  namePrefix,
  accept,
  limits,
}: {
  color: string;
  namePrefix: string;
  accept?: string[];
  limits: { maxImages?: number; maxSize?: number };
}) {
  const { watch, setValue, trigger, register, formState } = useFormContext();
  const swatch: File | string | undefined = watch(`${namePrefix}.swatch`);
  const swatchUrl = React.useMemo(() => {
    if (!swatch) return null;
    if (typeof swatch === 'string') return swatch;
    return URL.createObjectURL(swatch);
  }, [swatch]);
  const images: File[] = watch(`${namePrefix}.images`) ?? [];
  const [urls, setUrls] = React.useState<string[]>([]);
  React.useEffect(() => {
    const next = (images || []).map((f) =>
      typeof f === 'string' ? f : URL.createObjectURL(f),
    );
    setUrls(next);
    return () => {
      next.forEach((u) => {
        // Only revoke blob: urls
        if (u.startsWith('blob:')) URL.revokeObjectURL(u);
      });
    };
  }, [images]);

  React.useEffect(() => {
    register(`${namePrefix}.swatch` as any, {
      validate: (v: any) => {
        if (!v) return true;
        if (
          limits?.maxSize &&
          v instanceof File &&
          v.size > (limits.maxSize ?? 0)
        )
          return `Swatch must be <= ${Math.round((limits.maxSize ?? 0) / 1024 / 1024)}MB`;
        return true;
      },
    });
    register(`${namePrefix}.images` as any, {
      validate: (v: any) => {
        const arr: File[] = Array.isArray(v) ? v : [];
        if (limits?.maxImages && arr.length > (limits.maxImages ?? 0))
          return `Max ${limits.maxImages} images`;
        if (
          limits?.maxSize &&
          arr.some((f) => f instanceof File && f.size > (limits.maxSize ?? 0))
        )
          return `Each image must be <= ${Math.round((limits.maxSize ?? 0) / 1024 / 1024)}MB`;
        return true;
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [namePrefix]);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const next = [...images, ...Array.from(list)];
    setValue(`${namePrefix}.images`, next, {
      shouldDirty: true,
      shouldValidate: true,
    });
    trigger(`${namePrefix}.images`);
  };
  const replaceAt = (idx: number, file: File | null) => {
    if (!file) return;
    const next = [...images];
    next[idx] = file;
    setValue(`${namePrefix}.images`, next, {
      shouldDirty: true,
      shouldValidate: true,
    });
    trigger(`${namePrefix}.images`);
  };
  const removeAt = (idx: number) => {
    const next = images.filter((_, i) => i !== idx);
    setValue(`${namePrefix}.images`, next, {
      shouldDirty: true,
      shouldValidate: true,
    });
    trigger(`${namePrefix}.images`);
  };

  return (
    <div className="flex items-start gap-4 rounded border p-3">
      {/* Color Image (swatch) */}
      <div className="w-28">
        <div className="text-xs text-muted-foreground mb-1">Color Image</div>
        <label className="block h-8 w-8 rounded border overflow-hidden cursor-pointer">
          <input
            type="file"
            className="hidden"
            accept={Array.isArray(accept) ? accept.join(',') : undefined}
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              if (!file) return;
              setValue(`${namePrefix}.swatch`, file as any, {
                shouldDirty: true,
                shouldValidate: true,
              });
              trigger(`${namePrefix}.swatch`);
            }}
          />
          {swatchUrl ? (
            <img
              src={swatchUrl}
              alt={`${color}-swatch`}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full grid place-items-center text-xs text-muted-foreground">
              +
            </div>
          )}
        </label>
      </div>

      {/* Color name */}
      <div className="w-40">
        <div className="text-xs text-muted-foreground mb-1">Color</div>
        <Input value={color} readOnly className="capitalize" />
      </div>

      {/* Product images for this color */}
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            Color Product Images
          </div>
          <div className="flex items-center gap-2 text-sm">
            <button
              type="button"
              className="inline-flex items-center gap-1 text-blue-600 underline"
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.multiple = true;
                input.accept = Array.isArray(accept) ? accept.join(',') : '';
                input.onchange = (e: any) => addFiles(e.target.files);
                input.click();
              }}
            >
              <Upload className="h-3 w-3" /> Upload
            </button>
            <span className="text-muted-foreground">|</span>
            <button
              type="button"
              className="text-blue-600 underline"
              onClick={() => {
                /* TODO: media center */
              }}
            >
              Media Center
            </button>
          </div>
        </div>
        <div className="min-h-[56px] w-full rounded border border-dashed p-2">
          <div className="flex flex-wrap gap-2">
            {/* Add tile */}
            <label className="flex h-12 w-12 cursor-pointer items-center justify-center rounded border text-xs text-muted-foreground hover:bg-accent/30">
              <input
                type="file"
                className="hidden"
                accept={Array.isArray(accept) ? accept.join(',') : undefined}
                multiple
                onChange={(e) => addFiles(e.target.files)}
              />
              <ImagePlus className="h-4 w-4" />
            </label>
            {urls.map((src, idx) => (
              <div
                key={idx}
                className="group relative h-12 w-12 overflow-hidden rounded border"
              >
                {src ? (
                  <img src={src} className="h-full w-full object-cover" />
                ) : null}
                <div className="absolute inset-0 hidden items-center justify-center gap-2 bg-black/40 group-hover:flex">
                  <button
                    type="button"
                    className="h-6 w-6 rounded bg-white/90 grid place-items-center"
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = Array.isArray(accept)
                        ? accept.join(',')
                        : '';
                      input.onchange = (e: any) =>
                        replaceAt(idx, e.target.files?.[0] ?? null);
                      input.click();
                    }}
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    className="h-6 w-6 rounded bg-white/90 grid place-items-center text-red-600"
                    onClick={() => removeAt(idx)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          {(formState.errors as any)?.[`${namePrefix}.images`] ? (
            <div className="text-xs text-red-500 mt-1">
              {
                (formState.errors as any)[`${namePrefix}.images`]
                  ?.message as string
              }
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ColorInlineField({ field }: UiProps) {
  const { watch } = useFormContext();
  const colorField: string =
    field.dataSource?.colorField ??
    field.dataSource?.variants?.find((v: any) =>
      /color/i.test(v?.label ?? v?.key),
    )?.key ??
    'color';
  const labelsMap: Record<string, Record<string, string>> =
    (field.dataSource?.labels as any) ?? {};
  const labelOf = (value: string) =>
    labelsMap?.[colorField]?.[String(value)] ?? String(value);
  const accept: string[] | undefined = field.rule?.accept ?? ['image/*'];
  const limits = {
    maxImages: field.rule?.maxItems ?? 8,
    maxSize: field.rule?.maxSize,
  };
  const selected = watch(colorField);
  const colors: string[] = Array.isArray(selected)
    ? selected
    : selected
      ? [selected]
      : [];
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm">
        <LabelWithRequired required={field.required}>
          {field.label}
        </LabelWithRequired>
        <span className="text-xs text-muted-foreground">
          Max {limits.maxImages} images for each variant
        </span>
      </div>
      {colors.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          Select one or more colors first.
        </div>
      ) : (
        <div className="space-y-2">
      {colors.map((c) => (
            <ColorInlineRow
              key={c}
        color={labelOf(c)}
              namePrefix={`variants.colorMeta.${c}`}
              accept={accept}
              limits={limits}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export const uiTypeRegistry: Record<UiType, React.FC<UiProps>> = {
  input: InputField,
  number: NumberField,
  Switch: SwitchField,
  select: SelectField,
  multiselect: MultiSelectField,
  VariantList: VariantListField,
  MainImage: MainImageField,
  SkuTableV2: SkuTableField,
  ColorMeta: ColorMetaField,
  ColorInline: ColorInlineField,
};
