import { useCallback } from 'react';
import { FileText, Upload } from 'lucide-react';

import { Button } from '@celebs/shared-ui/components/button';
import { Spinner } from '@celebs/shared-ui/components/spinner';

import {
  getDraftSaveFailureCopy,
  getStatusHeader,
  getSubmitButtonLabel,
} from './product-form-action-labels';

import { useToast } from '@/hooks/use-toast';

interface ProductFormActionsProps {
  isDirty: boolean;
  isReady: boolean;
  isSubmitting?: boolean;
  isEditMode?: boolean;
  canPublish?: boolean;
  onCancel: () => void;
  /**
   * `useProductDraft.saveDraftNow` reports success by returning `false`. The
   * return value is optional in the type so the memoised container above can
   * keep declaring `() => void` — but the `false` case is the whole point of
   * this prop, so it is treated as a failure and never as a silent no-op.
   */
  onSaveAsDraft: () => boolean | void;
}

const ProductFormActions = ({
  isDirty,
  isReady,
  isSubmitting = false,
  isEditMode = false,
  canPublish = false,
  onCancel,
  onSaveAsDraft,
}: ProductFormActionsProps) => {
  const { toast } = useToast();
  const submitLabel = getSubmitButtonLabel(isEditMode, isReady, canPublish);
  const statusHeader = getStatusHeader(isReady, isEditMode, canPublish);
  const dirtyDescription = isDirty
    ? 'You have unsaved changes in this product.'
    : 'Current changes are already saved.';

  // Same failure surface as the submit path (`use-add-product-submit.ts`): a
  // destructive toast, because a draft that was not written is indistinguishable
  // from a draft that was lost if the click reports nothing at all.
  const handleSaveDraft = useCallback(() => {
    if (onSaveAsDraft() !== false) return;
    toast({ ...getDraftSaveFailureCopy(), variant: 'destructive' });
  }, [onSaveAsDraft, toast]);

  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-6 shadow-xs md:flex-row md:items-center md:justify-between">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{statusHeader}</p>
        <p className="text-sm text-muted-foreground">{dirtyDescription}</p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          data-testid="cancel-btn"
          className="rounded-full border-border px-5"
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleSaveDraft}
          disabled={isSubmitting}
          data-testid="save-draft-btn"
          className="rounded-full px-5"
        >
          <FileText className="mr-2 h-4 w-4" />
          Save Draft
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          data-testid="submit-product-btn"
          className="rounded-full px-5"
        >
          {isSubmitting ? (
            <Spinner size="sm" className="mr-2" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          {submitLabel}
        </Button>
      </div>
    </div>
  );
};

export default ProductFormActions;
