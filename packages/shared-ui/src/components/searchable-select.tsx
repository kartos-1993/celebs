import * as React from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';

import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { ScrollArea } from './scroll-area';

export type SelectOption = { label: string; value: string };

export function SearchableSelect({
  options = [],
  value = '',
  onChange,
  placeholder = 'Select...',
  disabled,
}: {
  options: SelectOption[];
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');

  const selectedOption = options.find((o) => String(o.value) === String(value));

  const filteredOptions = React.useMemo(() => {
    if (!search.trim()) return options;
    const term = search.toLowerCase().trim();
    return options.filter((o) => o.label.toLowerCase().includes(term));
  }, [options, search]);

  const handleSelect = (val: string) => {
    onChange(val);
    setOpen(false);
    setSearch('');
  };

  return (
    <div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={`w-full rounded-lg border bg-background px-3 py-2 text-sm transition-colors hover:border-gray-400 dark:hover:border-gray-600 ${
              disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span
                className={`truncate ${!selectedOption ? 'text-muted-foreground' : 'text-foreground font-medium'}`}
              >
                {selectedOption ? selectedOption.label : placeholder}
              </span>
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
              placeholder="Search option..."
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

          {/* Header count */}
          <div className="flex items-center justify-between border-b px-3 py-1.5 text-xs text-muted-foreground bg-muted/10">
            <span>
              {filteredOptions.length} {filteredOptions.length === 1 ? 'option' : 'options'}
            </span>
          </div>

          {/* 2-Column Options Grid */}
          <ScrollArea className="max-h-64 p-2">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No options match "{search}"
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {filteredOptions.map((o) => {
                  const valStr = String(o.value);
                  const isSelected = String(value) === valStr;
                  return (
                    <button
                      type="button"
                      key={valStr}
                      onClick={() => handleSelect(valStr)}
                      className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors ${
                        isSelected
                          ? 'bg-primary/10 text-primary font-semibold dark:bg-primary/20'
                          : 'hover:bg-accent text-foreground'
                      }`}
                    >
                      <span className="capitalize truncate text-xs sm:text-sm">{o.label}</span>
                      {isSelected && (
                        <Check className="h-3.5 w-3.5 text-primary shrink-0 stroke-[3]" />
                      )}
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
