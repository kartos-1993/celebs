import { FileText, Upload } from 'lucide-react';

import { Button } from '@celebs/shared-ui/components/button';
import { Spinner } from '@celebs/shared-ui/components/spinner';

interface ProductFormActionsProps {
  isDirty: boolean;
  isReady: boolean;
  isSubmitting?: boolean;
  isEditMode?: boolean;
  canPublish?: boolean;
  onCancel: () => void;
  onSaveAsDraft: () => void;
}

const getSubmitButtonLabel = (
  isEditMode: boolean,
  isReady: boolean,
  canPublish: boolean,
): string => {
  if (isEditMode) {
    return canPublish ? 'Save Changes' : 'Submit Changes for Review';
  }
  if (isReady && canPublish) {
    return 'Publish Product';
  }
  return 'Submit for Review';
};

const getStatusHeader = (isReady: boolean, isEditMode: boolean, canPublish: boolean): string => {
  if (!isReady) {
    return 'More details are still required';
  }
  if (isEditMode) {
    return canPublish ? 'Ready to save changes' : 'Ready to submit for review';
  }
  return canPublish ? 'Ready to publish' : 'Ready to submit for review';
};

const ProductFormActions = ({
  isDirty,
  isReady,
  isSubmitting = false,
  isEditMode = false,
  canPublish = false,
  onCancel,
  onSaveAsDraft,
}: ProductFormActionsProps) => {
  const submitLabel = getSubmitButtonLabel(isEditMode, isReady, canPublish);
  const statusHeader = getStatusHeader(isReady, isEditMode, canPublish);
  const dirtyDescription = isDirty
    ? 'You have unsaved changes in this product.'
    : 'Current changes are already saved.';

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
          onClick={onSaveAsDraft}
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
