import { AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';

import { Badge } from '@celebs/shared-ui/components/badge';

export function QualityBadge({ score }: { score?: number }) {
  const value = score ?? 0;
  if (value >= 85) {
    return (
      <Badge variant="success" className="gap-1 font-semibold">
        <Sparkles className="w-3 h-3" /> QC {value}% High
      </Badge>
    );
  }
  if (value >= 70) {
    return (
      <Badge variant="info" className="gap-1 font-semibold">
        <CheckCircle2 className="w-3 h-3" /> QC {value}% Good
      </Badge>
    );
  }
  return (
    <Badge variant="warning" className="gap-1 font-semibold">
      <AlertCircle className="w-3 h-3" /> QC {value}% Action Needed
    </Badge>
  );
}
