import { Button } from '@/components/ui/button';
import { Save, Upload, Clock, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProductFormActionsProps {
  isValid: boolean;
  onSaveAsDraft: () => void;
  onPublish: () => void;
  onCancel: () => void;
  isDirty: boolean;
  isSubmitting?: boolean;
}

const ProductFormActions = ({
  isValid,
  onSaveAsDraft,
  onPublish,
  onCancel,
  isDirty,
  isSubmitting = false,
}: ProductFormActionsProps) => {
  const { toast } = useToast();

  const handleSaveAsDraft = () => {
    onSaveAsDraft();
    toast({
      title: 'Draft Saved',
      description:
        'Your product has been saved as a draft. You can continue editing later.',
    });
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center p-4 bg-gray-50 rounded-lg border">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        {isDirty && (
          <>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span>You have unsaved changes</span>
          </>
        )}
        {!isDirty && (
          <>
            <Clock className="h-4 w-4 text-green-500" />
            <span>All changes saved</span>
          </>
        )}
      </div>

      <div className="flex gap-2 w-full sm:w-auto">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 sm:flex-none"
        >
          Cancel
        </Button>

        <Button
          type="button"
          variant="secondary"
          onClick={handleSaveAsDraft}
          disabled={isSubmitting}
          className="flex-1 sm:flex-none"
        >
          <Clock className="mr-2 h-4 w-4" />
          Save as Draft
        </Button>

        <Button
          type="submit"
          className="bg-fashion-700 hover:bg-fashion-800 flex-1 sm:flex-none"
          disabled={!isValid || isSubmitting}
        >
          <Upload className="mr-2 h-4 w-4" />
          {isSubmitting ? 'Publishing...' : 'Publish Product'}
        </Button>
      </div>
    </div>
  );
};

export default ProductFormActions;
