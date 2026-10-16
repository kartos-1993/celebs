import { useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@celebs/shared-ui/components/alert';
import { Button } from '@celebs/shared-ui/components/button';
import { Spinner } from '@celebs/shared-ui/components/spinner';

import { useResendVerificationMutation } from '../hooks/use-vendor-onboarding-mutations';

import { useAuthContext } from '@/context/auth-provider';

/**
 * Submission is gated server-side until the account email is verified; this
 * notice explains the block and lets vendors resend the link without leaving
 * the wizard.
 */
export function EmailVerificationNotice() {
  const { user } = useAuthContext();
  const resendMutation = useResendVerificationMutation();
  const [resendSent, setResendSent] = useState(false);

  if (!user || user.isEmailVerified) {
    return null;
  }

  const handleResend = () => {
    resendMutation.mutate({ email: user.email }, { onSuccess: () => setResendSent(true) });
  };

  return (
    <Alert className="border-warning/30 bg-warning/10 text-warning">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Verify your email before submitting</AlertTitle>
      <AlertDescription className="text-muted-foreground">
        We sent a verification link to {user.email}. Your application cannot enter review until this
        email address is verified.
      </AlertDescription>
      <div className="mt-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleResend}
          disabled={resendMutation.isPending || resendSent}
        >
          {resendMutation.isPending ? (
            <Spinner size="sm" />
          ) : (
            <>
              <RefreshCw className="w-3.5 h-3.5" />
              {resendSent ? 'Verification email sent' : 'Resend verification email'}
            </>
          )}
        </Button>
      </div>
    </Alert>
  );
}
