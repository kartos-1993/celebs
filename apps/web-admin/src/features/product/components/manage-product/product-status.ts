export const statusBadgeVariant = (
  status: string,
): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (status === 'published') return 'default';
  if (status === 'pending_review') return 'secondary';
  if (status === 'rejected') return 'destructive';
  return 'outline';
};

export const statusLabels: Record<string, string> = {
  draft: 'Draft',
  pending_review: 'Pending Review',
  published: 'Published',
  rejected: 'Rejected',
  deactivated: 'Deactivated',
};
