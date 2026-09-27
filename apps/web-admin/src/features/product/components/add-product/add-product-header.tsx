import { memo } from 'react';
import { Printer } from 'lucide-react';

import { Button } from '@celebs/shared-ui/components/button';

import { canPrintBarcodes } from '../barcode/barcode-builder';

interface AddProductHeaderProps {
  isEditMode: boolean;
  onAutofill?: () => void;
  onPrintBarcodes?: () => void;
}

export const AddProductHeader = memo(function AddProductHeader({
  isEditMode,
  onAutofill,
  onPrintBarcodes,
}: AddProductHeaderProps) {
  const canPrint = canPrintBarcodes(undefined, { isEditMode });
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
          {canPrint && onPrintBarcodes && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onPrintBarcodes}
              className="h-8 gap-1.5 rounded-full text-xs font-semibold"
            >
              <Printer className="h-3.5 w-3.5" />
              Print Barcodes
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
