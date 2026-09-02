import {
  Download,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  Link2,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react';

import type { MediaAsset } from '@celebs/shared-types';
import { Button } from '@celebs/shared-ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@celebs/shared-ui/components/dropdown-menu';

import { downloadMediaAsset, exportMediaAssetCsv } from './media-asset-actions';

interface Props {
  asset: MediaAsset;
  onPreview: (a: MediaAsset) => void;
  onEdit: (a: MediaAsset) => void;
  onDelete: (a: MediaAsset) => void;
  onCopy: (url: string) => void;
}

export function MediaCardMenu({ asset, onPreview, onEdit, onDelete, onCopy }: Props) {
  return (
    <div className="absolute top-1.5 right-1.5 z-10" onClick={(e) => e.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="secondary"
            size="icon"
            className="h-7 w-7 rounded-full bg-white/90 shadow-md backdrop-blur hover:bg-white"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={() => onPreview(asset)}>
            <Eye className="mr-2 h-3.5 w-3.5" /> View details
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onEdit(asset)}>
            <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onDelete(asset)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onCopy(asset.url)}>
            <Link2 className="mr-2 h-3.5 w-3.5" /> Copy Link
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => window.open(asset.url, '_blank')}>
            <ExternalLink className="mr-2 h-3.5 w-3.5" /> Open in new tab
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => downloadMediaAsset(asset)}>
            <Download className="mr-2 h-3.5 w-3.5" /> Download
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => exportMediaAssetCsv(asset)}>
            <FileSpreadsheet className="mr-2 h-3.5 w-3.5" /> Export URLs
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
