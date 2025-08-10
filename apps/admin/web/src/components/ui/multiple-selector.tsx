import * as React from 'react';
import { X } from 'lucide-react';
import { Input } from './input';
import { Button } from './button';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

export type MSOption = { label: string; value: string };

export function MultipleSelector({
  value,
  options,
  onChange,
  placeholder,
  creatable = true,
  className,
}: {
  value: string[];
  options: MSOption[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  creatable?: boolean;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const selected = new Set(value);
  const filtered = options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()));
  const add = (val: string) => {
    if (!val) return;
    if (selected.has(val)) return;
    onChange([...value, val]);
    setQuery('');
  };
  const remove = (val: string) => onChange(value.filter((v) => v !== val));
  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const match = options.find((o) => o.label.toLowerCase() === query.toLowerCase() || o.value.toLowerCase() === query.toLowerCase());
      const v = match ? match.value : query.trim();
      if (creatable && v) add(v);
    } else if (e.key === 'Backspace' && !query && value.length) {
      onChange(value.slice(0, -1));
    }
  };
  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-1 rounded border bg-background p-1">
        {value.map((v) => {
          const lbl = options.find((o) => o.value === v)?.label ?? v;
          return (
            <span key={v} className="inline-flex items-center gap-1 rounded bg-accent px-2 py-0.5 text-xs">
              {lbl}
              <button type="button" onClick={() => remove(v)} aria-label={`Remove ${lbl}`}>
                <X className="h-3 w-3" />
              </button>
            </span>
          );
        })}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={placeholder}
              className="border-0 shadow-none focus-visible:ring-0 flex-1 min-w-[140px]"
            />
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-2">
            <div className="space-y-1 max-h-60 overflow-auto">
              {filtered.length ? (
                filtered.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    className="w-full text-left rounded px-2 py-1 hover:bg-accent"
                    onClick={() => add(o.value)}
                  >
                    {o.label}
                  </button>
                ))
              ) : (
                <div className="text-xs text-muted-foreground px-2 py-1">No options</div>
              )}
              {creatable && query.trim() ? (
                <Button type="button" variant="ghost" className="w-full justify-start" onClick={() => add(query.trim())}>
                  Create "{query.trim()}"
                </Button>
              ) : null}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
