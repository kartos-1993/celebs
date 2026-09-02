import { Button } from '@celebs/shared-ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@celebs/shared-ui/components/dialog';
import { Input } from '@celebs/shared-ui/components/input';
import { Spinner } from '@celebs/shared-ui/components/spinner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderName: string;
  onFolderNameChange: (val: string) => void;
  onCreate: () => void;
  isPending: boolean;
}

export function MediaCreateFolderDialog({
  open,
  onOpenChange,
  folderName,
  onFolderNameChange,
  onCreate,
  isPending,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create new folder</DialogTitle>
        </DialogHeader>
        <div className="py-3">
          <Input
            value={folderName}
            onChange={(e) => onFolderNameChange(e.target.value)}
            placeholder="Folder name (e.g., Product Listing)"
            maxLength={80}
            onKeyDown={(e) => e.key === 'Enter' && onCreate()}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onCreate} disabled={!folderName.trim() || isPending}>
            {isPending && <Spinner size="sm" className="mr-2" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
