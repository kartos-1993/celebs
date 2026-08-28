import { useMemo } from 'react';
import { Navigate } from 'react-router-dom';

import { PendingReviewScreen } from '../components/pending-review-screen';
import { RejectionScreen } from '../components/rejection-screen';
import { StepBusinessForm } from '../components/step-business-form';
import { StepDocumentsForm } from '../components/step-documents-form';
import { StepProfileForm } from '../components/step-profile-form';
import { StepReviewSubmit } from '../components/step-review-submit';
import { StepWarehouseForm } from '../components/step-warehouse-form';
import { WizardHeader } from '../components/wizard-header';
import { useOnboardingWizard } from '../hooks/use-onboarding-wizard';
import {
  getBusinessInfoDefaultValues,
  getDocumentsDefaultValues,
  getProfileDefaultValues,
  getWarehouseDefaultValues,
} from '../utils/onboarding-defaults';

export default function OnboardingWizard() {
  const {
    user,
    vendorStatus,
    rejectionReason,
    initialStep,
    step,
    setStep,
    nextStep,
    prevStep,
    isEditing,
    startEditing,
    isRejectedMode,
    progressPercentage,
    stepsList,
  } = useOnboardingWizard();

  // Compute default values using pure mappers
  const profileDefaults = useMemo(
    () => getProfileDefaultValues(user?.vendorProfile),
    [user?.vendorProfile],
  );
  const warehouseDefaults = useMemo(
    () => getWarehouseDefaultValues(user?.vendorProfile, user?.name),
    [user?.vendorProfile, user?.name],
  );
  const documentsDefaults = useMemo(
    () => getDocumentsDefaultValues(user?.vendorProfile),
    [user?.vendorProfile],
  );
  const businessDefaults = useMemo(
    () => getBusinessInfoDefaultValues(user?.vendorProfile),
    [user?.vendorProfile],
  );

  // Status-based screen routing
  if (vendorStatus === 'APPROVED') {
    return <Navigate to="/" replace />;
  }

  if (vendorStatus === 'UNDER_REVIEW') {
    return <PendingReviewScreen vendorName={user?.name} />;
  }

  if (vendorStatus === 'REJECTED' && !isEditing) {
    return <RejectionScreen rejectionReason={rejectionReason} onEdit={startEditing} />;
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <WizardHeader
        step={step}
        initialStep={initialStep}
        isRejectedMode={isRejectedMode}
        rejectionReason={rejectionReason}
        progressPercentage={progressPercentage}
        stepsList={stepsList}
        onSelectStep={setStep}
      />

      <div className="bg-card p-6 rounded-lg border shadow-sm">
        {step === 1 && <StepProfileForm initialValues={profileDefaults} onSuccess={nextStep} />}
        {step === 2 && (
          <StepWarehouseForm
            initialValues={warehouseDefaults}
            onSuccess={nextStep}
            onBack={prevStep}
          />
        )}
        {step === 3 && (
          <StepDocumentsForm
            initialValues={documentsDefaults}
            onSuccess={nextStep}
            onBack={prevStep}
          />
        )}
        {step === 4 && (
          <StepBusinessForm
            initialValues={businessDefaults}
            onSuccess={nextStep}
            onBack={prevStep}
          />
        )}
        {step === 5 && (
          <StepReviewSubmit
            userProfile={user?.vendorProfile}
            isRejectedMode={isRejectedMode}
            onBack={prevStep}
          />
        )}
      </div>
    </div>
  );
}
