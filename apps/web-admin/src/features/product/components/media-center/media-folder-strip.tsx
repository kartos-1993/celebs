import { Folder } from 'lucide-react';

import type { MediaFolder } from '@celebs/shared-types';

import { cn } from '@/lib/utils';

interface Props {
  folders: MediaFolder[];
  selectedFolderId: string | null;
  onSelect: (id: string | null) => void;
}

export function MediaFolderStrip({ folders, selectedFolderId, onSelect }: Props) {
  if (!folders.length) return null;
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">Folder</h3>
      <div className="flex flex-wrap gap-4">
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={cn(
            'flex flex-col items-center gap-1.5 rounded-xl p-2 transition',
            selectedFolderId === null ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted',
          )}
        >
          <div className="flex h-16 w-20 items-center justify-center rounded-lg bg-orange-400 text-white shadow">
            <Folder className="h-8 w-8 fill-white/30" />
          </div>
          <span className="text-xs font-medium">All</span>
        </button>
        {folders.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onSelect(f.id)}
            className={cn(
              'flex flex-col items-center gap-1.5 rounded-xl p-2 transition',
              selectedFolderId === f.id ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted',
            )}
          >
            <div className="flex h-16 w-20 items-center justify-center rounded-lg bg-amber-400 text-white shadow">
              <div className="grid grid-cols-2 gap-0.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-white/80" />
                <span className="h-2.5 w-2.5 rounded-sm bg-white/80" />
                <span className="h-2.5 w-2.5 rounded-sm bg-white/80" />
                <span className="h-2.5 w-2.5 rounded-sm bg-white/80" />
              </div>
            </div>
            <span className="max-w-[80px] truncate text-xs font-medium">{f.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
