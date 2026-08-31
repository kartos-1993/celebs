import { useState } from 'react';
import { CheckCircle2, Send } from 'lucide-react';

import { Button } from '@celebs/shared-ui/components/button';
import { Spinner } from '@celebs/shared-ui/components/spinner';

import { resendVerification } from '../api';

import { useResendCooldown } from '@/common/hooks/use-resend-cooldown';

interface ResendBannerButtonProps {
  email: string;
}

export function ResendBannerButton({ email }: ResendBannerButtonProps) {
  const [status, setStatus] = useState<{ loading: boolean; message?: string; error?: string }>({
    loading: false,
  });
  const { secondsRemaining, isCoolingDown, startCooldown } = useResendCooldown(
    'login_resend_cooldown',
    60,
  );

  const handleResend = async () => {
    if (!email || isCoolingDown) return;
    setStatus({ loading: true });
    try {
      await resendVerification({ email });
      startCooldown();
      setStatus({
        loading: false,
        message: 'Fresh activation email sent! Please check your inbox.',
      });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to resend email';
      setStatus({ loading: false, error: msg });
    }
  };

  if (status.message) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-success font-medium pt-1">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>{status.message}</span>
      </div>
    );
  }

  return (
    <div className="pt-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={status.loading || isCoolingDown || !email}
        onClick={handleResend}
        className="text-xs h-8 w-full gap-1.5"
      >
        {status.loading ? (
          <>
            <Spinner size="sm" /> Resending Link...
          </>
        ) : isCoolingDown ? (
          <>Resend Link in {secondsRemaining}s...</>
        ) : (
          <>
            <Send className="w-3.5 h-3.5" /> Resend Verification Link
          </>
        )}
      </Button>
      {status.error && <div className="text-xs text-destructive pt-1">{status.error}</div>}
    </div>
  );
}
