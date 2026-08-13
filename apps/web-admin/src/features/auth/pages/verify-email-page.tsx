import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { verifyEmail, resendVerification } from '../api';
import { Button } from '@celebs/shared-ui/components/button';
import { Input } from '@celebs/shared-ui/components/input';
import { PATHS } from '@/routes/paths';
import { useAuthContext } from '@/context/auth-provider';
import { useResendCooldown } from '@/common/hooks/use-resend-cooldown';
import { RefreshCw, Send, CheckCircle2, AlertCircle } from 'lucide-react';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialCode = searchParams.get('code');

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [resendStatus, setResendStatus] = useState<{ loading: boolean; message?: string; error?: string }>({
    loading: false,
  });

  const { user, refetch } = useAuthContext();
  const hasAttemptedRef = useRef(false);
  const { secondsRemaining, isCoolingDown, startCooldown } = useResendCooldown('verify_email_resend_cooldown', 60);

  useEffect(() => {
    if (user?.email && !resendEmail) {
      setResendEmail(user.email);
    }
  }, [user?.email, resendEmail]);

  useEffect(() => {
    // If the user is already verified, skip API call and navigate
    if (user?.isEmailVerified) {
      setStatus('success');
      setTimeout(() => {
        const targetPath =
          user?.role === 'VENDOR' && user?.vendorProfile?.status !== 'APPROVED'
            ? PATHS.VENDORS.ONBOARDING
            : PATHS.DASHBOARD;
        navigate(targetPath, { replace: true });
      }, 1200);
      return;
    }

    if (!initialCode) {
      setStatus('error');
      setErrorMessage('Verification link is missing or expired. Please request a new verification email.');
      return;
    }

    // Prevent duplicate API calls from React 18 StrictMode double-invocation
    if (hasAttemptedRef.current) return;
    hasAttemptedRef.current = true;

    // Immediately strip ?code=... from URL bar to prevent refresh loops
    if (typeof window !== 'undefined' && window.history?.replaceState) {
      window.history.replaceState({}, '', window.location.pathname);
    }

    verifyEmail({ code: initialCode })
      .then(() => {
        setStatus('success');
        refetch();
        setTimeout(() => {
          const targetPath =
            user?.role === 'VENDOR' && user?.vendorProfile?.status !== 'APPROVED'
              ? PATHS.VENDORS.ONBOARDING
              : PATHS.DASHBOARD;
          navigate(targetPath, { replace: true });
        }, 1500);
      })
      .catch((err: { response?: { data?: { message?: string } } }) => {
        refetch();
        if (user?.isEmailVerified) {
          setStatus('success');
          setTimeout(() => {
            const targetPath =
              user?.role === 'VENDOR' && user?.vendorProfile?.status !== 'APPROVED'
                ? PATHS.VENDORS.ONBOARDING
                : PATHS.DASHBOARD;
            navigate(targetPath, { replace: true });
          }, 1200);
          return;
        }

        setStatus('error');
        setErrorMessage(
          err?.response?.data?.message || 'Verification link is invalid or has expired.',
        );
      });
  }, [initialCode, navigate, refetch, user?.isEmailVerified, user?.role, user?.vendorProfile?.status]);

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
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center space-y-6">
      {status === 'verifying' && (
        <div className="space-y-3">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <h2 className="text-xl font-bold">Verifying Email Address...</h2>
          <p className="text-sm text-muted-foreground">
            Please wait while we confirm your account token.
          </p>
        </div>
      )}

      {status === 'success' && (
        <div className="space-y-3">
          <div className="w-12 h-12 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-2xl mx-auto font-bold">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-green-700">Email Verified Successfully!</h2>
          <p className="text-sm text-muted-foreground">Redirecting you to portal...</p>
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-6 max-w-md w-full bg-card p-6 rounded-lg border shadow-sm text-left">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Verification Failed or Expired</h2>
            <p className="text-xs text-muted-foreground">{errorMessage}</p>
          </div>

          {resendStatus.message && (
            <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-700 text-xs rounded-md flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{resendStatus.message}</span>
            </div>
          )}

          {resendStatus.error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-md flex items-center gap-2">
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
                  <RefreshCw className="w-4 h-4 animate-spin" /> Resending Link...
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
      )}
    </div>
  );
}
