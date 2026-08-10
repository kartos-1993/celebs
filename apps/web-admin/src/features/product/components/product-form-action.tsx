import { Button } from '@celebs/shared-ui/components/button';
import { FileText, Loader, Upload } from 'lucide-react';

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
    <div className="flex flex-col gap-4 rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 md:flex-row md:items-center md:justify-between">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {isReady ? 'Ready to publish' : 'More details are still required'}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
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
          className="rounded-full border-gray-200 px-5 dark:border-gray-700"
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onSaveAsDraft}
          disabled={isSubmitting}
          className="rounded-full border-orange-200 bg-orange-50 px-5 text-orange-700 hover:bg-orange-100 hover:text-orange-800 dark:border-orange-900/60 dark:bg-orange-950/40 dark:text-orange-300 dark:hover:bg-orange-950/60"
        >
          <FileText className="mr-2 h-4 w-4" />
          Save Draft
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="rounded-full bg-orange-500 px-5 text-white hover:bg-orange-600"
        >
          {isSubmitting ? (
            <Loader className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          {isSubmitting ? 'Submitting...' : 'Submit Product'}
        </Button>
      </div>
    </div>
  );
};

export default ProductFormActions;
