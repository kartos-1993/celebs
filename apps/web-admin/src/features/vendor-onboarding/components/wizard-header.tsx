import { AlertTriangle, CheckCircle2 } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@celebs/shared-ui/components/alert';
import { Button } from '@celebs/shared-ui/components/button';

import type { WizardStepConfig } from '../types';

interface WizardHeaderProps {
  step: number;
  initialStep: number;
  isRejectedMode: boolean;
  rejectionReason?: string | null;
  progressPercentage: number;
  stepsList: WizardStepConfig[];
  onSelectStep: (num: number) => void;
}

export function WizardHeader({
  step,
  initialStep,
  isRejectedMode,
  rejectionReason,
  progressPercentage,
  stepsList,
  onSelectStep,
}: WizardHeaderProps) {
  const currentStepLabel = stepsList.find((s) => s.num === step)?.label;

  return (
    <div className="space-y-4">
      {/* Sticky Rejection Reason Banner when editing a rejected application */}
      {isRejectedMode && (
        <Alert className="bg-destructive/10 border-destructive/40 text-destructive mb-4">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div className="ml-2">
            <AlertTitle className="font-bold text-sm">
              Moderation Feedback — Revision Required
            </AlertTitle>
            <AlertDescription className="text-xs text-foreground mt-1">
              {rejectionReason ||
                'Please review your application steps below and correct any flagged details.'}
            </AlertDescription>
          </div>
        </Alert>
      )}

      {/* Progress & Step Navigation Header */}
      <div className="bg-card p-4 rounded-lg border shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Seller Setup Wizard
              {isRejectedMode && (
                <span className="ml-2 text-xs bg-warning/10 text-warning font-semibold px-2 py-0.5 rounded border border-warning/30">
                  Editing Revision
                </span>
              )}
            </h2>
            <p className="text-xs text-muted-foreground">
              Step {step} of 5 — {currentStepLabel}
            </p>
          </div>
          <span className="text-sm font-bold text-primary">{Math.round(progressPercentage)}%</span>
        </div>

        {/* Step Indicator Tabs */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t sm:grid-cols-3 md:grid-cols-5">
          {stepsList.map((s) => {
            const isCurrent = step === s.num;
            const isCompleted = s.num < initialStep || isRejectedMode;
            const canClick = isCompleted || isCurrent || isRejectedMode;

            return (
              <Button
                key={s.num}
                type="button"
                variant="ghost"
                onClick={() => canClick && onSelectStep(s.num)}
                disabled={!canClick}
                className={`w-full h-auto flex-col p-2 rounded-md text-xs font-medium ${
                  isCurrent
                    ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                    : canClick
                      ? 'bg-muted/50 hover:bg-muted text-foreground cursor-pointer'
                      : 'bg-muted/20 text-muted-foreground cursor-not-allowed opacity-50'
                }`}
              >
                <div className="flex items-center gap-1">
                  {s.num < step ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                  ) : (
                    <span>{s.num}.</span>
                  )}
                  <span className="truncate">{s.label}</span>
                </div>
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
