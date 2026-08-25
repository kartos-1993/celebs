import React from 'react';
import { Edit3, XCircle } from 'lucide-react';

import { Button } from '@celebs/shared-ui/components/button';

interface RejectionScreenProps {
  rejectionReason?: string;
  onEdit: () => void;
}

export const RejectionScreen: React.FC<RejectionScreenProps> = ({ rejectionReason, onEdit }) => {
  return (
    <div className="flex flex-col items-center text-center gap-6 py-8 max-w-md mx-auto">
      {/* Rejection icon */}
      <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
        <XCircle className="w-10 h-10 text-destructive" />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Application Revision Required
        </h1>
        <p className="text-muted-foreground text-sm">
          Your seller application was reviewed by platform moderation and requires updates before
          account activation. Please review the feedback below and update your details.
        </p>
      </div>

      {/* Rejection reason */}
      {rejectionReason && (
        <div className="w-full border border-destructive/30 rounded-lg p-4 text-left bg-destructive/5 space-y-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-destructive">
            Moderation Feedback
          </h3>
          <p className="text-sm font-medium text-foreground">{rejectionReason}</p>
        </div>
      )}

      <div className="w-full border rounded-lg p-4 text-left bg-card space-y-2 text-sm">
        <h3 className="font-semibold text-foreground">What to do next:</h3>
        <ol className="text-muted-foreground space-y-1 list-decimal list-inside text-xs">
          <li>
            Click <strong>"Edit Application"</strong> below to open the setup wizard
          </li>
          <li>Navigate directly to the step that needs updates using the step bar</li>
          <li>Correct your information or upload new documents</li>
          <li>
            Review and click <strong>"Resubmit Application"</strong> on Step 5
          </li>
        </ol>
      </div>

      <Button onClick={onEdit} size="lg" className="w-full font-semibold gap-2">
        <Edit3 className="w-4 h-4" />
        Edit Application
      </Button>
    </div>
  );
};
