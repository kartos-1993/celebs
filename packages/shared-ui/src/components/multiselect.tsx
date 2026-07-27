import * as React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { ScrollArea } from './scroll-area';
import { Badge } from './badge';
import { Check, ChevronDown, Search, X } from 'lucide-react';

export type MultiSelectOption = { label: string; value: string };

export function Multiselect({
  options = [],
  value = [],
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
  const selected = React.useMemo(() => (Array.isArray(value) ? value : []), [value]);
  const selectedSet = React.useMemo(() => new Set(selected.map(String)), [selected]);

  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');

  const toggleValue = React.useCallback(
    (val: string) => {
      const stringVal = String(val);
      if (selectedSet.has(stringVal)) {
        onChange(selected.filter((x) => String(x) !== stringVal));
      } else {
        onChange([...selected, stringVal]);
      }
    },
    [selected, selectedSet, onChange],
  );

  const removeValue = React.useCallback(
    (val: string) => {
      const stringVal = String(val);
      onChange(selected.filter((x) => String(x) !== stringVal));
    },
    [selected, onChange],
  );

  const clearAll = React.useCallback(() => {
    onChange([]);
  }, [onChange]);

  const filteredOptions = React.useMemo(() => {
    if (!search.trim()) return options;
    const term = search.toLowerCase().trim();
    return options.filter((o) => o.label.toLowerCase().includes(term));
  }, [options, search]);

  const selectAllFiltered = React.useCallback(() => {
    const next = new Set([...selected, ...filteredOptions.map((o) => String(o.value))]);
    onChange(Array.from(next));
  }, [selected, filteredOptions, onChange]);

  const optionsMap = React.useMemo(() => {
    const map = new Map<string, string>();
    for (let i = 0; i < options.length; i++) {
      map.set(String(options[i].value), options[i].label);
    }
    return map;
  }, [options]);

  return (
    <div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={`w-full rounded-lg border bg-background px-3 py-1.5 text-sm transition-colors hover:border-gray-400 dark:hover:border-gray-600 ${
              disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-h-6 flex-1 flex-wrap items-center gap-1.5">
                {selected.length === 0 ? (
                  <span className="text-muted-foreground">{placeholder}</span>
                ) : (
                  selected.map((v) => {
                    const stringVal = String(v);
                    const label = optionsMap.get(stringVal) ?? stringVal;
                    return (
                      <Badge key={stringVal} variant="secondary" className="flex items-center gap-1 px-2 py-0.5 text-xs font-normal">
                        <span className="capitalize">{label}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            removeValue(stringVal);
                          }}
                          className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20 text-muted-foreground hover:text-foreground"
                          aria-label={`Remove ${label}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })
                )}
              </div>
              <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
            </div>
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="p-0 min-w-[340px] sm:min-w-[420px] max-w-[500px] shadow-lg rounded-xl border"
        >
          {/* Sticky Search Bar */}
          <div className="flex items-center gap-2 border-b px-3 py-2 bg-muted/30">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search attributes..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="rounded p-1 hover:bg-muted text-muted-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Quick Actions Bar */}
          <div className="flex items-center justify-between border-b px-3 py-1.5 text-xs text-muted-foreground bg-muted/10">
            <span>
              {filteredOptions.length} {filteredOptions.length === 1 ? 'option' : 'options'}
            </span>
            <div className="flex items-center gap-3">
              {filteredOptions.length > 0 && (
                <button
                  type="button"
                  onClick={selectAllFiltered}
                  className="font-medium text-primary hover:underline"
                >
                  Select all
                </button>
              )}
              {selected.length > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="font-medium text-destructive hover:underline"
                >
                  Clear ({selected.length})
                </button>
              )}
            </div>
          </div>

          {/* 2-Column Options Grid */}
          <ScrollArea className="max-h-64 p-2">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No attributes match "{search}"
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {filteredOptions.map((o) => {
                  const valStr = String(o.value);
                  const isChecked = selectedSet.has(valStr);
                  return (
                    <button
                      type="button"
                      key={valStr}
                      onClick={() => toggleValue(valStr)}
                      className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors ${
                        isChecked
                          ? 'bg-primary/10 text-primary font-medium dark:bg-primary/20'
                          : 'hover:bg-accent text-foreground'
                      }`}
                    >
                      <div
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                          isChecked
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-muted-foreground/40 bg-background'
                        }`}
                      >
                        {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                      <span className="capitalize truncate text-xs sm:text-sm">{o.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  );
}
