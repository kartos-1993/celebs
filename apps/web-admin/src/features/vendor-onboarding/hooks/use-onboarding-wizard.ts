import { useCallback, useMemo, useState } from 'react';

import type { WizardStepConfig } from '../types';

import { useAuthContext } from '@/context/auth-provider';

export const ONBOARDING_STEPS: WizardStepConfig[] = [
  { num: 1, label: 'Profile' },
  { num: 2, label: 'Warehouse' },
  { num: 3, label: 'Documents' },
  { num: 4, label: 'Business Info' },
  { num: 5, label: 'Submit' },
];

export function useOnboardingWizard() {
  const { user } = useAuthContext();
  const vendorStatus = user?.vendorProfile?.status;
  const rejectionReason = user?.vendorProfile?.rejectionReason;
  const initialStep = user?.vendorProfile?.onboardingStep ?? 1;

  const clampedInitialStep = useMemo(() => {
    return initialStep > 5 ? 5 : Math.max(1, initialStep);
  }, [initialStep]);

  const [step, setStep] = useState<number>(clampedInitialStep);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  const isRejectedMode = vendorStatus === 'REJECTED';
  const progressPercentage = useMemo(() => (step / 5) * 100, [step]);

  const goToStep = useCallback((targetStep: number) => {
    setStep(Math.min(5, Math.max(1, targetStep)));
  }, []);

  const nextStep = useCallback(() => {
    setStep((current) => Math.min(5, current + 1));
  }, []);

  const prevStep = useCallback(() => {
    setStep((current) => Math.max(1, current - 1));
  }, []);

  const startEditing = useCallback(() => {
    setIsEditing(true);
  }, []);

  return {
    user,
    vendorStatus,
    rejectionReason,
    initialStep,
    step,
    setStep: goToStep,
    nextStep,
    prevStep,
    isEditing,
    startEditing,
    isRejectedMode,
    progressPercentage,
    stepsList: ONBOARDING_STEPS,
  };
}
