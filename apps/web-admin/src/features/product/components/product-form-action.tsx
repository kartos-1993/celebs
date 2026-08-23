import { FileText, Upload } from 'lucide-react';

import { Button } from '@celebs/shared-ui/components/button';
import { Spinner } from '@celebs/shared-ui/components/spinner';

interface ProductFormActionsProps {
  isDirty: boolean;
  isReady: boolean;
  isSubmitting?: boolean;
  onCancel: () => void;
  onSaveAsDraft: () => void;
}

const ProductFormActions = ({
  isDirty,
  isReady,
  isSubmitting = false,
  onCancel,
  onSaveAsDraft,
}: ProductFormActionsProps) => {
  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-6 shadow-xs md:flex-row md:items-center md:justify-between">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">
          {isReady ? 'Ready to publish' : 'More details are still required'}
        </p>
        <p className="text-sm text-muted-foreground">
          {isDirty
            ? 'You have unsaved changes in this product draft.'
            : 'Current changes are already saved locally.'}
        </p>
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
          {isReady ? 'Publish Product' : 'Submit for Review'}
        </Button>
      </div>
    </div>
  );
};

export default ProductFormActions;
