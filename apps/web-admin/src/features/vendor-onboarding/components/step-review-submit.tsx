import { CheckCircle2, RefreshCw, Send } from 'lucide-react';

import { Button } from '@celebs/shared-ui/components/button';
import { Spinner } from '@celebs/shared-ui/components/spinner';

import {
  useResubmitVendorMutation,
  useSubmitVendorMutation,
} from '../hooks/use-vendor-onboarding-mutations';

interface StepReviewSubmitProps {
  userProfile?: {
    shopDescription?: string | null;
    businessName?: string | null;
    businessRegNumber?: string | null;
  };
  isRejectedMode: boolean;
  onBack: () => void;
}

export function StepReviewSubmit({ userProfile, isRejectedMode, onBack }: StepReviewSubmitProps) {
  const submitMutation = useSubmitVendorMutation();
  const resubmitMutation = useResubmitVendorMutation();

  const isPending = submitMutation.isPending || resubmitMutation.isPending;
  const isError = submitMutation.isError || resubmitMutation.isError;

  const handleSubmit = () => {
    if (isRejectedMode) {
      resubmitMutation.mutate();
    } else {
      submitMutation.mutate();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold">Step 5: Final Review & Application Submission</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Please confirm that all business documents and addresses are accurate before submitting
          for platform verification.
        </p>
      </div>

      <div className="border rounded-lg p-4 bg-muted/20 space-y-3 text-sm">
        <div className="flex justify-between border-b pb-2">
          <span className="text-muted-foreground text-xs font-medium">
            Store Name / Description
          </span>
          <span className="font-semibold text-foreground text-xs">
            {userProfile?.shopDescription || 'Provided'}
          </span>
        </div>
        <div className="flex justify-between border-b pb-2">
          <span className="text-muted-foreground text-xs font-medium">Business Legal Name</span>
          <span className="font-semibold text-foreground text-xs">
            {userProfile?.businessName || 'Provided'}
          </span>
        </div>
        <div className="flex justify-between border-b pb-2">
          <span className="text-muted-foreground text-xs font-medium">PAN / Registration No.</span>
          <span className="font-semibold text-foreground text-xs">
            {userProfile?.businessRegNumber || 'Provided'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground text-xs font-medium">KYC Documents</span>
          <span className="font-semibold text-success text-xs flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> PAN & Citizenship Uploaded
          </span>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onBack} className="w-1/3">
          Back
        </Button>

        <Button
          className="w-2/3 gap-2 font-bold"
          size="lg"
          onClick={handleSubmit}
          disabled={isPending}
        >
          {isPending ? (
            <>
              <Spinner size="sm" />
              {isRejectedMode ? ' Resubmitting Revision...' : ' Submitting...'}
            </>
          ) : isRejectedMode ? (
            <>
              <RefreshCw className="w-4 h-4" /> Resubmit Application for Review
            </>
          ) : (
            <>
              <Send className="w-4 h-4" /> Submit Profile for Review
            </>
          )}
        </Button>
      </div>

      {isError && (
        <p className="text-xs text-destructive font-medium text-center">
          Failed to submit profile. Please ensure all required steps are filled out.
        </p>
      )}
    </div>
  );
}
