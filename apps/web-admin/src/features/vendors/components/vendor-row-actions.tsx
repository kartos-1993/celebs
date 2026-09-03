import { Check, Eye, X } from 'lucide-react';

import { Button } from '@celebs/shared-ui/components/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@celebs/shared-ui/components/tooltip';

interface VendorRowActionsProps {
  status: string;
  onInspect: () => void;
  onApprove: () => void;
  onReject: () => void;
  isActionPending: boolean;
}

/** Icon-only approve/inspect/reject actions shared by table and cards. */
export function VendorRowActions({
  status,
  onInspect,
  onApprove,
  onReject,
  isActionPending,
}: VendorRowActionsProps) {
  return (
    <TooltipProvider>
      <div className="flex items-center gap-0.5 md:justify-end">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              onClick={onInspect}
            >
              <Eye className="h-4 w-4" />
              <span className="sr-only">Inspect documents</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Inspect documents</TooltipContent>
        </Tooltip>

        {status !== 'APPROVED' && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-success hover:bg-success/10 hover:text-success"
                onClick={onApprove}
                disabled={isActionPending}
              >
                <Check className="h-4 w-4" />
                <span className="sr-only">Approve vendor</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Approve vendor</TooltipContent>
          </Tooltip>
        )}

        {status !== 'REJECTED' && status !== 'APPROVED' && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={onReject}
                disabled={isActionPending}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Reject vendor</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reject vendor</TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
