import { XCircle, RefreshCw } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@celebs/shared-ui/components/button';
import { resubmitForReview } from '../api';
import { useAuthContext } from '@/context/auth-provider';

interface RejectionScreenProps {
  rejectionReason?: string;
}

export const RejectionScreen = ({ rejectionReason }: RejectionScreenProps) => {
  const { refetch } = useAuthContext();

  const resubmitMutation = useMutation({
    mutationFn: resubmitForReview,
    onSuccess: () => {
      refetch();
    },
  });

  return (
    <div className="flex flex-col items-center text-center gap-6 py-8">
      {/* Rejection icon */}
      <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
        <XCircle className="w-10 h-10 text-destructive" />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Application Not Approved</h1>
        <p className="text-muted-foreground text-sm max-w-sm">
          Your seller application was reviewed and could not be approved at this time. Please review
          the reason below and resubmit.
        </p>
      </div>

      {/* Rejection reason */}
      {rejectionReason && (
        <div className="w-full max-w-sm border border-destructive/30 rounded-lg p-4 text-left bg-destructive/5">
          <h3 className="text-sm font-semibold text-destructive mb-1">Reason for rejection</h3>
          <p className="text-sm text-foreground">{rejectionReason}</p>
        </div>
      )}

      <div className="w-full max-w-sm border rounded-lg p-4 text-left bg-card space-y-2">
        <h3 className="text-sm font-semibold">What to do next</h3>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
          <li>Review the rejection reason above</li>
          <li>Update your business documents or information</li>
          <li>Click "Resubmit Application" when ready</li>
        </ul>
      </div>

      {resubmitMutation.isError && (
        <p className="text-sm text-destructive">Failed to resubmit. Please try again.</p>
      )}

      <Button
        onClick={() => resubmitMutation.mutate()}
        disabled={resubmitMutation.isPending}
        className="w-full max-w-sm"
      >
        {resubmitMutation.isPending ? (
          <>
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            Resubmitting...
          </>
        ) : (
          <>
            <RefreshCw className="w-4 h-4 mr-2" />
            Resubmit Application
          </>
        )}
      </Button>
    </div>
  );
};
