import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Send } from 'lucide-react';

import { Button } from '@celebs/shared-ui/components/button';
import { Input } from '@celebs/shared-ui/components/input';
import { Spinner } from '@celebs/shared-ui/components/spinner';

import { resendVerification } from '../api';

import { useResendCooldown } from '@/common/hooks/use-resend-cooldown';
import { PATHS } from '@/routes/paths';

interface VerifyEmailResendCardProps {
  initialEmail?: string;
  errorMessage: string;
}

export function VerifyEmailResendCard({
  initialEmail = '',
  errorMessage,
}: VerifyEmailResendCardProps) {
  const navigate = useNavigate();
  const [resendEmail, setResendEmail] = useState(initialEmail);
  const [resendStatus, setResendStatus] = useState<{
    loading: boolean;
    message?: string;
    error?: string;
  }>({ loading: false });

  const { secondsRemaining, isCoolingDown, startCooldown } = useResendCooldown(
    'verify_email_resend_cooldown',
    60,
  );

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail || isCoolingDown) return;

    setResendStatus({ loading: true });
    try {
      await resendVerification({ email: resendEmail });
      startCooldown();
      setResendStatus({
        loading: false,
        message: `Fresh activation email sent to ${resendEmail}. Please check your inbox.`,
      });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to resend verification email';
      setResendStatus({ loading: false, error: msg });
    }
  };

  return (
    <div className="space-y-6 max-w-md w-full bg-card p-6 rounded-lg border shadow-sm text-left">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Verification Failed or Expired
        </h2>
        <p className="text-xs text-muted-foreground">{errorMessage}</p>
      </div>

      {resendStatus.message && (
        <div className="p-3 bg-success/10 border border-success/30 text-success text-xs rounded-md flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{resendStatus.message}</span>
        </div>
      )}

      {resendStatus.error && (
        <div className="p-3 bg-destructive/10 border border-destructive/30 text-destructive text-xs rounded-md flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{resendStatus.error}</span>
        </div>
      )}

      <form onSubmit={handleResend} className="space-y-3 pt-2">
        <label className="text-xs font-semibold text-foreground block">
          Enter Email Address to Resend Verification:
        </label>
        <Input
          type="email"
          placeholder="e.g. vendor@domain.com"
          value={resendEmail}
          onChange={(e) => setResendEmail(e.target.value)}
          required
          className="text-sm"
        />
        <Button
          type="submit"
          disabled={resendStatus.loading || isCoolingDown || !resendEmail}
          className="w-full gap-2 font-semibold"
        >
          {resendStatus.loading ? (
            <>
              <Spinner size="sm" /> Resending Link...
            </>
          ) : isCoolingDown ? (
            <>Resend Link in {secondsRemaining}s...</>
          ) : (
            <>
              <Send className="w-4 h-4" /> Resend Verification Link
            </>
          )}
        </Button>
      </form>

      <div className="pt-2 border-t flex justify-center">
        <Button variant="ghost" onClick={() => navigate(PATHS.AUTH.LOGIN)} className="text-xs">
          Back to Login
        </Button>
      </div>
    </div>
  );
}
