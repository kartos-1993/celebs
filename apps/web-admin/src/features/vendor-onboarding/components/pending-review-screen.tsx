import { CheckCircle2, Clock, Mail } from 'lucide-react';

interface PendingReviewScreenProps {
  vendorName?: string;
}

export const PendingReviewScreen = ({ vendorName }: PendingReviewScreenProps) => {
  return (
    <div className="flex flex-col items-center text-center gap-6 py-8">
      {/* Animated success icon */}
      <div className="relative">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-primary" />
        </div>
        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-warning flex items-center justify-center">
          <Clock className="w-3.5 h-3.5 text-warning-foreground" />
        </div>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Application Submitted!
        </h1>
        {vendorName && (
          <p className="text-muted-foreground text-sm">
            Hi {vendorName}, your seller application is now under review.
          </p>
        )}
      </div>

      {/* Status timeline */}
      <div className="w-full max-w-sm border rounded-lg p-4 text-left space-y-4 bg-card">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Review Progress
        </h3>

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">Documents submitted</p>
              <p className="text-xs text-muted-foreground">Your application has been received</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full border-2 border-primary/50 flex items-center justify-center shrink-0 mt-0.5">
              <div className="w-2 h-2 rounded-full bg-primary/50 animate-pulse" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Admin review</p>
              <p className="text-xs text-muted-foreground">Typically 1–2 business days</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full border-2 border-muted flex items-center justify-center shrink-0 mt-0.5">
              <div className="w-2 h-2 rounded-full bg-muted" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Account activated</p>
              <p className="text-xs text-muted-foreground">You'll get email confirmation</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Mail className="w-4 h-4" />
        <span>We'll email you once the review is complete.</span>
      </div>
    </div>
  );
};
