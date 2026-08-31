import { ResendBannerButton } from './resend-banner-button';

interface SignInErrorBannerProps {
  serverError: string;
  email: string;
}

export function SignInErrorBanner({ serverError, email }: SignInErrorBannerProps) {
  const needsResend =
    serverError.toLowerCase().includes('verify') ||
    serverError.toLowerCase().includes('unverified');

  return (
    <div className="bg-destructive/15 border border-destructive/30 text-destructive text-sm p-3 rounded-md mb-2 space-y-2">
      <div>{serverError}</div>
      {needsResend && <ResendBannerButton email={email} />}
    </div>
  );
}
