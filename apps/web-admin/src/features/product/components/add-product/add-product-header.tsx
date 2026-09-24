import { memo } from 'react';

import { Button } from '@celebs/shared-ui/components/button';

interface AddProductHeaderProps {
  isEditMode: boolean;
  onAutofill?: () => void;
}

export const AddProductHeader = memo(function AddProductHeader({
  isEditMode,
  onAutofill,
}: AddProductHeaderProps) {
  return (
    <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {isEditMode ? 'Update Product' : 'Create a new product listing'}
          </h1>
          {process.env.NODE_ENV === 'development' && onAutofill && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onAutofill}
              className="h-8 rounded-full border-warning/30 bg-warning/10 px-3 text-xs font-semibold text-warning hover:bg-warning/20"
            >
              Autofill Form
            </Button>
          )}
        </div>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Complete the required catalog information, upload compliant media, and verify pricing
          before submitting the product.
        </p>
      </div>
    </div>
  );
});
