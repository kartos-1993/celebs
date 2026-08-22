import { Badge, type BadgeProps } from '@celebs/shared-ui/components/badge';

type VendorStatus = string;

type BadgeVariant = NonNullable<BadgeProps['variant']>;

const STATUS_VARIANTS: Record<string, BadgeVariant> = {
  APPROVED: 'success',
  ACTIVE: 'success',
  PENDING: 'warning',
  UNDER_REVIEW: 'warning',
  SUBMITTED: 'warning',
  REJECTED: 'destructive',
  SUSPENDED: 'destructive',
};

export function VendorStatusBadge({ status }: { status: VendorStatus }) {
  return <Badge variant={STATUS_VARIANTS[status] ?? 'secondary'}>{status}</Badge>;
}
