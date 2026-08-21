import { Badge } from '@celebs/shared-ui/components/badge';

type VendorStatus = string;

const STATUS_STYLES: Record<string, string> = {
  APPROVED: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  UNDER_REVIEW: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
  SUBMITTED: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
  PENDING: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
  REJECTED: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30',
};

const FALLBACK_STYLE = 'bg-muted text-muted-foreground border-border';

export function VendorStatusBadge({ status }: { status: VendorStatus }) {
  return (
    <Badge className={`font-semibold ${STATUS_STYLES[status] ?? FALLBACK_STYLE}`}>{status}</Badge>
  );
}
