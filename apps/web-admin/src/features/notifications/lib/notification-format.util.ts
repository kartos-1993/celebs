import { formatDistanceToNowStrict } from 'date-fns';

import type { NotificationSeverity } from '../types';

export function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    return formatDistanceToNowStrict(date, { addSuffix: true });
  } catch {
    return 'recently';
  }
}

export function getSeverityBadgeStyles(severity: NotificationSeverity): {
  dotColor: string;
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline';
} {
  switch (severity) {
    case 'CRITICAL':
      return {
        dotColor: 'bg-destructive animate-pulse',
        badgeVariant: 'destructive',
      };
    case 'WARNING':
      return {
        dotColor: 'bg-amber-500',
        badgeVariant: 'secondary',
      };
    case 'INFO':
    default:
      return {
        dotColor: 'bg-primary',
        badgeVariant: 'outline',
      };
  }
}
