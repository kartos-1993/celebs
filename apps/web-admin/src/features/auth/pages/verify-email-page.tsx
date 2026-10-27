import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';

import { Spinner } from '@celebs/shared-ui/components/spinner';

import { verifyEmail } from '../api';
import { VerifyEmailResendCard } from '../components/verify-email-resend-card';

import { useAuthContext } from '@/context/auth-provider';
import { PATHS } from '@/routes/paths';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialCode = searchParams.get('code');

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState('');

  const { user, refetch, isVendor } = useAuthContext();
  const hasAttemptedRef = useRef(false);

  useEffect(() => {
    // If user is already logged in & verified, skip API call and redirect
    if (user?.isEmailVerified) {
      setStatus('success');
      const timer = setTimeout(() => {
        const targetPath =
          isVendor && user?.vendorProfile?.status !== 'APPROVED'
            ? PATHS.VENDORS.ONBOARDING
            : PATHS.DASHBOARD;
        navigate(targetPath, { replace: true });
      }, 800);
      return () => clearTimeout(timer);
    }

    if (!initialCode) {
      setStatus('error');
      setErrorMessage(
        'Verification link is missing or expired. Please request a new verification email.',
      );
      return;
    }

    if (hasAttemptedRef.current) return;
    hasAttemptedRef.current = true;

    if (typeof window !== 'undefined' && window.history?.replaceState) {
      window.history.replaceState({}, '', window.location.pathname);
    }

    let isCancelled = false;
    let redirectTimer: ReturnType<typeof setTimeout> | undefined;

    async function executeVerification() {
      try {
        await verifyEmail({ code: initialCode as string });
        if (isCancelled) return;
        setStatus('success');
        await refetch();
        if (isCancelled) return;

        redirectTimer = setTimeout(() => {
          if (!isCancelled) {
            const targetPath =
              isVendor && user?.vendorProfile?.status !== 'APPROVED'
                ? PATHS.VENDORS.ONBOARDING
                : PATHS.DASHBOARD;
            navigate(targetPath, { replace: true });
          }
        }, 1200);
      } catch (err: unknown) {
        if (isCancelled) return;
        setStatus('error');
        const errObj = err as { response?: { data?: { message?: string } } };
        setErrorMessage(
          errObj?.response?.data?.message || 'Verification link is invalid or has expired.',
        );
      }
    }

    executeVerification();

    return () => {
      isCancelled = true;
      if (redirectTimer) clearTimeout(redirectTimer);
    };
  }, [
    initialCode,
    navigate,
    refetch,
    user?.isEmailVerified,
    isVendor,
    user?.vendorProfile?.status,
  ]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center space-y-6">
      {status === 'verifying' && (
        <div className="space-y-3">
          <div className="flex justify-center">
            <Spinner size="xl" className="text-primary" />
          </div>
          <h2 className="text-xl font-semibold tracking-tight">Verifying Email Address...</h2>
          <p className="text-sm text-muted-foreground">
            Please wait while we confirm your account token.
          </p>
        </div>
      )}

      {status === 'success' && (
        <div className="space-y-3">
          <div className="w-12 h-12 bg-success/10 text-success rounded-full flex items-center justify-center text-2xl mx-auto font-bold">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-success">
            Email Verified Successfully!
          </h2>
          <p className="text-sm text-muted-foreground">Redirecting you to portal...</p>
        </div>
      )}

      {status === 'error' && (
        <VerifyEmailResendCard initialEmail={user?.email || ''} errorMessage={errorMessage} />
      )}
    </div>
  );
}
