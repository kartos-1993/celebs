import { Crop } from 'lucide-react';

import { Badge } from '@celebs/shared-ui/components/badge';
import { DialogDescription, DialogHeader, DialogTitle } from '@celebs/shared-ui/components/dialog';
import { Input } from '@celebs/shared-ui/components/input';

interface Props {
  editedName: string;
  onNameChange: (val: string) => void;
}

export function MediaCropHeader({ editedName, onNameChange }: Props) {
  return (
    <DialogHeader className="space-y-3 border-b border-border/50 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crop className="h-4 w-4 text-primary" />
          <DialogTitle className="text-base font-bold">Standard 3:4 Fashion Crop</DialogTitle>
        </div>
        <Badge variant="outline" className="font-mono text-xs">
          3:4 Portrait (0.75)
        </Badge>
      </div>
      <DialogDescription className="text-xs text-muted-foreground">
        Drag to reposition and adjust zoom. Name is editable (Daraz 40 char limit).
      </DialogDescription>
      <div className="space-y-1">
        <label className="text-xs font-medium text-foreground">Image name</label>
        <div className="relative">
          <Input
            value={editedName}
            onChange={(e) => onNameChange(e.target.value.slice(0, 40))}
            placeholder="Enter image name"
            className="h-8 pr-16 text-xs"
            maxLength={40}
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] tabular-nums text-muted-foreground">
            {editedName.length}/40
          </span>
        </div>
      </div>
    </DialogHeader>
  );
}
