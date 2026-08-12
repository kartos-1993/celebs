import React from 'react';
import { useAuthContext } from '@/context/auth-provider';
import { Alert, AlertTitle, AlertDescription } from '@celebs/shared-ui/components/alert';
import { Button } from '@celebs/shared-ui/components/button';
import { useNavigate } from 'react-router-dom';
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
      <Alert className="bg-amber-50 border-amber-300 text-amber-900 mb-6">
        <AlertTitle className="font-bold flex items-center gap-2">
          Email Verification Required
        </AlertTitle>
        <AlertDescription className="mt-1 flex items-center justify-between gap-4">
          <span>
            Please verify your email address (<strong>{user.email}</strong>) to activate full seller features. Check your inbox for the activation link.
          </span>
        </AlertDescription>
      </Alert>
    );
  }

  // Incomplete Onboarding Wizard
  if (onboardingStep < 5) {
    return (
      <Alert className="bg-blue-50 border-blue-300 text-blue-900 mb-6">
        <AlertTitle className="font-bold flex items-center gap-2">
          Complete Your Vendor Onboarding (Step {onboardingStep} of 5)
        </AlertTitle>
        <AlertDescription className="mt-2 flex items-center justify-between gap-4">
          <span>
            Your store setup is incomplete. Complete all 5 steps to submit your documents for admin verification.
          </span>
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium shrink-0"
            onClick={() => navigate(PATHS.VENDORS.ONBOARDING)}
          >
            Continue Setup →
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Application Under Review
  if (status === 'UNDER_REVIEW' || status === 'SUBMITTED' || status === 'PENDING') {
    return (
      <Alert className="bg-indigo-50 border-indigo-300 text-indigo-900 mb-6">
        <AlertTitle className="font-bold flex items-center gap-2">
          Application Submitted & Under Review
        </AlertTitle>
        <AlertDescription className="mt-1">
          Your shop details and uploaded documents are currently being reviewed by platform moderation. Product upload tools will be unlocked upon admin approval.
        </AlertDescription>
      </Alert>
    );
  }

  // Application Rejected
  if (status === 'REJECTED') {
    return (
      <Alert className="bg-red-50 border-red-300 text-red-900 mb-6">
        <AlertTitle className="font-bold flex items-center gap-2">
          Application Revision Required
        </AlertTitle>
        <AlertDescription className="mt-2 flex flex-col gap-2">
          <span>
            Your vendor application requires updates before activation.
          </span>
          {rejectionReason && (
            <div className="bg-white p-3 rounded border border-red-200 text-red-800 font-mono text-xs">
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
