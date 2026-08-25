import React from 'react';
import { useNavigate } from 'react-router-dom';

import { Alert, AlertDescription, AlertTitle } from '@celebs/shared-ui/components/alert';
import { Button } from '@celebs/shared-ui/components/button';

import { useAuthContext } from '@/context/auth-provider';
import { PATHS } from '@/routes/paths';

export const OnboardingStatusBanner: React.FC = () => {
  const { user } = useAuthContext();
  const navigate = useNavigate();

  if (!user || user.role !== 'VENDOR' || !user.vendorProfile) {
    return null;
  }

  const { status, rejectionReason, onboardingStep } = user.vendorProfile;

  // Unverified Email Alert
  if (!user.isEmailVerified) {
    return (
      <Alert className="bg-warning/10 border-warning/30 text-warning mb-6">
        <AlertTitle className="font-bold flex items-center gap-2">
          Email Verification Required
        </AlertTitle>
        <AlertDescription className="mt-1 flex items-center justify-between gap-4">
          <span>
            Please verify your email address (<strong>{user.email}</strong>) to activate full seller
            features. Check your inbox for the activation link.
          </span>
        </AlertDescription>
      </Alert>
    );
  }

  // Incomplete Onboarding Wizard
  if (onboardingStep < 5) {
    return (
      <Alert className="bg-info/10 border-info/30 text-info mb-6">
        <AlertTitle className="font-bold flex items-center gap-2">
          Complete Your Vendor Onboarding (Step {onboardingStep} of 5)
        </AlertTitle>
        <AlertDescription className="mt-2 flex items-center justify-between gap-4">
          <span>
            Your store setup is incomplete. Complete all 5 steps to submit your documents for admin
            verification.
          </span>
          <Button size="sm" className="shrink-0" onClick={() => navigate(PATHS.VENDORS.ONBOARDING)}>
            Continue Setup →
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Application Under Review
  if (status === 'UNDER_REVIEW' || status === 'PENDING') {
    return (
      <Alert className="bg-info/10 border-info/30 text-info mb-6">
        <AlertTitle className="font-bold flex items-center gap-2">
          Application Submitted & Under Review
        </AlertTitle>
        <AlertDescription className="mt-1">
          Your shop details and uploaded documents are currently being reviewed by platform
          moderation. Product upload tools will be unlocked upon admin approval.
        </AlertDescription>
      </Alert>
    );
  }

  // Application Rejected
  if (status === 'REJECTED') {
    return (
      <Alert className="bg-destructive/10 border-destructive/30 text-destructive mb-6">
        <AlertTitle className="font-bold flex items-center gap-2">
          Application Revision Required
        </AlertTitle>
        <AlertDescription className="mt-2 flex flex-col gap-2">
          <span>Your vendor application requires updates before activation.</span>
          {rejectionReason && (
            <div className="bg-card p-3 rounded border border-destructive/30 text-destructive font-mono text-xs">
              <strong>Reason:</strong> {rejectionReason}
            </div>
          )}
          <div className="mt-1">
            <Button
              size="sm"
              variant="destructive"
              onClick={() => navigate(PATHS.VENDORS.ONBOARDING)}
            >
              Update Documents & Resubmit
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
};
