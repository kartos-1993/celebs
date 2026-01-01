import * as React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { ScrollArea } from './scroll-area';
import { Badge } from './badge';
import { ChevronDown } from 'lucide-react';

export type MultiSelectOption = { label: string; value: string };

export function Multiselect({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  disabled,
}: {
  options: MultiSelectOption[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const selected = Array.isArray(value) ? value : [];
  const setSelected = (next: string[]) => onChange(Array.from(new Set(next)));
  const removeAt = (v: string) => setSelected(selected.filter((x) => x !== v));
  const add = (v: string) => {
    if (!selected.includes(v)) setSelected([...selected, v]);
  };

  const [open, setOpen] = React.useState(false);
  const available = (options || []).filter((o) => !selected.includes(String(o.value)));

  return (
    <div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={`w-full rounded-md border bg-background px-2 py-1 text-sm ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className="flex items-center gap-2">
              <div className="flex min-h-7 flex-1 flex-wrap items-center gap-1">
                {selected.length === 0 ? (
                  <span className="text-muted-foreground">{placeholder}</span>
                ) : (
                  selected.map((v) => {
                    const label = options.find((o) => String(o.value) === String(v))?.label ?? v;
                    return (
                      <Badge key={v} variant="secondary" className="flex items-center gap-1">
                        <span className="capitalize">{label}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            removeAt(v);
                          }}
                          className="ml-1 rounded px-1 text-xs hover:bg-muted"
                          aria-label={`Remove ${label}`}
                        >
                          ×
                        </button>
                      </Badge>
                    );
                  })
                )}
              </div>
              <ChevronDown className="h-4 w-4 opacity-70" />
            </div>
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="p-0 w-56">
          <ScrollArea className="max-h-56 p-2">
            <div className="space-y-1">
              {available.length === 0 ? (
                <div className="px-2 py-1 text-sm text-muted-foreground">All options selected</div>
              ) : (
                available.map((o) => (
                  <button
                    type="button"
                    key={String(o.value)}
                    onClick={() => add(String(o.value))}
                    className="w-full flex items-center justify-between rounded px-2 py-1 text-left hover:bg-accent"
                  >
                    <span className="capitalize text-sm">{o.label}</span>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  );
}
