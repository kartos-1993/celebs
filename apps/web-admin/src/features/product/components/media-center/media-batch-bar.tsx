import { Button } from '@celebs/shared-ui/components/button';

interface Props {
  selectedCount: number;
  onSelectAll: () => void;
  onClear: () => void;
  onExport: () => void;
  onMove: () => void;
  onDelete: () => void;
  hasSelection: boolean;
}

export function MediaBatchBar({
  selectedCount,
  onSelectAll,
  onClear,
  onExport,
  onMove,
  onDelete,
  hasSelection,
}: Props) {
  if (!hasSelection) return null;
  return (
    <div className="sticky bottom-4 z-20 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-lg">
      <span className="text-sm font-medium">Selected: {selectedCount} Picture</span>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="link" size="sm" onClick={onSelectAll} className="h-7 text-xs">
          Select all
        </Button>
        <Button variant="outline" size="sm" onClick={onClear} className="h-7 text-xs">
          Cancel
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          className="h-7 text-xs border-orange-300 text-orange-600"
        >
          Export URLS
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onMove}
          className="h-7 text-xs border-orange-300 text-orange-600"
        >
          Move to
        </Button>
        <Button variant="destructive" size="sm" onClick={onDelete} className="h-7 text-xs">
          Delete
        </Button>
      </div>
    </div>
  );
}
