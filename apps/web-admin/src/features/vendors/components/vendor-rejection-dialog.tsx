import React, { useState } from 'react';

import { Button } from '@celebs/shared-ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@celebs/shared-ui/components/dialog';
import { Textarea } from '@celebs/shared-ui/components/textarea';

interface VendorRejectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shopName: string;
  onConfirm: (reason: string) => void;
  isSubmitting: boolean;
}

export const VendorRejectionDialog: React.FC<VendorRejectionDialogProps> = ({
  open,
  onOpenChange,
  shopName,
  onConfirm,
  isSubmitting,
}) => {
  const [reason, setReason] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    onConfirm(reason.trim());
    setReason('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-destructive flex items-center gap-2">
            Reject Vendor Application
          </DialogTitle>
          <DialogDescription>
            Provide a specific reason for rejecting <strong>{shopName}</strong>. This feedback will
            be emailed to the vendor and displayed on their seller dashboard.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">
              Rejection Reason & Moderation Notes <span className="text-destructive">*</span>
            </label>
            <Textarea
              placeholder="e.g. PAN document image is blurry. Please re-upload a clear scanned copy of your PAN certificate."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              required
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={!reason.trim() || isSubmitting}>
              {isSubmitting ? 'Rejecting...' : 'Reject Vendor Application'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
