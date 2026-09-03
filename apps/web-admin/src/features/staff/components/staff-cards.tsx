import { MailWarning } from 'lucide-react';

import type { UserData } from '@celebs/shared-types';
import { Badge } from '@celebs/shared-ui/components/badge';
import { Button } from '@celebs/shared-ui/components/button';
import { Card } from '@celebs/shared-ui/components/card';
import { EmptyState } from '@celebs/shared-ui/components/empty-state';

interface StaffCardsProps {
  staff: UserData[];
  isAdminOrSuperAdmin: boolean;
  onEdit: (member: UserData) => void;
  onDelete: (member: UserData) => void;
  isDeletePending: boolean;
  renderResendInvite: (email: string) => React.ReactNode;
}

/** Mobile staff list — cards below md, paired with StaffTable. */
export function StaffCards({
  staff,
  isAdminOrSuperAdmin,
  onEdit,
  onDelete,
  isDeletePending,
  renderResendInvite,
}: StaffCardsProps) {
  if (staff.length === 0) {
    return (
      <div className="md:hidden">
        <EmptyState
          title="No staff sub-accounts found."
          description={'Click "Add Sub-Account" to delegate employee access.'}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3 md:hidden">
      {staff.map((member) => (
        <Card key={member.id} className="space-y-3 p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-foreground">
                {member.name}
              </div>
              <div className="truncate font-mono text-xs text-muted-foreground">
                {member.email}
              </div>
              {isAdminOrSuperAdmin && (
                <div className="mt-0.5 truncate text-xs text-muted-foreground">
                  {member.vendorProfile?.shopName || 'Vendor Shop'}
                </div>
              )}
            </div>
            {!member.isEmailVerified && (
              <Badge variant="warning" className="shrink-0">
                <MailWarning aria-hidden="true" className="mr-1 inline h-3 w-3" />
                Unverified
              </Badge>
            )}
          </div>

          {!member.isEmailVerified && (
            <div className="flex">{renderResendInvite(member.email)}</div>
          )}

          <div className="flex flex-wrap gap-1">
            {Array.isArray(member.permissions) && member.permissions.length > 0 ? (
              member.permissions
                .slice(0, 4)
                .map((perm: string) => (
                  <Badge key={perm} variant="outline" className="px-1.5 py-0 font-mono">
                    {perm}
                  </Badge>
                ))
            ) : (
              <Badge variant="secondary">Staff Sub-User</Badge>
            )}
            {Array.isArray(member.permissions) && member.permissions.length > 4 && (
              <Badge variant="secondary" className="px-1 py-0 font-mono">
                +{member.permissions.length - 4} more
              </Badge>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="h-10 flex-1" onClick={() => onEdit(member)}>
              Edit
            </Button>
            <Button
              variant="destructive"
              className="h-10 flex-1"
              onClick={() => onDelete(member)}
              disabled={isDeletePending}
            >
              Delete
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
