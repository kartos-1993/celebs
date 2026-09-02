import { RefreshCw, Search, Trash2 } from 'lucide-react';

import type { MediaQuota } from '@celebs/shared-types';
import { Button } from '@celebs/shared-ui/components/button';
import { Input } from '@celebs/shared-ui/components/input';
import { Spinner } from '@celebs/shared-ui/components/spinner';

interface Props {
  searchTerm: string;
  onSearchChange: (v: string) => void;
  unusedOnly: boolean;
  onToggleUnused: () => void;
  quota?: MediaQuota | null;
  onCleanup: () => void;
  isCleaning: boolean;
  onRefresh: () => void;
}

export function MediaCenterToolbar({
  searchTerm,
  onSearchChange,
  unusedOnly,
  onToggleUnused,
  quota,
  onCleanup,
  isCleaning,
  onRefresh,
}: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-card p-3 shadow-xs">
      <div className="relative min-w-[200px] max-w-sm flex-1">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name…"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-9 pl-9 text-xs"
        />
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant={unusedOnly ? 'default' : 'outline'}
          size="sm"
          onClick={onToggleUnused}
          className="h-9 text-xs"
        >
          {unusedOnly ? 'Showing Unused' : 'Filter Unused'}
        </Button>
        {quota && quota.unlinkedAssetCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={onCleanup}
            disabled={isCleaning}
            className="h-9 border-warning/40 text-xs text-warning hover:bg-warning/10"
          >
            {isCleaning ? (
              <Spinner size="sm" className="mr-1" />
            ) : (
              <Trash2 className="mr-1 h-3.5 w-3.5" />
            )}
            {isCleaning ? 'Cleaning…' : `Clean Unused (${quota.unlinkedAssetCount})`}
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onRefresh}
          title="Refresh"
          className="h-9 w-9 text-muted-foreground"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
