import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { verifyEmail } from '../api';
import { Button } from '@celebs/shared-ui/components/button';
import { PATHS } from '@/routes/paths';
import { useAuthContext } from '@/context/auth-provider';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const code = searchParams.get('code');

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState('');

  const { user, refetch } = useAuthContext();
  const hasAttemptedRef = useRef(false);

  useEffect(() => {
    // If the user is already verified (e.g. refreshed after verification), skip API call
    if (user?.isEmailVerified) {
      setStatus('success');
      setTimeout(() => {
        navigate(PATHS.VENDORS.ONBOARDING, { replace: true });
      }, 1200);
      return;
    }

    if (!code) {
      setStatus('error');
      setErrorMessage('Verification code is missing from the link.');
      return;
    }

    // Prevent duplicate API calls from React 18 StrictMode double-invocation
    if (hasAttemptedRef.current) return;
    hasAttemptedRef.current = true;

    verifyEmail({ code })
      .then(() => {
        setStatus('success');
        refetch();
        setTimeout(() => {
          navigate(PATHS.VENDORS.ONBOARDING, { replace: true });
        }, 1800);
      })
      .catch(async (err: { response?: { data?: { message?: string } } }) => {
        refetch();
        if (user?.isEmailVerified) {
          setStatus('success');
          setTimeout(() => {
            navigate(PATHS.VENDORS.ONBOARDING, { replace: true });
          }, 1200);
          return;
        }

        setStatus('error');
        setErrorMessage(
          err?.response?.data?.message || 'Verification link is invalid or has expired.',
        );
      });
  }, [code, navigate, refetch, user?.isEmailVerified]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center space-y-4">
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
            ✓
          </div>
          <h2 className="text-2xl font-bold text-green-700">Email Verified Successfully!</h2>
          <p className="text-sm text-muted-foreground">Redirecting you to store setup portal...</p>
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-4 max-w-md">
          <div className="w-12 h-12 bg-red-100 text-red-700 rounded-full flex items-center justify-center text-2xl mx-auto font-bold">
            ✕
          </div>
          <h2 className="text-xl font-bold text-red-700">Verification Failed</h2>
          <p className="text-sm text-muted-foreground">{errorMessage}</p>
          <div className="pt-2 flex justify-center gap-3">
            <Button onClick={() => navigate(PATHS.AUTH.LOGIN)}>Go to Login</Button>
          </div>
        </div>
      )}
    </div>
  );
}
