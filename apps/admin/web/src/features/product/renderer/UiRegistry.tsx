import React from 'react';
import { Control, useController, useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ProductAPI } from '@/lib/axios-client';

export type UiType = 'input' | 'number' | 'Switch' | 'select' | 'multiSelect' | 'SkuTableV2' | 'MainImage';

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

function InputField({ field, control }: UiProps) {
  const { field: f } = useController({ name: field.name, control });
  return (
    <div className="space-y-1">
  <Label className="font-medium">{field.label}</Label>
  <Input {...f} placeholder={field.label} />
    </div>
  );
}

function NumberField({ field, control }: UiProps) {
  const { field: f } = useController({ name: field.name, control });
  return (
    <div className="space-y-1">
  <Label className="font-medium">{field.label}</Label>
  <Input type="number" {...f} placeholder={field.label} />
    </div>
  );
}

function SwitchField({ field, control }: UiProps) {
  const { field: f } = useController({ name: field.name, control });
  return (
    <label className="flex items-center gap-2">
      <Checkbox checked={!!f.value} onCheckedChange={(val) => f.onChange(!!val)} />
      <span className="text-sm">{field.label}</span>
    </label>
  );
}

function useOptions(field: FieldSpec) {
  const [opts, setOpts] = React.useState<Array<{ label: string; value: string }>>([]);
  React.useEffect(() => {
    (async () => {
      const ds = field.dataSource;
      if (!ds) return setOpts([]);
      if (Array.isArray(ds)) return setOpts(ds);
      if (ds.fetch) {
        const res = await ProductAPI.get(ds.fetch);
        const data = res.data;
        const values = data?.data?.values ?? data?.values ?? data?.data ?? [];
        const normalized = Array.isArray(values)
          ? values.map((v: any) =>
              typeof v === 'string' ? { label: v, value: v } : { label: v.label ?? v.name ?? String(v.value), value: v.value ?? v.label ?? v.name }
            )
          : [];
        setOpts(normalized);
      }
    })();
  }, [field.dataSource]);
  return opts;
}

function SelectField({ field, control }: UiProps) {
  const { field: f } = useController({ name: field.name, control });
  const opts = useOptions(field);
  return (
    <div className="space-y-1">
      <Label className="font-medium">{field.label}</Label>
      <Select value={f.value ?? ''} onValueChange={f.onChange}>
        <SelectTrigger>
          <SelectValue placeholder={`Select ${field.label}`} />
        </SelectTrigger>
        <SelectContent>
          {opts.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function MultiSelectField({ field, control }: UiProps) {
  const { field: f } = useController({ name: field.name, control });
  const opts = useOptions(field);
  const value: string[] = Array.isArray(f.value) ? f.value : [];
  const toggle = (v: string) => {
    if (value.includes(v)) f.onChange(value.filter((x) => x !== v));
    else f.onChange([...value, v]);
  };
  return (
    <div className="space-y-1">
      <Label className="font-medium">{field.label}</Label>
      <div className="rounded border p-2 space-y-1">
        {opts.map((o) => (
          <label key={o.value} className="flex items-center gap-2">
            <Checkbox checked={value.includes(o.value)} onCheckedChange={() => toggle(o.value)} />
            <span className="text-sm">{o.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function MainImageField({ field }: UiProps) {
  const { setValue } = useFormContext();
  return (
    <div className="space-y-2">
      <Label className="font-medium">{field.label}</Label>
      <div className="grid grid-cols-3 gap-3">
        <label className="flex h-24 cursor-pointer items-center justify-center rounded border border-dashed text-sm text-muted-foreground hover:bg-accent/30">
          <input
            type="file"
            className="hidden"
            accept={Array.isArray(field.rule?.accept) ? field.rule.accept.join(',') : undefined}
            multiple
            onChange={(e) => setValue(field.name, Array.from(e.target.files ?? []))}
          />
          + Add Image
        </label>
        <div className="flex h-24 items-center justify-center rounded border bg-muted/30 text-xs text-muted-foreground">Long Image</div>
        <div className="flex h-24 items-center justify-center rounded border bg-muted/30 text-xs text-muted-foreground">White Background</div>
      </div>
      <div className="text-xs text-muted-foreground">
        {field.rule?.maxItems ? (
          <>Max {field.rule.maxItems} images</>
        ) : null}
        {Array.isArray(field.rule?.accept) ? (
          <>
            {' '}• Accepted: {field.rule.accept.join(', ')} • Max size ~ {Math.round((field.rule?.maxSize ?? 0) / 1024 / 1024)}MB
          </>
        ) : null}
      </div>
    </div>
  );
}

function SkuTableField({ field, control }: UiProps) {
  const axes: Array<{ key: string; label: string }> = field.dataSource ?? [];
  const { field: price } = useController({ name: 'sku.default.price', control });
  const { field: specialPrice } = useController({ name: 'sku.default.specialPrice', control });
  const { field: stock } = useController({ name: 'sku.default.stock', control });
  const { field: sellerSku } = useController({ name: 'sku.default.sellerSku', control });
  const { field: freeItems } = useController({ name: 'sku.default.freeItems', control });

  return (
    <div className="space-y-2">
      <div className="font-medium">{field.label}</div>
      <div className="text-sm text-muted-foreground">
        {axes.length
          ? `SKU Matrix generated from: ${axes.map((a) => a.label).join(' × ')}`
          : 'No variants selected. Using default SKU.'}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[120px]">Price</TableHead>
            <TableHead>Special Price</TableHead>
            <TableHead>Stock</TableHead>
            <TableHead>SellerSKU</TableHead>
            <TableHead>Free Items</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell><Input type="number" {...price} placeholder="0" /></TableCell>
            <TableCell><Input type="number" {...specialPrice} placeholder="0" /></TableCell>
            <TableCell><Input type="number" {...stock} placeholder="0" /></TableCell>
            <TableCell><Input {...sellerSku} placeholder="SKU" /></TableCell>
            <TableCell><Input type="number" {...freeItems} placeholder="0" /></TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

export const uiTypeRegistry: Record<UiType, React.FC<UiProps>> = {
  input: InputField,
  number: NumberField,
  Switch: SwitchField,
  select: SelectField,
  multiSelect: MultiSelectField,
  MainImage: MainImageField,
  SkuTableV2: SkuTableField,
};

